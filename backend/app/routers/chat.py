import os
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.middleware.auth import verify_token
from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_pipeline import ask_question
from app.config import settings

router = APIRouter()

METADATA_FILE = os.path.join(settings.UPLOAD_DIR, "metadata.json")


def load_metadata() -> dict:
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    return {}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(request: ChatRequest, user: dict = Depends(verify_token)):
    """Ask a question about a document using RAG."""
    metadata = load_metadata()

    if request.document_id not in metadata:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = metadata[request.document_id]
    if doc["user_id"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        result = ask_question(
            document_id=request.document_id,
            question=request.question,
            document_name=doc["filename"]
        )

        return ChatResponse(
            answer=result["answer"],
            sources=[
                {
                    "page_number": s["page_number"],
                    "chunk_index": s.get("chunk_index"),
                    "chunk_text": s["chunk_text"],
                    "relevance_score": s["relevance_score"]
                }
                for s in result["sources"]
            ],
            document_name=result["document_name"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")


@router.post("/chat/stream")
async def stream_chat_with_document(request: ChatRequest, user: dict = Depends(verify_token)):
    """Stream an answer for a document question as server-sent events."""
    metadata = load_metadata()

    if request.document_id not in metadata:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = metadata[request.document_id]
    if doc["user_id"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    async def event_stream():
        result = ask_question(
            document_id=request.document_id,
            question=request.question,
            document_name=doc["filename"]
        )

        for token in result["answer"].split(" "):
            yield f"data: {json.dumps({'type': 'token', 'content': token + ' '})}\n\n"
            await asyncio.sleep(0.015)

        response = {
            "answer": result["answer"],
            "sources": [
                {
                    "page_number": source["page_number"],
                    "chunk_index": source.get("chunk_index"),
                    "chunk_text": source["chunk_text"],
                    "relevance_score": source["relevance_score"],
                }
                for source in result["sources"]
            ],
            "document_name": result["document_name"],
        }
        yield f"data: {json.dumps({'type': 'final', 'response': response})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
