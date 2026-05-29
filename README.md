# Personal HR — Smart Resume Reviewer

A full-stack RAG application that lets you ask intelligent career questions
grounded in your actual CV and real job descriptions.

**Stack:** FastAPI · ChromaDB · all-MiniLM-L6-v2 · Groq (Llama 3.1 8B) · React · Vite

---

## Project Structure

```
personal-hr/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── ingest.py        # PDF/TXT loading, chunking, embedding, ChromaDB storage
│   ├── retriever.py     # Query embedding + similarity search
│   ├── generator.py     # Groq LLM prompt + generation
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── components/
    │       ├── ChatPanel.jsx
    │       ├── DocumentPanel.jsx
    │       └── UploadModal.jsx
    ├── package.json
    └── vite.config.js
```

---

## Setup

### 1. Get a Groq API key

Sign up free at https://console.groq.com → API Keys → Create key.

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and paste your Groq API key:
#   GROQ_API_KEY=gsk_...

# Start server
uvicorn main:app --reload --port 8000
```

The first run downloads `all-MiniLM-L6-v2` (~90 MB) automatically.
API docs available at: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## How to Use

1. **Upload your CV** — click "Add document", choose "Resume / CV", upload your PDF.
2. **Add job descriptions** — click "Add document", choose "Job Description",
   enter the company name, upload the JD (PDF or TXT).
3. **Ask questions** — select a company from the dropdown and type your query.

### Example queries

| Query | What it does |
|---|---|
| What skills am I missing for this role? | Skill gap analysis |
| Rewrite my professional summary to match this job | Tailored rewrite |
| What keywords from the JD should I add to my CV? | ATS optimization |
| Which of my projects are most relevant to highlight? | Project selection |
| What are my strongest skills for this position? | Strength mapping |

---

## RAG Architecture

```
Ingestion (offline, once per document):
  File → Text extraction → Chunk (~300 words, 50 overlap)
       → MiniLM embed → ChromaDB (with metadata: doc_type, company)

Query (per request):
  User query → MiniLM embed
             → ChromaDB cosine search (filtered by doc_type + company)
             → Top-6 CV chunks + Top-6 JD chunks
             → Prompt assembly → Groq Llama 3.1 8B → Answer
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/documents` | List all ingested documents |
| POST | `/ingest` | Upload and ingest a file (multipart form) |
| DELETE | `/documents/{doc_id}` | Remove a document |
| POST | `/query` | RAG query → answer |
| GET | `/companies` | List ingested company names |

---

## Extending

- **Add more JDs** — just upload them via the UI with their company name.
- **Swap the LLM** — change `GROQ_MODEL` in `generator.py` to any Groq model.
- **Change chunk size** — edit `CHUNK_SIZE` in `ingest.py` (300 words is a good default).
- **Add chat history** — pass previous messages to `generate_answer` and include them in the Groq call.