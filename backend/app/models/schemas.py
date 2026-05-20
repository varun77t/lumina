from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class DocumentResponse(BaseModel):
    id: str
    filename: str
    page_count: int
    uploaded_at: str
    user_id: str


class ChatRequest(BaseModel):
    question: str
    document_id: str


class SourceCitation(BaseModel):
    page_number: int
    chunk_text: str
    relevance_score: float
    chunk_index: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    document_name: str


class SummaryRequest(BaseModel):
    document_id: str


class SummaryResponse(BaseModel):
    summary: str
    key_takeaways: List[str]
    document_name: str
    page_count: int


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
