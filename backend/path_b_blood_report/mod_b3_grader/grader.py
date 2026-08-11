"""
Mod B3 — Master Grader Orchestrator
Coordinates graph construction, GAT model inference, rule-based fallback,
and baseline comparison into modB3_output schema format.
"""
from typing import Dict, Any
from backend.path_b_blood_report.mod_b3_grader.graph_builder import BiomarkerGraphBuilder
from backend.path_b_blood_report.mod_b3_grader.gat_model import GATDeficiencyGraderModel
from backend.path_b_blood_report.mod_b3_grader.baseline_models import BaselineModelsEvaluator
from backend.shared.schemas import ModB3Output, SeverityDetail


class PathBGrader:
    """Master severity grader for Path B."""

    def __init__(self):
        self.graph_builder = BiomarkerGraphBuilder()
        self.gat_model = GATDeficiencyGraderModel()
        self.baselines = BaselineModelsEvaluator()

    def grade_blood_report(self, normalized_data: Dict[str, Any], patient_id: str = "PAT-2026-0001") -> ModB3Output:
        """
        Processes normalized biomarkers and outputs complete ModB3 contract payload.
        """
        graph_data = self.graph_builder.build_graph_data(normalized_data)
        gat_res = self.gat_model.predict(graph_data)
        baseline_res = self.baselines.predict_baselines(normalized_data)

        raw_scores = gat_res["severity_scores"]
        severity_map: Dict[str, SeverityDetail] = {}

        for def_key, score in raw_scores.items():
            band = self._score_to_band(score)
            severity_map[def_key] = SeverityDetail(
                score=float(score),
                band=band,
                model="gat"
            )

        return ModB3Output(
            patient_id=patient_id,
            severity=severity_map,
            attention_weights=gat_res["attention_weights"],
            baseline_comparison=baseline_res,
            model_confidence=gat_res["model_confidence"]
        )

    def _score_to_band(self, score: float) -> str:
        if score >= 0.70:
            return "severe"
        elif score >= 0.50:
            return "moderate"
        elif score >= 0.25:
            return "mild"
        else:
            return "none"


if __name__ == "__main__":
    grader = PathBGrader()
    mock_normalized = {
        "biomarkers": {
            "ferritin": {"value": 11.2, "deviation": -0.138, "is_abnormal": True},
            "hemoglobin": {"value": 10.4, "deviation": -0.133, "is_abnormal": True}
        }
    }
    output = grader.grade_blood_report(mock_normalized)
    print("Mod B3 Grader output:", output.model_dump())
