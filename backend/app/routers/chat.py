import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from app.middleware.auth import verify_token
from app.models.schemas import ChatRequest, ChatResponse
from app.services import document_store
from app.services.rag_pipeline import ask_question

router = APIRouter()


async def _answer(request: ChatRequest, user: dict) -> ChatResponse:
    doc = document_store.get_user_document(request.document_id, user)

    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Retrieval and generation call Gemini, so keep them off the event loop
    result = await run_in_threadpool(ask_question, request.document_id, question, doc["filename"])

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


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(request: ChatRequest, user: dict = Depends(verify_token)):
    """Ask a question about a document using RAG."""
    return await _answer(request, user)


@router.post("/chat/stream")
async def stream_chat_with_document(request: ChatRequest, user: dict = Depends(verify_token)):
    """Stream an answer for a document question as server-sent events."""
    # The answer is generated before streaming starts, so failures return a normal HTTP error
    response = await _answer(request, user)

    async def event_stream():
        for token in response.answer.split(" "):
            yield f"data: {json.dumps({'type': 'token', 'content': token + ' '})}\n\n"
            await asyncio.sleep(0.015)

        yield f"data: {json.dumps({'type': 'final', 'response': response.model_dump()})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
