from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from app.middleware.auth import verify_token
from app.models.schemas import SummaryRequest, SummaryResponse
from app.services import document_store
from app.services.rag_pipeline import summarize_document

router = APIRouter()


@router.post("/summary", response_model=SummaryResponse)
async def get_summary(request: SummaryRequest, user: dict = Depends(verify_token)):
    """Generate a comprehensive summary of a document."""
    doc = document_store.get_user_document(request.document_id, user)

    result = await run_in_threadpool(
        summarize_document,
        request.document_id,
        doc["filename"],
        doc["page_count"],
    )

    return SummaryResponse(
        summary=result["summary"],
        key_takeaways=result["key_takeaways"],
        document_name=result["document_name"],
        page_count=result["page_count"]
    )
