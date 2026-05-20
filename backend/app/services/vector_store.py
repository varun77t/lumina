import json
import math
import os
import shutil
from app.config import settings
from app.services.embeddings import generate_embeddings, generate_single_embedding

try:
    import chromadb
except Exception:
    chromadb = None

_client = None


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
    norm_b = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (norm_a * norm_b)


def _fallback_path(document_id: str) -> str:
    return os.path.join(settings.CHROMA_DIR, f"fallback_{document_id}.json")


def _load_fallback(document_id: str) -> list[dict]:
    path = _fallback_path(document_id)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def _save_fallback(document_id: str, records: list[dict]) -> None:
    with open(_fallback_path(document_id), "w", encoding="utf-8") as file:
        json.dump(records, file)


def get_chroma_client():
    """Get or initialize ChromaDB persistent client."""
    if chromadb is None:
        return None

    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
    return _client


def get_or_create_collection(document_id: str):
    """Get or create a ChromaDB collection for a document."""
    client = get_chroma_client()
    if client is None:
        return None

    collection_name = f"doc_{document_id.replace('-', '_')}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )


def store_chunks(document_id: str, chunks: list[dict]):
    """Store text chunks with embeddings in ChromaDB or the local fallback store."""
    if not chunks:
        return 0

    texts = [chunk["text"] for chunk in chunks]
    embeddings = generate_embeddings(texts)
    collection = get_or_create_collection(document_id)

    if collection is None:
        records = []
        for chunk, embedding in zip(chunks, embeddings):
            records.append({
                "id": chunk["chunk_id"],
                "text": chunk["text"],
                "embedding": embedding,
                "metadata": {
                    "page_number": chunk["page_number"],
                    "chunk_index": chunk["chunk_index"],
                    "document_id": document_id,
                }
            })
        _save_fallback(document_id, records)
        return len(records)

    ids = [chunk["chunk_id"] for chunk in chunks]
    metadatas = [
        {
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "document_id": document_id
        }
        for chunk in chunks
    ]

    collection.add(
        documents=texts,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas
    )

    return len(chunks)


def query_chunks(document_id: str, query_text: str, top_k: int = None):
    """Query for the most relevant chunks."""
    top_k = top_k or settings.TOP_K_RESULTS
    collection = get_or_create_collection(document_id)
    query_embedding = generate_single_embedding(query_text)

    if collection is None:
        records = _load_fallback(document_id)
        scored = []
        for record in records:
            score = _cosine_similarity(query_embedding, record["embedding"])
            metadata = record["metadata"]
            scored.append({
                "text": record["text"],
                "page_number": metadata["page_number"],
                "chunk_index": metadata["chunk_index"],
                "relevance_score": round(score, 4),
            })
        scored.sort(key=lambda item: item["relevance_score"], reverse=True)
        return scored[:top_k]

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )

    retrieved_chunks = []
    if results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            metadata = results["metadatas"][0][i]
            distance = results["distances"][0][i]
            retrieved_chunks.append({
                "text": doc,
                "page_number": metadata["page_number"],
                "chunk_index": metadata["chunk_index"],
                "relevance_score": round(1 - distance, 4)
            })

    return retrieved_chunks


def get_all_chunks(document_id: str):
    """Get all chunks for a document."""
    collection = get_or_create_collection(document_id)

    if collection is None:
        chunks = [
            {
                "text": record["text"],
                "page_number": record["metadata"]["page_number"],
                "chunk_index": record["metadata"]["chunk_index"],
            }
            for record in _load_fallback(document_id)
        ]
    else:
        results = collection.get(include=["documents", "metadatas"])
        chunks = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"]):
                metadata = results["metadatas"][i]
                chunks.append({
                    "text": doc,
                    "page_number": metadata["page_number"],
                    "chunk_index": metadata["chunk_index"]
                })

    chunks.sort(key=lambda x: (x["page_number"], x["chunk_index"]))
    return chunks


def delete_collection(document_id: str):
    """Delete a document's vector collection."""
    client = get_chroma_client()
    if client is None:
        path = _fallback_path(document_id)
        if os.path.exists(path):
            os.remove(path)
        return

    collection_name = f"doc_{document_id.replace('-', '_')}"
    try:
        client.delete_collection(name=collection_name)
    except Exception:
        pass

    legacy_path = _fallback_path(document_id)
    if os.path.isdir(legacy_path):
        shutil.rmtree(legacy_path)
    elif os.path.exists(legacy_path):
        os.remove(legacy_path)
