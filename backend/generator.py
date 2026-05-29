"""
generator.py
Builds the final prompt from retrieved context and calls Groq's
llama-3.1-8b-instant to generate the answer.
"""

import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_MODEL = "llama-3.1-8b-instant"

SYSTEM_PROMPT = """You are an expert career coach and professional resume consultant.
You have access to the candidate's resume and one or more job descriptions.
Your job is to provide specific, actionable, and honest career advice.

Rules:
- Be concrete. Name actual skills, tools, or keywords.
- Be constructive. Frame gaps as opportunities.
- When rewriting text, match the tone of the job description.
- Keep answers focused and structured with clear sections.
- If you don't have enough context, say so clearly.
"""


def _get_groq_api_key() -> str:
    return os.getenv("GROQ_API_KEY") or os.getenv("Groq_Api_Key") or ""


def build_context_block(cv_chunks: list[dict], jd_chunks: list[dict], company_name: str) -> str:
    lines = []
    if cv_chunks:
        lines.append("=== CANDIDATE RESUME (relevant sections) ===")
        for i, chunk in enumerate(cv_chunks, 1):
            lines.append(f"[CV Section {i}]\n{chunk['text']}")
        lines.append("")
    if jd_chunks:
        label = company_name.upper() if company_name else "TARGET COMPANY"
        lines.append(f"=== JOB DESCRIPTION — {label} (relevant sections) ===")
        for i, chunk in enumerate(jd_chunks, 1):
            lines.append(f"[JD Section {i}]\n{chunk['text']}")
        lines.append("")
    return "\n".join(lines)


def detect_query_intent(query: str) -> str:
    q = query.lower()
    if any(kw in q for kw in ["missing", "gap", "lack", "don't have", "need to add", "skills"]):
        return "skill_gap"
    if any(kw in q for kw in ["rewrite", "improve", "tailor", "update", "rephrase", "better match"]):
        return "rewrite"
    return "general"


def generate_answer(
    query: str,
    cv_chunks: list[dict],
    jd_chunks: list[dict],
    company_name: str = "",
) -> str:
    api_key = _get_groq_api_key()
    if not api_key:
        raise EnvironmentError("GROQ_API_KEY not set in .env file")

    intent = detect_query_intent(query)
    context = build_context_block(cv_chunks, jd_chunks, company_name)

    intent_hint = ""
    if intent == "skill_gap":
        intent_hint = "\n\nProvide a structured skill gap analysis with: (1) Key skills/keywords in the JD missing from the CV, (2) Skills present in CV that are relevant, (3) Specific recommendations to bridge the gap."
    elif intent == "rewrite":
        intent_hint = "\n\nProvide the rewritten text first, then briefly explain the changes made and why they better match the role."

    user_message = f"Context:\n{context}\n\nQuestion: {query}{intent_hint}"

    client = Groq(api_key=api_key)
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        raise RuntimeError(f"Groq API error: {e}") from e
