import os
import json
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import verify_token
from app.models.schemas import SummaryRequest, SummaryResponse
from app.services.rag_pipeline import summarize_document
from app.config import settings

router = APIRouter()

METADATA_FILE = os.path.join(settings.UPLOAD_DIR, "metadata.json")


def load_metadata() -> dict:
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    return {}


@router.post("/summary", response_model=SummaryResponse)
async def get_summary(request: SummaryRequest, user: dict = Depends(verify_token)):
    """Generate a comprehensive summary of a document."""
    metadata = load_metadata()

    if request.document_id not in metadata:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = metadata[request.document_id]
    if doc["user_id"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        result = summarize_document(
            document_id=request.document_id,
            document_name=doc["filename"],
            page_count=doc["page_count"]
        )

        return SummaryResponse(
            summary=result["summary"],
            key_takeaways=result["key_takeaways"],
            document_name=result["document_name"],
            page_count=result["page_count"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")
