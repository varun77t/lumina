import logging
import re
from google.genai import types
from app.config import settings
from app.services.gemini import get_client

logger = logging.getLogger(__name__)

# No tools are used, so turn off automatic function calling
GENERATION_CONFIG = types.GenerateContentConfig(
    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
)


def _generate(prompt: str) -> str:
    response = get_client().models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=GENERATION_CONFIG,
    )
    if not response.text:
        raise RuntimeError("Gemini returned an empty response")
    return response.text


def _extractive_fallback(question: str, context_chunks: list[dict], gemini_failed: bool = False) -> str:
    """Return a grounded local answer when Gemini is not configured or fails."""
    keywords = {
        word.lower()
        for word in re.findall(r"[A-Za-z0-9]{4,}", question)
        if word.lower() not in {"what", "where", "when", "which", "about", "document", "does", "from"}
    }

    selected = []
    for chunk in context_chunks:
        text = chunk["text"].strip()
        lower_text = text.lower()
        if not keywords or any(keyword in lower_text for keyword in keywords):
            selected.append(f"**Page {chunk['page_number']}:** {text[:550]}")
        if len(selected) >= 3:
            break

    if not selected:
        return "The uploaded document does not contain enough information to answer this question."

    prefix = "Gemini is not configured, so Lumina is showing the most relevant retrieved PDF context instead.\n\n"
    if gemini_failed:
        prefix = "Gemini is temporarily unavailable, so Lumina is showing the most relevant retrieved PDF context instead.\n\n"

    return prefix + "\n\n".join(selected)


def generate_rag_response(question: str, context_chunks: list[dict], document_name: str) -> str:
    """Generate a RAG response using Gemini with retrieved context."""
    if not settings.GOOGLE_API_KEY:
        return _extractive_fallback(question, context_chunks)

    context_text = "\n\n".join([
        f"[Source: {document_name} - Page {chunk['page_number']}]\n{chunk['text']}"
        for chunk in context_chunks
    ])

    prompt = f"""You are Lumina AI, a precise and helpful document assistant. You answer questions ONLY based on the provided document context. You must be accurate, clear, and well-structured in your responses.

CRITICAL RULES:
1. Answer ONLY from the provided document context below.
2. If the answer cannot be found in the context, respond with: "The uploaded document does not contain enough information to answer this question."
3. Do NOT make up or hallucinate any information.
4. Always reference which page(s) your answer comes from.
5. Be concise but thorough.

DOCUMENT CONTEXT:
{context_text}

USER QUESTION:
{question}

Provide a clear, well-structured answer using Markdown formatting where it helps. Write formulas in plain text rather than LaTeX. Reference the source pages when citing information."""

    try:
        return _generate(prompt)
    except Exception:
        logger.exception("Gemini answer generation failed")
        return _extractive_fallback(question, context_chunks, gemini_failed=True)


def generate_summary(chunks: list[dict], document_name: str) -> dict:
    """Generate a comprehensive summary of the document."""
    context_text = "\n\n".join([
        f"[Page {chunk['page_number']}]\n{chunk['text']}"
        for chunk in chunks[:50]
    ])

    prompt = f"""You are Lumina AI, a precise document assistant. Based on the following document content, create a comprehensive summary.

DOCUMENT: {document_name}

CONTENT:
{context_text}

Please provide your response in the following EXACT format:

SUMMARY:
[Write a concise but comprehensive summary of the document in 3-5 paragraphs]

KEY TAKEAWAYS:
- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]
- [Takeaway 4]
- [Takeaway 5]

IMPORTANT: Base your summary ONLY on the provided content. Do not hallucinate or add external information."""

    try:
        response_text = _generate(prompt)
    except Exception:
        if settings.GOOGLE_API_KEY:
            logger.exception("Gemini summary generation failed")
        excerpt = " ".join(chunk["text"].strip() for chunk in chunks[:8])
        summary_text = excerpt[:1400] if excerpt else "No readable text was found in this document."
        return {
            "summary": summary_text,
            "key_takeaways": [
                f"Content was extracted from {document_name}.",
                "Gemini was unavailable, so this is an excerpt rather than a generated summary."
                if settings.GOOGLE_API_KEY
                else "Configure GOOGLE_API_KEY to enable Gemini-generated summaries.",
                "Retrieved summary text is limited to the indexed PDF context.",
            ],
        }

    summary = ""
    takeaways = []

    if "KEY TAKEAWAYS:" in response_text:
        parts = response_text.split("KEY TAKEAWAYS:")
        summary = parts[0].replace("SUMMARY:", "").strip()

        takeaway_lines = parts[1].strip().split("\n")
        for line in takeaway_lines:
            line = line.strip()
            if line.startswith("- "):
                takeaways.append(line[2:].strip())
            elif line.startswith("* "):
                takeaways.append(line[2:].strip())
    else:
        summary = response_text.replace("SUMMARY:", "").strip()

    return {
        "summary": summary,
        "key_takeaways": takeaways if takeaways else ["See the full summary above for key details."]
    }
