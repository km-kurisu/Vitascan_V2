"""
VitaScan Shared Storage Utility Module
Handles saving extracted OCR report JSON payloads and patient BioBERT biomarker files
to designated shared folders with structured logging.
"""
import os
import json
import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("vitascan.storage")

# Shared storage directory paths relative to this file
SHARED_DIR = os.path.dirname(os.path.abspath(__file__))
EXTRACTIONS_DIR = os.path.join(SHARED_DIR, "extractions")
PATIENT_BIOMARKERS_DIR = os.path.join(SHARED_DIR, "patient_biomarkers")


def _ensure_directory(path: str) -> None:
    """Ensures target directory exists."""
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
        logger.info(f"Created storage directory: {path}")


def save_extracted_json(extracted_data: Dict[str, Any], patient_id: str = "PAT-UNKNOWN") -> str:
    """
    Saves extracted raw text content and metadata into a JSON file in backend/shared/extractions/.
    Returns absolute file path of saved JSON file.
    """
    _ensure_directory(EXTRACTIONS_DIR)
    
    timestamp = int(time.time())
    iso_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    payload = {
        "patient_id": patient_id,
        "age": extracted_data.get("age") or extracted_data.get("patient_details", {}).get("age"),
        "gender": extracted_data.get("gender") or extracted_data.get("patient_details", {}).get("gender"),
        "patient_details": extracted_data.get("patient_details", {}),
        "labs": extracted_data.get("labs", {}),
        "biomarkers": extracted_data.get("biomarkers", {}),
        "parse_confidence": extracted_data.get("parse_confidence", 1.0),
        "source_mix": extracted_data.get("source_mix", "regex_only"),
        "filename": extracted_data.get("filename", "unknown_report.pdf"),
        "timestamp": iso_timestamp,
        "unix_timestamp": timestamp,
        "extraction_method": extracted_data.get("extraction_method", "unknown"),
        "char_count": extracted_data.get("char_count", 0),
        "raw_text": extracted_data.get("raw_text", ""),
        "metadata": extracted_data.get("metadata", {})
    }

    sanitized_patient_id = "".join(c for c in patient_id if c.isalnum() or c in ("-", "_"))
    filename = f"extraction_{sanitized_patient_id}_{timestamp}.json"
    filepath = os.path.join(EXTRACTIONS_DIR, filename)

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        
        # Save a 'latest' pointer file for quick reference
        latest_filepath = os.path.join(EXTRACTIONS_DIR, f"extraction_{sanitized_patient_id}_latest.json")
        with open(latest_filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        file_size_bytes = os.path.getsize(filepath)
        logger.info(
            f"Successfully saved extracted OCR contents to JSON in shared folder. "
            f"Patient ID: {patient_id} | Path: {filepath} | Size: {file_size_bytes} bytes | "
            f"Chars: {payload['char_count']} | Method: {payload['extraction_method']}"
        )
        return filepath
    except Exception as e:
        logger.error(f"Failed to save extracted JSON for patient {patient_id}: {e}", exc_info=True)
        raise e


def save_patient_biomarkers_json(biomarkers_data: Dict[str, Any], patient_id: str) -> str:
    """
    Saves BioBERT-extracted biomarkers for a specific patient in backend/shared/patient_biomarkers/.
    Returns absolute file path of saved patient biomarker JSON file.
    """
    _ensure_directory(PATIENT_BIOMARKERS_DIR)

    timestamp = int(time.time())
    iso_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    payload = {
        "patient_id": patient_id,
        "age": biomarkers_data.get("age") or biomarkers_data.get("patient_details", {}).get("age"),
        "gender": biomarkers_data.get("gender") or biomarkers_data.get("patient_details", {}).get("gender"),
        "patient_details": biomarkers_data.get("patient_details", {}),
        "timestamp": iso_timestamp,
        "unix_timestamp": timestamp,
        "model": biomarkers_data.get("model", "biobert-v1.1"),
        "labs": biomarkers_data.get("labs", {}),
        "biomarkers_count": len(biomarkers_data.get("biomarkers", {})),
        "biomarkers": biomarkers_data.get("biomarkers", {}),
        "confidence_summary": biomarkers_data.get("confidence_summary", 0.0),
        "parse_confidence": biomarkers_data.get("parse_confidence", 1.0),
        "source_mix": biomarkers_data.get("source_mix", "regex_only")
    }

    sanitized_patient_id = "".join(c for c in patient_id if c.isalnum() or c in ("-", "_"))
    
    # Save primary per-patient biomarker JSON file (overwrites with latest full state)
    patient_filepath = os.path.join(PATIENT_BIOMARKERS_DIR, f"biomarkers_{sanitized_patient_id}.json")
    # Save timestamped history file
    history_filepath = os.path.join(PATIENT_BIOMARKERS_DIR, f"biomarkers_{sanitized_patient_id}_{timestamp}.json")

    try:
        with open(patient_filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        with open(history_filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        file_size_bytes = os.path.getsize(patient_filepath)
        logger.info(
            f"Successfully saved BioBERT patient biomarkers to JSON in shared folder. "
            f"Patient ID: {patient_id} | Path: {patient_filepath} | Size: {file_size_bytes} bytes | "
            f"Biomarkers Count: {payload['biomarkers_count']}"
        )
        return patient_filepath
    except Exception as e:
        logger.error(f"Failed to save patient biomarkers JSON for patient {patient_id}: {e}", exc_info=True)
        raise e
