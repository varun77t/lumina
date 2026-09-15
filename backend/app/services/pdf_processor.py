import uuid
from pypdf import PdfReader
from app.config import settings

# Preferred places to end a chunk, from strongest to weakest boundary
SEPARATORS = ("\n\n", "\n", ". ", " ")


def read_pdf(file_path: str) -> tuple[int, list[dict]]:
    """Return the page count and the non-empty pages as {page_number, text} dicts."""
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({
                "page_number": i + 1,
                "text": text.strip()
            })
    return len(reader.pages), pages


def extract_text_from_pdf(file_path: str) -> list[dict]:
    """Extract text from PDF, returning list of {page_number, text} dicts."""
    return read_pdf(file_path)[1]


def _split_text(text: str, chunk_size: int, chunk_overlap: int) -> list[tuple[int, int]]:
    """Split text into overlapping (start, end) spans that end on natural boundaries where possible."""
    spans = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end < len(text):
            window = text[start:end]
            for separator in SEPARATORS:
                cut = window.rfind(separator)
                if cut > chunk_size // 2:
                    end = start + cut + len(separator)
                    break
        spans.append((start, end))
        if end >= len(text):
            break

        # Overlap with the previous chunk, starting on a word boundary
        next_start = end - chunk_overlap
        space = text.find(" ", next_start, end)
        start = space + 1 if space != -1 else next_start

    return spans


def chunk_text(pages: list[dict], chunk_size: int = None, chunk_overlap: int = None) -> list[dict]:
    """Split page texts into overlapping chunks with metadata."""
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
    chunks = []
    chunk_index = 0

    for page_data in pages:
        text = page_data["text"]
        for start, end in _split_text(text, chunk_size, chunk_overlap):
            chunk_text_content = text[start:end].strip()
            if not chunk_text_content:
                continue
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "text": chunk_text_content,
                "page_number": page_data["page_number"],
                "chunk_index": chunk_index,
                "start_char": start,
                "end_char": end
            })
            chunk_index += 1

    return chunks
