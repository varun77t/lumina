import logging
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from app.config import settings
from app.middleware.auth import verify_token
from app.services import document_store
from app.services.pdf_processor import extract_text_from_pdf
from app.services.rag_pipeline import UnreadablePdfError, process_pdf
from app.services.vector_store import delete_collection

logger = logging.getLogger(__name__)

router = APIRouter()


def _delete_document_files(document_id: str) -> None:
    path = document_store.pdf_path(document_id)
    if os.path.exists(path):
        os.remove(path)
    delete_collection(document_id)


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user: dict = Depends(verify_token)):
    """Upload a PDF and process it through the RAG pipeline."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"PDFs must be {settings.MAX_UPLOAD_MB} MB or smaller")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="This file is not a valid PDF")

    # Generate unique document ID
    document_id = str(uuid.uuid4())
    file_path = document_store.pdf_path(document_id)
    filename = os.path.basename(file.filename)

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        # Embedding calls take seconds, so keep them off the event loop
        result = await run_in_threadpool(process_pdf, file_path, document_id)
    except UnreadablePdfError as e:
        _delete_document_files(document_id)
        raise HTTPException(status_code=422, detail=str(e))
    except BaseException:
        _delete_document_files(document_id)
        raise

    doc = {
        "id": document_id,
        "filename": filename,
        "page_count": result["page_count"],
        "chunks_stored": result["chunks_stored"],
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user["sub"],
    }
    document_store.add_document(doc)

    return {key: doc[key] for key in ("id", "filename", "page_count", "chunks_stored", "uploaded_at", "user_id")}


@router.get("/documents")
async def list_documents(user: dict = Depends(verify_token)):
    """List all documents for the authenticated user, newest first."""
    documents = [
        {
            "id": doc["id"],
            "filename": doc["filename"],
            "page_count": doc["page_count"],
            "uploaded_at": doc["uploaded_at"],
            "user_id": doc["user_id"]
        }
        for doc in document_store.list_documents(user["sub"])
    ]
    return {"documents": documents}


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: dict = Depends(verify_token)):
    """Delete a document and its embeddings."""
    document_store.get_user_document(document_id, user)
    document_store.remove_document(document_id)
    _delete_document_files(document_id)
    return {"message": "Document deleted successfully"}


@router.get("/documents/{document_id}/text")
async def get_document_text(document_id: str, user: dict = Depends(verify_token)):
    """Get the extracted text of a document organized by page."""
    doc = document_store.get_user_document(document_id, user)
    path = document_store.pdf_path(document_id)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="PDF file not found")

    pages = await run_in_threadpool(extract_text_from_pdf, path)

    return {
        "document_id": document_id,
        "filename": doc["filename"],
        "pages": pages,
        "page_count": doc["page_count"]
    }


@router.get("/documents/{document_id}/file")
async def get_document_file(document_id: str, user: dict = Depends(verify_token)):
    """Return the original PDF file for authenticated in-app preview."""
    doc = document_store.get_user_document(document_id, user)
    path = document_store.pdf_path(document_id)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="PDF file not found")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=doc["filename"],
    )
