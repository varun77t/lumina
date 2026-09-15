import json
import math
import os
from app.config import settings
from app.services.embeddings import generate_embeddings, generate_single_embedding


class IndexMismatchError(RuntimeError):
    """A document's stored vectors don't match the embedding model currently configured."""


def _index_path(document_id: str) -> str:
    # The "fallback_" prefix is kept so documents indexed by earlier versions stay readable
    return os.path.join(settings.VECTOR_DIR, f"fallback_{document_id}.json")


def _load_records(document_id: str) -> list[dict]:
    path = _index_path(document_id)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def _save_records(document_id: str, records: list[dict]) -> None:
    path = _index_path(document_id)
    temp_path = f"{path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as file:
        json.dump(records, file)
    os.replace(temp_path, path)


def _norm(vector: list[float]) -> float:
    return math.sqrt(sum(value * value for value in vector)) or 1.0


def store_chunks(document_id: str, chunks: list[dict]) -> int:
    """Embed text chunks and store them in the document's JSON vector index."""
    if not chunks:
        return 0

    embeddings = generate_embeddings([chunk["text"] for chunk in chunks])
    records = [
        {
            "id": chunk["chunk_id"],
            "text": chunk["text"],
            "embedding": embedding,
            "metadata": {
                "page_number": chunk["page_number"],
                "chunk_index": chunk["chunk_index"],
                "document_id": document_id,
            },
        }
        for chunk, embedding in zip(chunks, embeddings)
    ]
    _save_records(document_id, records)
    return len(records)


def query_chunks(document_id: str, query_text: str, top_k: int = None) -> list[dict]:
    """Return the chunks most similar to the query, best match first."""
    top_k = top_k or settings.TOP_K_RESULTS
    records = _load_records(document_id)
    if not records:
        return []

    query_embedding = generate_single_embedding(query_text)
    if len(query_embedding) != len(records[0]["embedding"]):
        raise IndexMismatchError(
            "This document was indexed with a different embedding model. Delete it and upload it again."
        )

    query_norm = _norm(query_embedding)
    scored = []
    for record in records:
        embedding = record["embedding"]
        score = sum(x * y for x, y in zip(query_embedding, embedding)) / (query_norm * _norm(embedding))
        scored.append({
            "text": record["text"],
            "page_number": record["metadata"]["page_number"],
            "chunk_index": record["metadata"]["chunk_index"],
            "relevance_score": round(score, 4),
        })

    scored.sort(key=lambda item: item["relevance_score"], reverse=True)
    return scored[:top_k]


def get_all_chunks(document_id: str) -> list[dict]:
    """Get all chunks for a document in reading order."""
    chunks = [
        {
            "text": record["text"],
            "page_number": record["metadata"]["page_number"],
            "chunk_index": record["metadata"]["chunk_index"],
        }
        for record in _load_records(document_id)
    ]
    chunks.sort(key=lambda x: (x["page_number"], x["chunk_index"]))
    return chunks


def delete_collection(document_id: str) -> None:
    """Delete a document's vector index."""
    path = _index_path(document_id)
    if os.path.exists(path):
        os.remove(path)
