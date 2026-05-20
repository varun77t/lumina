import os
import json
import uuid
from PyPDF2 import PdfReader
from app.config import settings

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except Exception:
    RecursiveCharacterTextSplitter = None


def extract_text_from_pdf(file_path: str) -> list[dict]:
    """Extract text from PDF, returning list of {page_number, text} dicts."""
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({
                "page_number": i + 1,
                "text": text.strip()
            })
    return pages


def chunk_text(pages: list[dict], chunk_size: int = None, chunk_overlap: int = None) -> list[dict]:
    """Split page texts into overlapping chunks with metadata."""
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
    chunks = []
    chunk_index = 0

    for page_data in pages:
        text = page_data["text"]
        page_number = page_data["page_number"]
        if RecursiveCharacterTextSplitter is not None:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""],
            )
            page_chunks = splitter.split_text(text)
            cursor = 0

            for chunk_text_content in page_chunks:
                start = text.find(chunk_text_content[:40], cursor)
                if start < 0:
                    start = cursor
                end = min(start + len(chunk_text_content), len(text))
                cursor = end

                if chunk_text_content.strip():
                    chunks.append({
                        "chunk_id": str(uuid.uuid4()),
                        "text": chunk_text_content.strip(),
                        "page_number": page_number,
                        "chunk_index": chunk_index,
                        "start_char": start,
                        "end_char": end
                    })
                    chunk_index += 1
            continue

        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_text_content = text[start:end]

            if chunk_text_content.strip():
                chunks.append({
                    "chunk_id": str(uuid.uuid4()),
                    "text": chunk_text_content.strip(),
                    "page_number": page_number,
                    "chunk_index": chunk_index,
                    "start_char": start,
                    "end_char": min(end, len(text))
                })
                chunk_index += 1

            start += chunk_size - chunk_overlap

    return chunks


def get_page_count(file_path: str) -> int:
    """Get total page count of a PDF."""
    reader = PdfReader(file_path)
    return len(reader.pages)


def get_full_text(file_path: str) -> str:
    """Get the complete text content of a PDF."""
    pages = extract_text_from_pdf(file_path)
    return "\n\n".join([f"[Page {p['page_number']}]\n{p['text']}" for p in pages])
