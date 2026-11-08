import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from groq import Groq
from hindsight_client import Hindsight
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
SAMPLE_REPO = BASE_DIR / "sample_repo"
FRONTEND_DIR = BASE_DIR / "frontend"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", "").strip()
HINDSIGHT_BASE_URL = os.getenv(
    "HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io"
).strip()

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is missing. Add it to your .env file.")
if not HINDSIGHT_API_KEY:
    raise RuntimeError("HINDSIGHT_API_KEY is missing. Add it to your .env file.")

groq_client = Groq(api_key=GROQ_API_KEY)
memory_client = Hindsight(
    base_url=HINDSIGHT_BASE_URL,
    api_key=HINDSIGHT_API_KEY,
)

app = FastAPI(title="Onboarding Buddy", version="1.0.0")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

PERSONAS = {
    "Friendly Mentor": (
        "Be warm, encouraging, patient, and practical. Explain jargon simply "
        "and use a small example when useful."
    ),
    "Strict Senior": (
        "Be direct, precise, and professional. Point out incorrect assumptions "
        "clearly, but remain respectful. Prefer concise technical explanations."
    ),
    "Explain-like-I'm-5": (
        "Use very simple words, everyday analogies, and short sentences. "
        "Do not be condescending."
    ),
}

class ChatRequest(BaseModel):
    developer_name: str = Field(min_length=1, max_length=80)
    persona: str
    question: str = Field(min_length=1, max_length=4000)

class ChatResponse(BaseModel):
    answer: str
    memories: list[str]
    files_used: list[str]
    bank_id: str

def make_bank_id(developer_name: str) -> str:
    """Convert a display name to a stable, URL-safe Hindsight bank ID."""
    slug = re.sub(r"[^a-z0-9-]+", "-", developer_name.strip().lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    if not slug:
        raise ValueError("Please enter a developer name containing letters or numbers.")
    return f"developer-{slug[:55]}"

def ensure_bank(bank_id: str) -> None:
    # Hindsight also creates banks on first write. Explicit creation makes setup clear.
    try:
        memory_client.create_bank(bank_id=bank_id, name=bank_id)
    except Exception as exc:
        # Existing banks can return an error depending on server version.
        # Continue; the first retain/recall below will surface genuine access errors.
        message = str(exc).lower()
        if not any(word in message for word in ("exist", "already", "409", "conflict")):
            raise

def recall_memories(bank_id: str, question: str) -> list[str]:
    result = memory_client.recall(bank_id=bank_id, query=question, budget="low")
    memories = []
    for item in getattr(result, "results", []) or []:
        text = getattr(item, "text", None)
        if text:
            memories.append(str(text))
    return memories[:10]

def select_relevant_files(question: str) -> dict[str, str]:
    """Small deterministic retrieval for this deliberately tiny example repo."""
    q = question.lower()
    rules = {
        "auth.py": ["auth", "login", "jwt", "token", "password", "register", "authentication"],
        "payments.py": ["payment", "payments", "checkout", "billing", "charge", "refund"],
        "database.py": ["database", "db", "sql", "query", "connection", "repository", "store"],
        "middleware.py": ["middleware", "request", "response", "http", "permission", "authorization"],
        "config.py": ["config", "environment", "settings", "secret", "configuration"],
    }
    selected = [name for name, keywords in rules.items() if any(k in q for k in keywords)]
    if not selected:
        selected = ["auth.py", "database.py"]
    result = {}
    for name in selected[:3]:
        path = SAMPLE_REPO / name
        if path.exists():
            result[name] = path.read_text(encoding="utf-8")
    return result

def build_system_prompt(persona: str, memories: list[str], code_files: dict[str, str]) -> str:
    persona_instruction = PERSONAS[persona]
    if memories:
        history = "\n".join(f"- {memory}" for memory in memories)
    else:
        history = "No memories were recalled for this developer. Say so if history is relevant; do not invent prior learning."
    code_context = "\n\n".join(
        f"### {name}\n```python\n{content}\n```" for name, content in code_files.items()
    )
    return f"""
You are Onboarding Buddy, an assistant helping a new developer understand a small Python codebase.

PERSONA:
{persona_instruction}

MEMORY RULES (must follow):
- Use only the recalled memories below as history about this developer.
- Do not re-explain concepts the developer already learned unless they ask for a refresher.
- If a relevant concept is already learned, build on it and move forward.
- If no memories were recalled, do not pretend to know the developer's background. Say there is no relevant prior learning memory when appropriate.
- Do not invent facts about the developer or the company.
- If the recalled memories say the developer is confused about a concept, explain that concept more carefully.

RECALLED MEMORY (the only allowed history):
{history}

SAMPLE CODEBASE FILES SELECTED FOR THIS QUESTION:
{code_context}

RESPONSE FORMAT:
Return a single valid JSON object with exactly these string fields:
- "answer": the user-facing explanation in Markdown.
- "explained": short topic/module that you explained.
- "concepts_taught": comma-separated concepts taught in this answer.
- "user_confused_by": concepts the user explicitly said they do not understand, or "None stated".
- "memory_summary": a concise structured summary for long-term memory.

Keep the answer useful, beginner-friendly, and grounded in the supplied files. If the files do not contain enough information, say what is missing instead of guessing.
""".strip()

def call_groq(system_prompt: str, question: str) -> dict[str, str]:
    """Call Groq; retry once after an API/format failure."""
    last_error = None
    for attempt in range(2):
        try:
            response = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question},
                ],
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            data = json.loads(content)
            return {
                "answer": str(data.get("answer", "I couldn't create an answer.")),
                "explained": str(data.get("explained", "General codebase question")),
                "concepts_taught": str(data.get("concepts_taught", "None specified")),
                "user_confused_by": str(data.get("user_confused_by", "None stated")),
                "memory_summary": str(data.get("memory_summary", "")),
            }
        except Exception as exc:
            last_error = exc
            if attempt == 0:
                continue
    raise RuntimeError(f"Groq request failed after one retry: {last_error}")

def retain_learning(bank_id: str, developer_name: str, persona: str, data: dict[str, str]) -> None:
    summary = (
        f"Developer: {developer_name} | "
        f"Explained: {data['explained']} | "
        f"Concepts taught: {data['concepts_taught']} | "
        f"User confused by: {data['user_confused_by']} | "
        f"Persona: {persona} | "
        f"Summary: {data['memory_summary']}"
    )
    memory_client.retain(
        bank_id=bank_id,
        content=summary,
        context="Onboarding Buddy learning summary",
    )

@app.get("/")
async def home():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/api/health")
async def health():
    return {"status": "ok", "model": GROQ_MODEL}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    developer_name = payload.developer_name.strip()
    question = payload.question.strip()
    persona = payload.persona

    if not developer_name:
        raise HTTPException(status_code=400, detail="Enter your developer name.")
    if persona not in PERSONAS:
        raise HTTPException(status_code=400, detail="Choose a valid persona.")

    try:
        bank_id = make_bank_id(developer_name)
        await run_in_threadpool(ensure_bank, bank_id)

        # Required sequence: recall first, then ask Groq with recalled memories.
        memories = await run_in_threadpool(recall_memories, bank_id, question)
        code_files = select_relevant_files(question)
        system_prompt = build_system_prompt(persona, memories, code_files)
        result = await run_in_threadpool(call_groq, system_prompt, question)

        # Save a structured learning summary after every successful answer.
        await run_in_threadpool(
            retain_learning, bank_id, developer_name, persona, result
        )

        # Refresh memory panel so the user can see the newly retained learning.
        updated_memories = await run_in_threadpool(recall_memories, bank_id, question)
        return ChatResponse(
            answer=result["answer"],
            memories=updated_memories or memories,
            files_used=list(code_files.keys()),
            bank_id=bank_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not complete the AI request: {exc}")

@app.get("/api/personas")
async def personas():
    return {"personas": list(PERSONAS.keys())}
