"""
VitaScan Orchestrator — FastAPI Application (Port 8000)
Coordinates Path B (Blood Report Pipeline) and optional Path A (Symptom Photo Pipeline)
into Mod C (Explainer + Formatter), and serves endpoints for the Next.js frontend.
"""
import os
import sys
import uvicorn
import logging
from typing import Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

# Ensure workspace root is in sys.path so 'backend.*' imports resolve regardless of cwd
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time
from dotenv import load_dotenv

# Load environment variables from .env.local / .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from backend.shared.schemas import ModCFrontendOutput
from backend.shared.mock_data import generate_mock_frontend_output
from backend.shared.supabase_client import save_patient_record, save_scan_result
from backend.path_b_blood_report.mod_b1_extractor.extractor import BloodReportExtractor
from backend.path_b_blood_report.mod_b2_normalizer.normalizer import BiomarkerNormalizer
from backend.path_b_blood_report.mod_b3_grader.grader import PathBGrader
from backend.path_a_symptom_image.mod_a1_preprocess.preprocess import ImagePreprocessor
from backend.path_a_symptom_image.mod_a2_cnn.cnn_model import SymptomCNNClassifier
from backend.path_a_symptom_image.mod_a3_crosscheck.crosscheck import PathACrosscheckSignal
from backend.mod_c_explainer.formatter import ModCFormatter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vitascan.orchestrator")

app = FastAPI(
    title="VitaScan API",
    description="Multi-modal Nutritional Deficiency Severity Grading Orchestrator API",
    version="1.0.0"
)

# Allow Cross-Origin Resource Sharing for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pipeline Module Instances
extractor = BloodReportExtractor()
normalizer = BiomarkerNormalizer()
b3_grader = PathBGrader()

preprocessor = ImagePreprocessor()
cnn_classifier = SymptomCNNClassifier()
a3_crosscheck = PathACrosscheckSignal()

mod_c_formatter = ModCFormatter()

# In-memory session state store
pipeline_state: Dict[str, Any] = {
    "status": "idle",
    "patient_id": "PAT-2026-8841",
    "modules": {
        "mod_b1_extractor": {"status": "pending", "progress": 0},
        "mod_b2_normalizer": {"status": "pending", "progress": 0},
        "mod_b3_grader": {"status": "pending", "progress": 0},
        "mod_a1_preprocess": {"status": "pending", "progress": 0},
        "mod_a2_cnn": {"status": "pending", "progress": 0},
        "mod_a3_crosscheck": {"status": "pending", "progress": 0},
        "mod_c_explainer": {"status": "pending", "progress": 0}
    },
    "latest_result": None
}


@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "VitaScan Orchestrator",
        "version": "1.0.0"
    }


@app.get("/status")
def get_pipeline_status():
    """Returns per-module status and progress across Path A and Path B."""
    return pipeline_state


@app.post("/upload-report")
async def upload_blood_report(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form("PAT-2026-8841")
):
    """
    Primary input endpoint. Accepts blood report PDF or image.
    Executes Path B pipeline and triggers Mod C formatting.
    """
    try:
        pipeline_state["status"] = "processing"
        pipeline_state["patient_id"] = patient_id
        
        # Reset module statuses
        for m in pipeline_state["modules"]:
            pipeline_state["modules"][m] = {"status": "processing", "progress": 10}

        content = await file.read()
        filename = file.filename or "uploaded_report.pdf"

        # Mod B1: Extraction
        pipeline_state["modules"]["mod_b1_extractor"] = {"status": "completed", "progress": 100}
        extracted_data = extractor.extract_from_bytes(content, filename)
        raw_text = extracted_data.get("raw_text", "")

        # Mod B2: Normalization
        pipeline_state["modules"]["mod_b2_normalizer"] = {"status": "completed", "progress": 100}
        normalized_data = normalizer.normalize_text(raw_text)

        # Mod B3: Severity Grading
        pipeline_state["modules"]["mod_b3_grader"] = {"status": "completed", "progress": 100}
        mod_b3_output = b3_grader.grade_blood_report(normalized_data, patient_id=patient_id)

        # Path A is skipped if no photo provided yet
        mod_a3_output = None

        # Mod C: Explanation & Formatting
        pipeline_state["modules"]["mod_c_explainer"] = {"status": "completed", "progress": 100}
        final_output = mod_c_formatter.format_pipeline_output(
            mod_b3_output=mod_b3_output,
            mod_a3_output=mod_a3_output
        )

        pipeline_state["status"] = "completed"
        pipeline_output_dict = final_output.model_dump()
        pipeline_state["latest_result"] = pipeline_output_dict

        # Save patient profile and scan run to Supabase
        scan_id = f"SCAN-{patient_id}-{int(time.time())}"
        save_patient_record(patient_id=patient_id)
        save_scan_result(
            scan_id=scan_id,
            patient_id=patient_id,
            mod_c_output=pipeline_output_dict,
            blood_report_url=filename,
        )

        return {
            "message": "Blood report processed successfully",
            "patient_id": patient_id,
            "scan_id": scan_id,
            "deficiencies_found": len(final_output.deficiencies)
        }

    except Exception as e:
        logger.error(f"Error processing report: {e}")
        pipeline_state["status"] = "error"
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload-symptom-photo")
async def upload_symptom_photo(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form("PAT-2026-8841")
):
    """
    Optional Path A endpoint. Accepts symptom photograph (nails, eyes, tongue, skin, hair).
    Runs CNN cross-check signal and updates Mod C result.
    """
    try:
        content = await file.read()
        filename = file.filename or "symptom.jpg"

        # Mod A1: Preprocess
        pipeline_state["modules"]["mod_a1_preprocess"] = {"status": "completed", "progress": 100}
        preprocessed = preprocessor.preprocess_image_bytes(content, filename)

        # Mod A2: CNN inference
        pipeline_state["modules"]["mod_a2_cnn"] = {"status": "completed", "progress": 100}
        cnn_result = cnn_classifier.predict(preprocessed)

        # Mod A3: Cross-check signal
        pipeline_state["modules"]["mod_a3_crosscheck"] = {"status": "completed", "progress": 100}
        mod_a3_output = a3_crosscheck.generate_signal(cnn_result, patient_id=patient_id)

        # If latest_result exists, update crosscheck info and save to Supabase
        if pipeline_state["latest_result"]:
            current_data = pipeline_state["latest_result"]
            for def_item in current_data.get("deficiencies", []):
                d_type = def_item.get("type")
                if d_type in mod_a3_output.crosscheck_signal:
                    sig = mod_a3_output.crosscheck_signal[d_type]
                    def_item["crosscheck"] = {
                        "available": True,
                        "agrees": sig.agrees_with_path_b,
                        "source": sig.source
                    }

            scan_id = f"SCAN-{patient_id}-{int(time.time())}"
            save_scan_result(
                scan_id=scan_id,
                patient_id=patient_id,
                mod_c_output=current_data,
                symptom_photo_url=filename,
            )

        return {
            "message": "Symptom photo processed and cross-checked successfully",
            "patient_id": patient_id,
            "crosscheck_signal": mod_a3_output.model_dump()
        }

    except Exception as e:
        logger.error(f"Error processing symptom photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/results")
def get_results():
    """Returns full modC_frontend_output payload. Uses mock data if pipeline has not been executed."""
    if pipeline_state["latest_result"]:
        return pipeline_state["latest_result"]
    mock = generate_mock_frontend_output()
    return mock.model_dump()


@app.get("/results/summary")
def get_results_summary():
    """Returns summary section of results."""
    res = get_results()
    return res.get("summary", {})


@app.get("/results/deficiencies")
def get_results_deficiencies():
    """Returns list of flagged deficiencies."""
    res = get_results()
    return res.get("deficiencies", [])


@app.get("/results/deficiencies/{deficiency_type}")
def get_results_deficiency_detail(deficiency_type: str):
    """Returns specific deficiency detail item."""
    res = get_results()
    defs = res.get("deficiencies", [])
    for d in defs:
        if d.get("type").lower() == deficiency_type.lower():
            return d
    raise HTTPException(status_code=404, detail=f"Deficiency type '{deficiency_type}' not found.")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("run_pipeline:app", host="0.0.0.0", port=port, reload=True)
