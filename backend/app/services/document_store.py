import json
import os
import threading
from fastapi import HTTPException
from app.config import settings

# Simple JSON-based document metadata store
METADATA_FILE = os.path.join(settings.UPLOAD_DIR, "metadata.json")

# Serializes read-modify-write cycles so concurrent uploads and deletes don't lose entries
_lock = threading.Lock()


def _load() -> dict:
    if not os.path.exists(METADATA_FILE):
        return {}
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(metadata: dict) -> None:
    temp_path = f"{METADATA_FILE}.tmp"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    os.replace(temp_path, METADATA_FILE)


def pdf_path(document_id: str) -> str:
    """Location of a document's PDF, derived from its id so data can move between machines."""
    return os.path.join(settings.UPLOAD_DIR, f"{document_id}.pdf")


def list_documents(user_id: str) -> list[dict]:
    with _lock:
        metadata = _load()
    documents = [doc for doc in metadata.values() if doc.get("user_id") == user_id]
    documents.sort(key=lambda doc: doc["uploaded_at"], reverse=True)
    return documents


def get_user_document(document_id: str, user: dict) -> dict:
    """Return the document if it belongs to the user; otherwise raise 404 without revealing it exists."""
    with _lock:
        doc = _load().get(document_id)
    if doc is None or doc.get("user_id") != user["sub"]:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def add_document(doc: dict) -> None:
    with _lock:
        metadata = _load()
        metadata[doc["id"]] = doc
        _save(metadata)


def remove_document(document_id: str) -> None:
    with _lock:
        metadata = _load()
        if metadata.pop(document_id, None) is not None:
            _save(metadata)
