"""
main.py
FastAPI application — Personal HR / Smart Resume Reviewer
"""

import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from ingest import ingest_document, delete_document, list_documents
from retriever import retrieve
from generator import generate_answer

load_dotenv()

app = FastAPI(title="Personal HR — Smart Resume Reviewer", version="1.0.0")

# Allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Request / Response models ─────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    company_name: str = ""


class QueryResponse(BaseModel):
    answer: str
    cv_chunks_used: int
    jd_chunks_used: int
    company_filter: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Personal HR backend is running"}


@app.get("/documents")
def get_documents():
    """List all ingested documents."""
    docs = list_documents()
    return {"documents": docs, "count": len(docs)}


@app.post("/ingest")
async def ingest_file(
    file: UploadFile = File(...),
    doc_type: str = Form(...),       # "cv" or "jd"
    company_name: str = Form(""),    # required for jd
):
    """
    Upload and ingest a CV (PDF) or Job Description (PDF/TXT).
    Accepts multipart/form-data.
    """
    if doc_type not in ("cv", "jd"):
        raise HTTPException(status_code=400, detail="doc_type must be 'cv' or 'jd'")

    if doc_type == "jd" and not company_name.strip():
        raise HTTPException(status_code=400, detail="company_name is required for job descriptions")

    allowed_extensions = {".pdf", ".txt", ".md"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Use PDF or TXT.")

    # Save to disk temporarily
    safe_name = file.filename.replace(" ", "_")
    save_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = ingest_document(
            file_path=save_path,
            doc_type=doc_type,
            company_name=company_name.strip(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

    return {
        "message": "Document ingested successfully",
        **result,
    }


@app.delete("/documents/{doc_id}")
def remove_document(doc_id: str):
    """Delete all chunks for a document from ChromaDB."""
    count = delete_document(doc_id)
    if count == 0:
        raise HTTPException(status_code=404, detail=f"No document found with id: {doc_id}")
    return {"message": f"Deleted {count} chunks for doc_id '{doc_id}'"}


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest):
    """
    Main RAG endpoint.
    Retrieves relevant chunks and generates an answer via Groq.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Retrieve
    retrieved = retrieve(
        query=request.query,
        company_name=request.company_name,
    )

    cv_chunks = retrieved["cv_chunks"]
    jd_chunks = retrieved["jd_chunks"]

    if not cv_chunks and not jd_chunks:
        raise HTTPException(
            status_code=404,
            detail="No documents found. Please upload your CV first."
        )

    # Generate
    try:
        answer = generate_answer(
            query=request.query,
            cv_chunks=cv_chunks,
            jd_chunks=jd_chunks,
            company_name=request.company_name,
        )
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    return QueryResponse(
        answer=answer,
        cv_chunks_used=len(cv_chunks),
        jd_chunks_used=len(jd_chunks),
        company_filter=request.company_name,
    )


@app.get("/companies")
def get_companies():
    """Return list of unique company names from ingested JDs."""
    docs = list_documents()
    companies = sorted(set(
        d["company_name"] for d in docs
        if d["doc_type"] == "jd" and d["company_name"]
    ))
    return {"companies": companies}
