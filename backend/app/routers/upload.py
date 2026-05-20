import os
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from app.middleware.auth import verify_token
from app.services.rag_pipeline import process_pdf
from app.config import settings

router = APIRouter()

# Simple JSON-based document metadata store
METADATA_FILE = os.path.join(settings.UPLOAD_DIR, "metadata.json")


def load_metadata() -> dict:
    """Load document metadata from JSON file."""
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    return {}


def save_metadata(metadata: dict):
    """Save document metadata to JSON file."""
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user: dict = Depends(verify_token)):
    """Upload a PDF and process it through the RAG pipeline."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Generate unique document ID
    document_id = str(uuid.uuid4())

    # Save file
    file_path = os.path.join(settings.UPLOAD_DIR, f"{document_id}.pdf")
    content = await file.read()

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        # Process through RAG pipeline
        result = process_pdf(file_path, document_id)

        # Store metadata
        metadata = load_metadata()
        metadata[document_id] = {
            "id": document_id,
            "filename": file.filename,
            "page_count": result["page_count"],
            "chunks_stored": result["chunks_stored"],
            "uploaded_at": datetime.utcnow().isoformat(),
            "user_id": user["sub"],
            "file_path": file_path
        }
        save_metadata(metadata)

        return {
            "id": document_id,
            "filename": file.filename,
            "page_count": result["page_count"],
            "chunks_stored": result["chunks_stored"],
            "uploaded_at": metadata[document_id]["uploaded_at"],
            "user_id": user["sub"]
        }

    except Exception as e:
        # Cleanup on failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@router.get("/documents")
async def list_documents(user: dict = Depends(verify_token)):
    """List all documents for the authenticated user."""
    metadata = load_metadata()
    user_docs = [
        {
            "id": doc["id"],
            "filename": doc["filename"],
            "page_count": doc["page_count"],
            "uploaded_at": doc["uploaded_at"],
            "user_id": doc["user_id"]
        }
        for doc in metadata.values()
        if doc["user_id"] == user["sub"]
    ]
    # Sort by upload date, newest first
    user_docs.sort(key=lambda x: x["uploaded_at"], reverse=True)
    return {"documents": user_docs}


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: dict = Depends(verify_token)):
    """Delete a document and its embeddings."""
    metadata = load_metadata()

    if document_id not in metadata:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = metadata[document_id]
    if doc["user_id"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Delete file
    if os.path.exists(doc["file_path"]):
        os.remove(doc["file_path"])

    # Delete from ChromaDB
    from app.services.vector_store import delete_collection
    delete_collection(document_id)

    # Remove metadata
    del metadata[document_id]
    save_metadata(metadata)

    return {"message": "Document deleted successfully"}


@router.get("/documents/{document_id}/text")
async def get_document_text(document_id: str, user: dict = Depends(verify_token)):
    """Get the extracted text of a document organized by page."""
    metadata = load_metadata()

    if document_id not in metadata:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = metadata[document_id]
    if doc["user_id"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.services.pdf_processor import extract_text_from_pdf
    pages = extract_text_from_pdf(doc["file_path"])

    return {
        "document_id": document_id,
        "filename": doc["filename"],
        "pages": pages,
        "page_count": doc["page_count"]
    }


@router.get("/documents/{document_id}/file")
async def get_document_file(document_id: str, user: dict = Depends(verify_token)):
    """Return the original PDF file for authenticated in-app preview."""
    metadata = load_metadata()

    if document_id not in metadata:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = metadata[document_id]
    if doc["user_id"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not os.path.exists(doc["file_path"]):
        raise HTTPException(status_code=404, detail="PDF file not found")

    return FileResponse(
        doc["file_path"],
        media_type="application/pdf",
        filename=doc["filename"],
    )
