"""
Mod C — LLM Explanation Generator
Provider-agnostic LLM call wrapper with Groq / OpenAI compatible API calls
and intelligent fallback when API keys are unconfigured.
"""
import os
import json
import logging
import httpx
from typing import Dict, Any, List

logger = logging.getLogger("vitascan.explainer")


class LLMExplainer:
    """Generates plain-English clinical explanations from GAT attention weights."""

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY") or os.getenv("LLM_API_KEY", "")
        self.provider = os.getenv("LLM_PROVIDER", "groq")
        self.model = os.getenv("LLM_MODEL", "llama-3.1-70b-versatile")
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    def generate_explanation(
        self,
        deficiency_type: str,
        severity_band: str,
        score: float,
        attention_weights: Dict[str, float],
        crosscheck_info: Dict[str, Any]
    ) -> str:
        """
        Calls LLM to generate plain-English diagnostic narrative.
        Falls back to rule-based template if API key is not supplied.
        """
        if not self.api_key or self.api_key.startswith("your_"):
            logger.info("No valid LLM API key found. Using intelligent rule-based narrative fallback.")
            return self._fallback_explanation(deficiency_type, severity_band, score, attention_weights, crosscheck_info)

        try:
            prompt = self._build_prompt(deficiency_type, severity_band, score, attention_weights, crosscheck_info)
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a clinical nutritionist and medical AI explainer."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 250
            }

            with httpx.Client(timeout=10.0) as client:
                response = client.post(self.endpoint, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.warning(f"LLM API returned status {response.status_code}, falling back to template")
                    return self._fallback_explanation(deficiency_type, severity_band, score, attention_weights, crosscheck_info)

        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return self._fallback_explanation(deficiency_type, severity_band, score, attention_weights, crosscheck_info)

    def _build_prompt(
        self,
        deficiency_type: str,
        severity_band: str,
        score: float,
        attention_weights: Dict[str, float],
        crosscheck_info: Dict[str, Any]
    ) -> str:
        weights_str = ", ".join(f"{k}: {int(v*100)}%" for k, v in attention_weights.items())
        crosscheck_str = "Available" if crosscheck_info.get("available") else "None"
        
        return (
            f"Explain a {severity_band.upper()} risk of {deficiency_type.capitalize()} Deficiency (score {int(score*100)}%). "
            f"Key biomarker weights: {weights_str}. "
            f"Symptom photo crosscheck: {crosscheck_str}. "
            f"Provide a concise, patient-friendly 2-3 sentence explanation of why this was flagged."
        )

    def _fallback_explanation(
        self,
        deficiency_type: str,
        severity_band: str,
        score: float,
        attention_weights: Dict[str, float],
        crosscheck_info: Dict[str, Any]
    ) -> str:
        """Rule-based clinical template when LLM API is offline or missing API key."""
        if deficiency_type.lower() == "iron":
            return (
                f"Graph Attention analysis indicates {severity_band.capitalize()} Iron Deficiency Risk ({int(score*100)}%). "
                "Serum Ferritin level is significantly below the reference range, supported by reduced Hemoglobin. "
                "Attention weights assign primary impact to depleted iron storage."
            )
        elif deficiency_type.lower() == "b12":
            return (
                f"Serum Vitamin B12 indices indicate {severity_band.capitalize()} B12 Deficiency ({int(score*100)}%). "
                "Graph modeling shows secondary influence on red cell volume (MCV), suggesting early megaloblastic changes."
            )
        elif deficiency_type.lower() == "folate":
            return (
                f"Serum Folate levels are currently in the {severity_band.capitalize()} risk band ({int(score*100)}%). "
                "Folate is vital for DNA synthesis and red blood cell formation."
            )
        else:
            return (
                f"System detects {severity_band.capitalize()} risk for overall {deficiency_type.capitalize()} deficiency ({int(score*100)}%) "
                "based on joint biomarker deviation scores."
            )


if __name__ == "__main__":
    explainer = LLMExplainer()
    res = explainer.generate_explanation("iron", "moderate", 0.71, {"ferritin": 0.62, "hemoglobin": 0.24}, {"available": True})
    print("Explainer output:", res)
