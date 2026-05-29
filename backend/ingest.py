"""
ingest.py
Handles loading CV (PDF) and Job Description (TXT/PDF) files,
chunking them, embedding with all-MiniLM-L6-v2, and storing in
Qdrant (local file-based storage — no C++ compiler required).
"""

import os
import uuid
import json
import pdfplumber
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter,
    FieldCondition, MatchValue
)
from sentence_transformers import SentenceTransformer
from typing import Literal

# ── Constants ────────────────────────────────────────────────────────────────
CHUNK_SIZE      = 300      # words per chunk
CHUNK_OVERLAP   = 50       # overlapping words between chunks
QDRANT_PATH     = "./qdrant_db"
COLLECTION_NAME = "personal_hr"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
VECTOR_DIM      = 384      # all-MiniLM-L6-v2 output dimension

# ── Singletons ────────────────────────────────────────────────────────────────
_embedder: SentenceTransformer | None = None
_client:   QdrantClient | None        = None


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
    return _embedder


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        os.makedirs(QDRANT_PATH, exist_ok=True)
        _client = QdrantClient(path=QDRANT_PATH)
        # Create collection if it doesn't exist
        existing = [c.name for c in _client.get_collections().collections]
        if COLLECTION_NAME not in existing:
            _client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
    return _client


# ── Text extraction ───────────────────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def extract_text_from_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()


def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in (".txt", ".md"):
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


# ── Ingestion ─────────────────────────────────────────────────────────────────

def ingest_document(
    file_path: str,
    doc_type: Literal["cv", "jd"],
    company_name: str = "",
    doc_id: str = "",
) -> dict:
    if not doc_id:
        doc_id = os.path.splitext(os.path.basename(file_path))[0]

    text = extract_text(file_path)
    if not text:
        raise ValueError(f"No text extracted from {file_path}")

    chunks = chunk_text(text)

    embedder = get_embedder()
    embeddings = embedder.encode(chunks, show_progress_bar=False).tolist()

    client = get_client()

    # Delete old chunks for this doc_id before re-inserting (upsert behaviour)
    delete_document(doc_id)

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embeddings[i],
            payload={
                "doc_id":      doc_id,
                "doc_type":    doc_type,
                "company_name": company_name,
                "chunk_index": i,
                "source_file": os.path.basename(file_path),
                "text":        chunks[i],
            },
        )
        for i in range(len(chunks))
    ]

    client.upsert(collection_name=COLLECTION_NAME, points=points)

    return {
        "doc_id":        doc_id,
        "chunks_stored": len(chunks),
        "doc_type":      doc_type,
        "company_name":  company_name,
    }


def delete_document(doc_id: str) -> int:
    client = get_client()
    result = client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
        ),
    )
    return 0  # Qdrant delete doesn't return count easily; treat as success


def list_documents() -> list[dict]:
    client = get_client()
    # Scroll through all points and deduplicate by doc_id
    seen = {}
    offset = None
    while True:
        results, next_offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=100,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        for point in results:
            p = point.payload
            doc_id = p.get("doc_id", "")
            if doc_id and doc_id not in seen:
                seen[doc_id] = {
                    "doc_id":       doc_id,
                    "doc_type":     p.get("doc_type", ""),
                    "company_name": p.get("company_name", ""),
                    "source_file":  p.get("source_file", ""),
                }
        if next_offset is None:
            break
        offset = next_offset
    return list(seen.values())