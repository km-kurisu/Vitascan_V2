"""
Mod A3 — Crosscheck Signal Generator
Generates modA3_output JSON payload correlating CNN predictions against Path B signals.
"""
from typing import Dict, Any, Optional
from backend.shared.schemas import ModA3Output, CrosscheckDetail


class PathACrosscheckSignal:
    """Evaluates CNN outputs into standardized crosscheck signals."""

    def generate_signal(
        self,
        cnn_result: Dict[str, Any],
        patient_id: str = "PAT-2026-0001",
        path_b_severity: Optional[Dict[str, Any]] = None
    ) -> ModA3Output:
        """
        Creates ModA3Output payload matching docs/schemas/modA3_output.schema.json.
        """
        source = cnn_result.get("source_region", "eyes")
        confidence = cnn_result.get("confidence", 0.85)

        # Check agreement with Path B if available
        agrees = True
        if path_b_severity:
            anemia_band = path_b_severity.get("anemia", {}).get("band", "none")
            iron_band = path_b_severity.get("iron", {}).get("band", "none")
            agrees = anemia_band in ["mild", "moderate", "severe"] or iron_band in ["mild", "moderate", "severe"]

        crosscheck_map = {
            "anemia": CrosscheckDetail(
                confidence=confidence,
                source=source,
                agrees_with_path_b=agrees
            )
        }

        return ModA3Output(
            patient_id=patient_id,
            crosscheck_signal=crosscheck_map,
            model_confidence=confidence
        )


if __name__ == "__main__":
    crosschecker = PathACrosscheckSignal()
    result = crosschecker.generate_signal({"source_region": "eyes", "confidence": 0.85})
    print("Mod A3 output:", result.model_dump())
