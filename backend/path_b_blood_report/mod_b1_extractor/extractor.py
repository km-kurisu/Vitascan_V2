"""
Mod B1 — Blood Report Text Extractor
Extracts raw text from digital/scanned blood report PDFs or images using PyMuPDF and Tesseract OCR fallback.
"""
import os
import logging
from typing import Dict, Any

logger = logging.getLogger("vitascan.extractor")


class BloodReportExtractor:
    """Extracts raw text content from uploaded blood report files."""

    def __init__(self):
        # Optional Tesseract initialization
        self.tesseract_cmd = os.getenv("TESSERACT_CMD", "tesseract")

    def extract_from_bytes(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract text from file bytes (PDF or Image).
        Returns dictionary containing raw text and metadata.
        """
        ext = os.path.splitext(filename)[1].lower()
        extracted_text = ""
        method_used = "unknown"

        if ext == ".pdf":
            extracted_text, method_used = self._extract_pdf(file_bytes)
        elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
            extracted_text, method_used = self._extract_image_ocr(file_bytes)
        else:
            # Fallback text decoder
            try:
                extracted_text = file_bytes.decode("utf-8", errors="ignore")
                method_used = "utf-8 plain text"
            except Exception as e:
                logger.error(f"Failed plain text decoding: {e}")
                extracted_text = ""

        # Check if text is sparse (indicative of scanned PDF requiring OCR)
        if ext == ".pdf" and len(extracted_text.strip()) < 50:
            logger.info("PDF text sparse. Triggering Tesseract OCR fallback.")
            ocr_text, ocr_method = self._extract_pdf_ocr_fallback(file_bytes)
            if len(ocr_text) > len(extracted_text):
                extracted_text = ocr_text
                method_used = f"PyMuPDF + {ocr_method}"

        return {
            "filename": filename,
            "raw_text": extracted_text,
            "extraction_method": method_used,
            "char_count": len(extracted_text)
        }

    def _extract_pdf(self, pdf_bytes: bytes) -> tuple[str, str]:
        """Extract text using PyMuPDF (fitz)."""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_blocks = []
            for page in doc:
                text_blocks.append(page.get_text())
            full_text = "\n".join(text_blocks)
            return full_text, "PyMuPDF text extraction"
        except ImportError:
            logger.warning("PyMuPDF not installed, falling back to simple byte scan")
            return self._simple_pdf_text_fallback(pdf_bytes), "Simple byte scan fallback"
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed: {e}")
            return "", "Failed PyMuPDF"

    def _simple_pdf_text_fallback(self, pdf_bytes: bytes) -> str:
        """Fallback ASCII search if PyMuPDF is missing."""
        import re
        content = pdf_bytes.decode("latin-1", errors="ignore")
        matches = re.findall(r"\(([\w\s.,%/-]+)\)", content)
        return "\n".join(matches)

    def _extract_image_ocr(self, image_bytes: bytes) -> tuple[str, str]:
        """Extract text from image bytes using pytesseract."""
        try:
            import pytesseract
            from PIL import Image
            import io

            image = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(image)
            return text, "Tesseract OCR"
        except ImportError:
            logger.warning("pytesseract or Pillow not available.")
            return "# TODO: Tesseract OCR fallback binary requirement", "OCR Stub"
        except Exception as e:
            logger.error(f"Tesseract OCR failed: {e}")
            return f"# OCR Extraction error: {str(e)}", "Failed Tesseract"

    def _extract_pdf_ocr_fallback(self, pdf_bytes: bytes) -> tuple[str, str]:
        """Renders PDF pages to images and runs Tesseract OCR."""
        try:
            import fitz
            import pytesseract
            from PIL import Image
            import io

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            ocr_pages = []
            for page in doc:
                pix = page.get_pixmap()
                img = Image.open(io.BytesIO(pix.tobytes()))
                ocr_pages.append(pytesseract.image_to_string(img))
            return "\n".join(ocr_pages), "Tesseract PDF OCR"
        except Exception as e:
            logger.warning(f"PDF OCR Fallback skipped: {e}")
            return "", "OCR Fallback Unavailable"


if __name__ == "__main__":
    extractor = BloodReportExtractor()
    sample_text = (
        "HEMOGRAM REPORT\n"
        "Serum Ferritin: 11.2 ng/mL (Reference: 13 - 150)\n"
        "Hemoglobin: 10.4 g/dL (Reference: 12.0 - 15.5)\n"
        "Vitamin B12: 210 pg/mL (Reference: 200 - 900)\n"
        "Folate: 4.8 ng/mL (Reference: 4.6 - 18.7)\n"
    )
    result = extractor.extract_from_bytes(sample_text.encode("utf-8"), "sample_report.txt")
    print("Extractor output:", result)
