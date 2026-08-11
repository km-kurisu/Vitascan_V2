"""
Mod C — Formatter & Mod C Output Server
Merges Path B (blood report GAT) and Path A (symptom image CNN) outputs,
invokes LLM explainer and FSSAI diet checker, formats output into ModCFrontendOutput.
Can run standalone on port 8080.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from backend.shared.schemas import (
    ModCFrontendOutput,
    PatientInfo,
    DeficiencyItem,
    KeyContributor,
    FrontendCrosscheck,
    DietRecommendation,
    SummaryInfo,
    ModB3Output,
    ModA3Output
)
from backend.mod_c_explainer.explainer import LLMExplainer
from backend.mod_c_explainer.fssai_check import FSSAIDietChecker


class ModCFormatter:
    """Merges pipeline results into canonical frontend output schema."""

    def __init__(self):
        self.explainer = LLMExplainer()
        self.fssai_checker = FSSAIDietChecker()

    def format_pipeline_output(
        self,
        mod_b3_output: ModB3Output,
        mod_a3_output: Optional[ModA3Output] = None,
        patient_age: int = 28,
        patient_gender: str = "Female"
    ) -> ModCFrontendOutput:
        """
        Merges Path B and optional Path A outputs into frontend JSON format.
        """
        patient_id = mod_b3_output.patient_id
        deficiencies_list: List[DeficiencyItem] = []
        flagged_count = 0
        highest_risk = "none"

        risk_hierarchy = {"none": 0, "mild": 1, "moderate": 2, "severe": 3}
        color_map = {
            "none": "#10b981",
            "mild": "#3b82f6",
            "moderate": "#f59e0b",
            "severe": "#ef4444"
        }

        # Biomarker human labels
        label_map = {
            "ferritin": "Serum Ferritin",
            "hemoglobin": "Hemoglobin",
            "tibc": "Total Iron Binding Capacity (TIBC)",
            "b12": "Serum Vitamin B12",
            "folate": "Serum Folate",
            "mcv": "Mean Corpuscular Volume (MCV)"
        }

        # Default diet recommendations per deficiency
        diet_db = {
            "iron": [
                "Increase consumption of dark leafy greens (spinach, amaranth), jaggery, and legumes.",
                "Pair iron-rich meals with Vitamin C (lemon juice, amla) to enhance non-heme iron absorption.",
                "Avoid drinking tea or coffee immediately before or after meals as tannins inhibit iron absorption."
            ],
            "b12": [
                "Include fortified dairy products, milk, paneer, and curd in daily diet.",
                "Consider consulting a physician for oral Cyanocobalamin supplementation if dietary intake is strictly plant-based."
            ],
            "folate": [
                "Consume folate-rich foods such as chickpeas, lentils, sprouts, and green vegetables.",
                "Avoid overcooking vegetables to preserve heat-sensitive Folate content."
            ],
            "anemia": [
                "Follow the Iron & Folate deficiency dietary guidance and recheck Hemoglobin in 4-6 weeks."
            ]
        }

        for def_key, sev_detail in mod_b3_output.severity.items():
            band = sev_detail.band
            if band != "none":
                flagged_count += 1
            if risk_hierarchy.get(band, 0) > risk_hierarchy.get(highest_risk, 0):
                highest_risk = band

            # Extract attention weights for this deficiency
            att_dict = mod_b3_output.attention_weights.get(def_key, {})
            contributors: List[KeyContributor] = []
            for b_key, weight in att_dict.items():
                contributors.append(KeyContributor(
                    biomarker=label_map.get(b_key, b_key.capitalize()),
                    impact_pct=round(weight * 100.0, 1),
                    direction="negative"
                ))

            # Crosscheck signal matching
            crosscheck_available = False
            crosscheck_agrees = False
            crosscheck_source = "none"

            if mod_a3_output and def_key in mod_a3_output.crosscheck_signal:
                sig = mod_a3_output.crosscheck_signal[def_key]
                crosscheck_available = True
                crosscheck_agrees = sig.agrees_with_path_b
                crosscheck_source = sig.source

            # LLM Explanation
            explanation_text = self.explainer.generate_explanation(
                deficiency_type=def_key,
                severity_band=band,
                score=sev_detail.score,
                attention_weights=att_dict,
                crosscheck_info={"available": crosscheck_available, "agrees": crosscheck_agrees}
            )

            # Diet recommendations check
            raw_diets = diet_db.get(def_key, ["Maintain a balanced nutritious diet."])
            fssai_diets = self.fssai_checker.filter_and_verify(def_key, raw_diets)
            diet_objs = [DietRecommendation(suggestion=d["suggestion"], fssai_checked=d["fssai_checked"]) for d in fssai_diets]

            score_pct_str = f"{round(sev_detail.score * 100, 1)}%"

            deficiencies_list.append(DeficiencyItem(
                type=def_key,
                severity={
                    "band": band,
                    "score_pct": score_pct_str,
                    "badge_color": color_map.get(band, "#6b7280")
                },
                explanation=explanation_text,
                key_contributors=contributors,
                crosscheck=FrontendCrosscheck(
                    available=crosscheck_available,
                    agrees=crosscheck_agrees,
                    source=crosscheck_source
                ),
                diet_recommendations=diet_objs
            ))

        return ModCFrontendOutput(
            generated_at=datetime.now(timezone.utc).isoformat(),
            schema_version="1.0",
            patient=PatientInfo(
                patient_id=patient_id,
                age=patient_age,
                gender=patient_gender
            ),
            deficiencies=deficiencies_list,
            summary=SummaryInfo(
                flagged_deficiency_count=flagged_count,
                overall_risk_band=highest_risk
            )
        )


if __name__ == "__main__":
    from backend.shared.schemas import ModB3Output, SeverityDetail
    formatter = ModCFormatter()
    mock_b3 = ModB3Output(
        patient_id="PAT-100",
        severity={"iron": SeverityDetail(score=0.71, band="moderate", model="gat")},
        attention_weights={"iron": {"ferritin": 0.62, "hemoglobin": 0.24, "tibc": 0.14}},
        baseline_comparison={"iron": {"gat": 0.71}},
        model_confidence=0.88
    )
    result = formatter.format_pipeline_output(mock_b3)
    print("Mod C Formatter output:", result.model_dump())
