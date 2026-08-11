"""
Mod A1 — Symptom Image Preprocessor
Handles image loading, cropping, resizing, and torchvision transforms.
"""
import io
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger("vitascan.preprocess")


class ImagePreprocessor:
    """Preprocesses input symptom images for CNN model input."""

    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        self.target_size = target_size

    def preprocess_image_bytes(self, image_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Loads image, converts to RGB, resizes, and applies normalization transforms.
        """
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            orig_size = img.size
            img_resized = img.resize(self.target_size)

            # Try PyTorch torchvision transform if available
            tensor_shape = [3, self.target_size[0], self.target_size[1]]
            try:
                import torch
                from torchvision import transforms
                transform = transforms.Compose([
                    transforms.ToTensor(),
                    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                ])
                tensor = transform(img_resized)
                tensor_shape = list(tensor.shape)
            except ImportError:
                logger.info("Torchvision not available for image transform, using PIL placeholder shape")

            return {
                "filename": filename,
                "original_size": orig_size,
                "processed_size": self.target_size,
                "tensor_shape": tensor_shape,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            return {
                "filename": filename,
                "status": "error",
                "message": str(e)
            }


if __name__ == "__main__":
    preprocessor = ImagePreprocessor()
    print("Preprocessor initialized")
