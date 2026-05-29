"""
retriever.py
Embeds a user query and retrieves the most relevant chunks from Qdrant.
"""

from ingest import get_embedder, get_client, COLLECTION_NAME
from qdrant_client.models import Filter, FieldCondition, MatchValue

TOP_K = 6


def retrieve(query: str, company_name: str = "", top_k: int = TOP_K) -> dict:
    embedder = get_embedder()
    client   = get_client()

    query_vector = embedder.encode([query], show_progress_bar=False).tolist()[0]

    # Retrieve CV chunks
    cv_filter = Filter(must=[FieldCondition(key="doc_type", match=MatchValue(value="cv"))])
    cv_results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=cv_filter,
        limit=top_k,
        with_payload=True,
    )

    cv_chunks = [
        {
            "text":    r.payload.get("text", ""),
            "company": r.payload.get("company_name", ""),
            "source":  r.payload.get("source_file", ""),
            "score":   round(r.score, 4),
        }
        for r in cv_results
    ]

    # Retrieve JD chunks (optionally filtered by company)
    jd_chunks = []
    try:
        must_conditions = [FieldCondition(key="doc_type", match=MatchValue(value="jd"))]
        if company_name:
            must_conditions.append(
                FieldCondition(key="company_name", match=MatchValue(value=company_name))
            )
        jd_filter  = Filter(must=must_conditions)
        jd_results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=jd_filter,
            limit=top_k,
            with_payload=True,
        )
        jd_chunks = [
            {
                "text":    r.payload.get("text", ""),
                "company": r.payload.get("company_name", ""),
                "source":  r.payload.get("source_file", ""),
                "score":   round(r.score, 4),
            }
            for r in jd_results
        ]
    except Exception:
        pass

    return {
        "cv_chunks":      cv_chunks,
        "jd_chunks":      jd_chunks,
        "query":          query,
        "company_filter": company_name,
    }