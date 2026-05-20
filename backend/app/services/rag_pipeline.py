from app.services.pdf_processor import extract_text_from_pdf, chunk_text, get_page_count
from app.services.vector_store import store_chunks, query_chunks, get_all_chunks
from app.services.llm import generate_rag_response, generate_summary


def process_pdf(file_path: str, document_id: str) -> dict:
    """Full pipeline: extract text, chunk, embed, and store in ChromaDB."""
    # Extract text from PDF
    pages = extract_text_from_pdf(file_path)
    page_count = get_page_count(file_path)

    # Chunk the text
    chunks = chunk_text(pages)
    if not chunks:
        raise ValueError("No readable text was found in this PDF")

    # Store in ChromaDB with embeddings
    stored_count = store_chunks(document_id, chunks)

    return {
        "document_id": document_id,
        "page_count": page_count,
        "chunks_stored": stored_count,
        "pages_extracted": len(pages)
    }


def ask_question(document_id: str, question: str, document_name: str) -> dict:
    """RAG pipeline: retrieve relevant chunks and generate answer."""
    # Retrieve relevant chunks
    relevant_chunks = query_chunks(document_id, question)

    if not relevant_chunks:
        return {
            "answer": "The uploaded document does not contain enough information to answer this question.",
            "sources": [],
            "document_name": document_name
        }

    # Generate answer using Gemini
    answer = generate_rag_response(question, relevant_chunks, document_name)

    # Format sources
    sources = [
        {
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "chunk_text": chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"],
            "relevance_score": chunk["relevance_score"]
        }
        for chunk in relevant_chunks
    ]

    return {
        "answer": answer,
        "sources": sources,
        "document_name": document_name
    }


def summarize_document(document_id: str, document_name: str, page_count: int) -> dict:
    """Generate a summary of the entire document."""
    # Get all chunks
    all_chunks = get_all_chunks(document_id)

    if not all_chunks:
        return {
            "summary": "No content found in this document.",
            "key_takeaways": [],
            "document_name": document_name,
            "page_count": page_count
        }

    # Generate summary using Gemini
    result = generate_summary(all_chunks, document_name)

    return {
        "summary": result["summary"],
        "key_takeaways": result["key_takeaways"],
        "document_name": document_name,
        "page_count": page_count
    }
