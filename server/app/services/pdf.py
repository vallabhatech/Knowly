from pathlib import Path

from pypdf import PdfReader

from app.services import gemini


async def extract_text(pdf_path: Path) -> str:
    """Extract text via pypdf; fall back to PyMuPDF render-then-OCR if empty."""
    text = _extract_with_pypdf(pdf_path)
    if len(text.strip()) >= 200:
        return text

    pages = await render_pages(pdf_path)
    ocr_text = await gemini.vision_ocr(pages)
    return ocr_text.strip() or text


async def render_pages(pdf_path: Path) -> list[bytes]:
    """Render each page to PNG bytes using PyMuPDF."""
    import fitz

    pages: list[bytes] = []
    with fitz.open(pdf_path) as doc:
        for page in doc:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            pages.append(pixmap.tobytes("png"))
    return pages


def _extract_with_pypdf(pdf_path: Path) -> str:
    try:
        reader = PdfReader(str(pdf_path))
    except Exception:
        return ""

    chunks: list[str] = []
    for page in reader.pages:
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""
        if page_text:
            chunks.append(page_text)
    return "\n\n".join(chunks).strip()
