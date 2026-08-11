"""
Mod A2 — Symptom Image CNN Classifier Model Stub
# TODO: replace with trained PyTorch CNN model (e.g. ResNet50 / EfficientNet) weights.
"""
from typing import Dict, Any


class SymptomCNNClassifier:
    """
    CNN classifier stub predicting physical symptom manifestations
    (conjunctival pallor, koilonychia/nail spooning, glossitis/smooth tongue).
    """

    def __init__(self, model_path: str = None):
        self.is_trained = False
        self.model_path = model_path

    def predict(self, preprocessed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs inference over preprocessed image data.
        """
        filename = preprocessed_data.get("filename", "").lower()
        
        # Determine source based on filename hints or default to eyes
        source = "eyes"
        if "nail" in filename:
            source = "nails"
        elif "tongue" in filename:
            source = "tongue"
        elif "skin" in filename:
            source = "skin"
        elif "hair" in filename:
            source = "hair"

        # TODO: replace with model.eval() and forward pass
        return {
            "predicted_label": "pallor_detected",
            "source_region": source,
            "confidence": 0.85,
            "class_probabilities": {
                "normal": 0.15,
                "pallor": 0.85
            }
        }
