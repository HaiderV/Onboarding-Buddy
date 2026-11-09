import asyncio
import json
import os
import re
import secrets
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import certifi
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from groq import Groq
from hindsight_client import Hindsight
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

BASE_DIR = Path(__file__).resolve().parent
SAMPLE_REPO = BASE_DIR / "sample_repo"
FRONTEND_DIR = BASE_DIR / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"

load_dotenv(BASE_DIR / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", "").strip()
HINDSIGHT_BASE_URL = os.getenv(
    "HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io"
).strip()
MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "onboarding_buddy").strip()
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "").strip()
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
GITHUB_REDIRECT_URI = os.getenv(
    "GITHUB_REDIRECT_URI",
    "http://127.0.0.1:8000/api/auth/github/callback",
).strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is missing. Add it to your .env file.")
if not HINDSIGHT_API_KEY:
    raise RuntimeError("HINDSIGHT_API_KEY is missing. Add it to your .env file.")

groq_client = Groq(api_key=GROQ_API_KEY)
memory_client = Hindsight(
    base_url=HINDSIGHT_BASE_URL,
    api_key=HINDSIGHT_API_KEY,
)

mongo_client: AsyncIOMotorClient | None = (
    AsyncIOMotorClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000,
        tlsCAFile=certifi.where(),
    )
    if MONGODB_URI
    else None
)
mongo_db = mongo_client[MONGODB_DB_NAME] if mongo_client else None

app = FastAPI(title="Onboarding Buddy", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"\n[ERROR] Unhandled exception on {request.method} {request.url}:")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )

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

# --- Request / Response Models ---

class ChatRequest(BaseModel):
    developer_name: str | None = None
    persona: str = "Friendly Mentor"
    question: str = Field(min_length=1, max_length=4000)
    workspace_files: dict[str, str] = Field(default_factory=dict, max_length=50)
    project_id: str | None = None

class ChatResponse(BaseModel):
    answer: str
    memories: list[str]
    files_used: list[str]
    bank_id: str

class ProjectSyncRequest(BaseModel):
    workspace_name: str = Field(min_length=1, max_length=120)
    workspace_files: dict[str, str] = Field(default_factory=dict, max_length=100)

class TokenLoginRequest(BaseModel):
    token: str = Field(min_length=1)

class DevLoginRequest(BaseModel):
    developer_name: str = Field(min_length=1, max_length=80)

class QuizGenerateRequest(BaseModel):
    project_id: str | None = None
    topic: str | None = None

class QuizSubmitRequest(BaseModel):
    project_id: str | None = None
    score: int
    total: int
    missed_topics: list[str] = Field(default_factory=list)


# --- Authentication Helpers ---

async def verify_github_user(authorization: str = Header(...)) -> dict[str, Any]:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub bearer token required.")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="GitHub bearer token required.")
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "Onboarding-Buddy-App",
            },
        )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid GitHub session or token.")
    profile = response.json()
    github_id = str(profile.get("id", ""))
    if not github_id:
        raise HTTPException(status_code=401, detail="Invalid GitHub profile.")
    return {
        "github_id": github_id,
        "login": profile.get("login") or "",
        "name": profile.get("name") or profile.get("login") or "",
        "avatar_url": profile.get("avatar_url") or "",
        "email": profile.get("email") or "",
    }


async def save_github_user(profile: dict[str, Any]) -> dict[str, Any]:
    if mongo_db is None:
        raise HTTPException(
            status_code=503,
            detail="MongoDB Atlas is not configured. Set MONGODB_URI in .env.",
        )
    now = datetime.now(timezone.utc)
    users = mongo_db["users"]
    try:
        await users.update_one(
            {"github_id": profile["github_id"]},
            {"$set": {**profile, "updated_at": now}, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
    except Exception as exc:
        message = str(exc).lower()
        if "authentication failed" in message or "auth failed" in message:
            raise HTTPException(
                status_code=503,
                detail="MongoDB authentication failed. Reset or verify the Atlas database user's password.",
            )
        raise HTTPException(
            status_code=503,
            detail="Could not connect to MongoDB Atlas. Check Network Access and MONGODB_URI.",
        )
    return profile


async def profile_from_request(request: Request) -> dict[str, Any] | None:
    authorization = request.headers.get("authorization")
    if authorization and authorization.startswith("Bearer "):
        profile = await verify_github_user(authorization)
        await save_github_user(profile)
        return profile

    session_token = request.cookies.get("ob_session")
    if not session_token or mongo_db is None:
        return None
    session = await mongo_db["sessions"].find_one({"token": session_token})
    if not session:
        return None
    user = await mongo_db["users"].find_one(
        {"github_id": session["github_id"]},
        {"_id": 0},
    )
    return user


def make_bank_id(developer_name: str) -> str:
    """Convert developer name to a personal Hindsight memory bank ID."""
    slug = re.sub(r"[^a-z0-9-]+", "-", developer_name.strip().lower())
    slug = re.sub(r"-+", "-", slug).strip("-") or "developer"
    return f"dev-{slug[:45]}"


def make_project_bank_id(workspace_name: str) -> str:
    """Convert workspace/project name to an AI collective codebase memory bank ID."""
    slug = re.sub(r"[^a-z0-9-]+", "-", workspace_name.strip().lower())
    slug = re.sub(r"-+", "-", slug).strip("-") or "project"
    return f"prj-{slug[:45]}"


def ensure_bank(bank_id: str) -> None:
    try:
        memory_client.create_bank(bank_id=bank_id, name=bank_id)
    except Exception as exc:
        message = str(exc).lower()
        if not any(word in message for word in ("exist", "already", "409", "conflict")):
            print(f"[Warning] Hindsight create_bank notice: {exc}")


def recall_memories(bank_id: str, question: str) -> list[str]:
    try:
        result = memory_client.recall(bank_id=bank_id, query=question, budget="low")
        memories = []
        for item in getattr(result, "results", []) or []:
            text = getattr(item, "text", None)
            if text:
                memories.append(str(text))
        return memories[:3]  # Keep to top 3 concise memories to conserve tokens
    except Exception as exc:
        print(f"[Warning] Hindsight recall: {exc}")
        return []


def select_relevant_files(question: str) -> dict[str, str]:
    """Retrieval for the built-in sample repo with strict token limits."""
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
    for name in selected[:2]:  # Max 2 files
        path = SAMPLE_REPO / name
        if path.exists():
            # Truncate to 1,500 characters max per file to stay safely under TPM limits
            result[name] = path.read_text(encoding="utf-8")[:1500]
    return result


def select_relevant_project_files(question: str, files: dict[str, str]) -> dict[str, str]:
    """Smart keyword scoring to pick top relevant files, strictly budgeted for token limits."""
    q_words = [w.lower() for w in re.findall(r"[a-zA-Z0-9_]{3,}", question)]
    scores = []
    for file_path, content in files.items():
        score = 0
        p_lower = file_path.lower()
        c_str = str(content)
        c_lower = c_str[:3000].lower()
        for word in q_words:
            if word in p_lower:
                score += 5
            if word in c_lower:
                score += 2
        if any(key in p_lower for key in ("readme", "main", "app", "index", "config")) and score > 0:
            score += 2
        scores.append((file_path, score, c_str))

    scores.sort(key=lambda x: x[1], reverse=True)
    selected = {}
    total_chars = 0
    max_total_chars = 3600  # ~800 tokens max across all files

    for file_path, score, content in scores[:2]:  # Top 2 most relevant files
        if score > 0 and total_chars < max_total_chars:
            allowed = min(1800, max_total_chars - total_chars)
            selected[file_path] = content[:allowed]
            total_chars += len(selected[file_path])

    # If no word matched, provide first 1-2 files truncated
    if not selected and files:
        for file_path, content in list(files.items())[:2]:
            allowed = min(1800, max_total_chars - total_chars)
            selected[file_path] = str(content)[:allowed]
            total_chars += len(selected[file_path])
            if total_chars >= max_total_chars:
                break
    return selected


def build_system_prompt(persona: str, dev_memories: list[str], prj_memories: list[str], code_files: dict[str, str]) -> str:
    persona_instruction = PERSONAS.get(persona, PERSONAS["Friendly Mentor"])
    dev_history = "\n".join(f"- {m}" for m in dev_memories) if dev_memories else "Developer is starting fresh with this codebase."
    prj_history = "\n".join(f"- {m}" for m in prj_memories) if prj_memories else "General codebase conventions apply."
    code_context = "\n\n".join(
        f"### {name}\n```\n{content}\n```" for name, content in code_files.items()
    )
    return f"""You are Onboarding Buddy, an intelligent AI developer onboarding mentor.
Persona: {persona_instruction}

Developer's Personal Learning Context (avoid re-explaining mastered concepts; reinforce confused points):
{dev_history}

Project Knowledge Base (patterns & architecture discovered for this repository):
{prj_history}

Code Context:
{code_context}

Rules:
- Ground explanations strictly in the code context.
- Be concise, direct, and practical.
- Do not re-explain concepts already learned unless asked.

Return valid JSON with:
- "answer": Markdown explanation with code snippets.
- "explained": Short topic name.
- "concepts_taught": Comma-separated list.
- "user_confused_by": Concepts user found confusing or "None stated".
- "memory_summary": 1-sentence learning summary.
""".strip()


def call_groq(system_prompt: str, question: str) -> dict[str, str]:
    # Resilient model fallback: if on-demand model hits token/rate limits (413/429), try versatile/instant models
    models_to_try = [GROQ_MODEL]
    for fallback in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

    last_error = None
    for model_name in models_to_try:
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question},
                ],
                response_format={"type": "json_object"},
                max_tokens=1024,
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
            err_str = str(exc).lower()
            if "rate_limit" in err_str or "413" in err_str or "tokens" in err_str:
                print(f"[Groq Info] Model {model_name} rate/token limited. Falling back to next model...")
                continue
            # If JSON decoding error, retry once
            continue
    raise RuntimeError(f"Groq request failed across models: {last_error}")


def retain_learning(
    dev_bank_id: str,
    prj_bank_id: str,
    developer_name: str,
    project_name: str,
    persona: str,
    data: dict[str, str]
) -> None:
    # 1. Store in Developer Personal Memory Bank (tracks individual developer learning journey)
    dev_summary = (
        f"Dev: {developer_name} | "
        f"Topic: {data.get('explained', 'Codebase')[:70]} | "
        f"Mastered: {data.get('concepts_taught', '')[:90]} | "
        f"Confused: {data.get('user_confused_by', 'None')[:60]}"
    )
    try:
        memory_client.retain(
            bank_id=dev_bank_id,
            content=dev_summary,
            context="Developer personal onboarding memory",
        )
    except Exception as exc:
        print(f"[Warning] Hindsight dev retain: {exc}")

    # 2. Store in AI Project Knowledge Bank (tracks overall collective codebase insights)
    concepts = data.get('concepts_taught')
    if concepts and concepts != "None specified":
        prj_summary = (
            f"Project: {project_name} | "
            f"Module: {data.get('explained', 'Codebase')[:70]} | "
            f"Key Patterns: {concepts[:90]} | "
            f"Common Pitfalls: {data.get('user_confused_by', 'None')[:60]}"
        )
        try:
            memory_client.retain(
                bank_id=prj_bank_id,
                content=prj_summary,
                context="Project collective intelligence memory",
            )
        except Exception as exc:
            print(f"[Warning] Hindsight prj retain: {exc}")


def generate_project_quiz(code_files: dict[str, str], topic: str | None = None) -> list[dict[str, Any]]:
    """Generate 3 codebase-grounded multiple-choice quiz questions using Groq."""
    code_summary = "\n\n".join(
        f"### {f}\n{c[:1200]}" for f, c in list(code_files.items())[:3]
    )
    prompt = f"""Based strictly on this codebase code, generate 3 multiple choice questions to test a developer onboarding onto this project.
Focus area: {topic or 'Project architecture, authentication, database, functions and workflows'}.

Codebase:
{code_summary}

Return valid JSON with a single key "questions" containing a list of 3 items, each with:
- "id": number (1, 2, 3)
- "question": string question about the actual code
- "file": filename string this question refers to
- "options": list of 4 distinct string choices
- "answer_index": integer (0, 1, 2, or 3) indicating the correct option
- "explanation": string explaining why this choice is correct according to the code
"""
    models_to_try = [GROQ_MODEL, "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
    for model_name in models_to_try:
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "You are a senior technical lead designing a codebase quiz. Return only valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                max_tokens=900,
            )
            content = response.choices[0].message.content or "{}"
            data = json.loads(content)
            questions = data.get("questions", [])
            if questions and isinstance(questions, list):
                return questions
        except Exception as exc:
            print(f"[Quiz Gen] Model {model_name} error: {exc}")
            continue
    return []


# --- API Routes ---

@app.get("/api/health")
async def health():
    db_health = await mongo_health()
    mongo_connected = db_health.get("status") == "connected"
    groq_connected = bool(groq_client and GROQ_API_KEY)
    return {
        "status": "ok",
        "model": GROQ_MODEL,
        "mongodb": "connected" if mongo_connected else db_health.get("status", "disconnected"),
        "mongodb_details": db_health,
        "groq": "connected" if groq_connected else "not_configured",
        "oauth_configured": bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)
    }


async def mongo_health() -> dict[str, str]:
    if mongo_db is None:
        return {"status": "not_configured"}
    try:
        await asyncio.wait_for(mongo_db.command("ping"), timeout=2.0)
        return {"status": "connected"}
    except Exception as exc:
        message = str(exc).lower()
        if "authentication failed" in message or "auth failed" in message:
            return {
                "status": "authentication_failed",
                "message": "Atlas rejected the database username or password.",
            }
        return {
            "status": "connection_failed",
            "message": "MongoDB Atlas connection failed.",
        }


@app.get("/api/personas")
async def personas():
    return {"personas": list(PERSONAS.keys())}


@app.get("/api/auth/providers")
async def auth_providers():
    return {
        "github_oauth_configured": bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET),
        "redirect_uri": GITHUB_REDIRECT_URI,
    }


@app.get("/api/auth/me")
async def auth_me(request: Request, authorization: str | None = Header(None)):
    if authorization:
        profile = await verify_github_user(authorization)
        await save_github_user(profile)
        return {"authenticated": True, "user": profile}
    profile = await profile_from_request(request)
    return {"authenticated": profile is not None, "user": profile}


@app.get("/api/auth/github/login")
async def github_login():
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env, or use Token/Dev Login.",
        )
    state = secrets.token_urlsafe(32)
    if mongo_db is not None:
        await mongo_db["oauth_states"].insert_one({
            "state": state,
            "created_at": datetime.now(timezone.utc),
        })
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "read:user user:email",
        "state": state,
    }
    query = urlencode(params)
    return RedirectResponse(url=f"https://github.com/login/oauth/authorize?{query}")


@app.get("/api/auth/github/callback")
async def github_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
):
    target_url = FRONTEND_URL if FRONTEND_URL else "/"

    if error:
        print(f"\n[OAuth Error from GitHub] {error}: {error_description}")
        return RedirectResponse(url=f"{target_url}?error={error}", status_code=302)

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from GitHub.")

    # 1. State validation
    if mongo_db is not None and state:
        try:
            oauth_state = await mongo_db["oauth_states"].find_one_and_delete({"state": state})
            if not oauth_state:
                print(f"[OAuth Warning] State not found or already consumed: {state}")
        except Exception as exc:
            print(f"[OAuth Warning] MongoDB state check error: {exc}")

    # 2. Exchange code for access token
    token_url = "https://github.com/login/oauth/access_token"
    token_payload = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_REDIRECT_URI,
    }
    request_headers = {
        "Accept": "application/json",
        "User-Agent": "Onboarding-Buddy-App",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_response = await client.post(
                token_url,
                data=token_payload,
                headers=request_headers,
            )
            token_data = token_response.json()

            if "error" in token_data:
                err_msg = token_data.get("error_description", token_data["error"])
                print(f"\n[OAuth Error during Token Exchange] {err_msg}")
                raise HTTPException(status_code=400, detail=f"GitHub token exchange error: {err_msg}")

            access_token = token_data.get("access_token")
            if not access_token:
                print(f"\n[OAuth Error] No access token in response: {token_data}")
                raise HTTPException(status_code=401, detail="GitHub did not return an access token.")

            profile_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Onboarding-Buddy-App",
                },
            )

        if profile_response.status_code != 200:
            print(f"\n[OAuth Error] Failed to fetch user profile: {profile_response.status_code} - {profile_response.text}")
            raise HTTPException(status_code=401, detail="Could not load GitHub profile.")

        github_profile = profile_response.json()
        github_id = str(github_profile.get("id") or "")
        if not github_id:
            print(f"\n[OAuth Error] Missing user ID in GitHub profile: {github_profile}")
            raise HTTPException(status_code=401, detail="Invalid GitHub profile payload.")

        profile = {
            "github_id": github_id,
            "login": github_profile.get("login") or "",
            "name": github_profile.get("name") or github_profile.get("login") or "",
            "avatar_url": github_profile.get("avatar_url") or "",
            "email": github_profile.get("email") or "",
        }

        await save_github_user(profile)

        if mongo_db is None:
            raise HTTPException(status_code=503, detail="MongoDB Atlas is not configured.")

        session_token = secrets.token_urlsafe(48)
        await mongo_db["sessions"].insert_one({
            "token": session_token,
            "github_id": profile["github_id"],
            "created_at": datetime.now(timezone.utc),
        })

        response = RedirectResponse(url=target_url, status_code=302)
        response.set_cookie(
            "ob_session",
            session_token,
            httponly=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 30,
        )
        return response

    except HTTPException:
        raise
    except Exception as exc:
        print(f"\n[OAuth Callback Unhandled Exception]:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(exc)}")


@app.post("/api/auth/token-login")
async def token_login(payload: TokenLoginRequest, response: Response):
    token = payload.token.strip()
    profile = await verify_github_user(f"Bearer {token}")
    await save_github_user(profile)
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB Atlas is not configured.")

    session_token = secrets.token_urlsafe(48)
    await mongo_db["sessions"].insert_one({
        "token": session_token,
        "github_id": profile["github_id"],
        "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie(
        "ob_session",
        session_token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
    )
    return {"authenticated": True, "user": profile}


@app.post("/api/auth/dev-login")
async def dev_login(payload: DevLoginRequest, response: Response):
    dev_name = payload.developer_name.strip()
    if not dev_name:
        raise HTTPException(status_code=400, detail="Developer name is required.")

    dev_slug = re.sub(r"[^a-z0-9]", "", dev_name.lower())[:20] or "dev"
    profile = {
        "github_id": f"dev_{dev_slug}",
        "login": dev_name,
        "name": dev_name,
        "avatar_url": "",
        "email": f"{dev_slug}@local.dev",
    }
    await save_github_user(profile)
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB Atlas is not configured.")

    session_token = secrets.token_urlsafe(48)
    await mongo_db["sessions"].insert_one({
        "token": session_token,
        "github_id": profile["github_id"],
        "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie(
        "ob_session",
        session_token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
    )
    return {"authenticated": True, "user": profile}


@app.post("/api/auth/logout")
async def github_logout(request: Request, response: Response):
    session_token = request.cookies.get("ob_session")
    if session_token and mongo_db is not None:
        await mongo_db["sessions"].delete_one({"token": session_token})
    response.delete_cookie("ob_session")
    return {"authenticated": False}


@app.get("/api/dashboard")
async def dashboard(request: Request, authorization: str | None = Header(None)):
    profile = None
    if authorization:
        profile = await verify_github_user(authorization)
        await save_github_user(profile)
    else:
        profile = await profile_from_request(request)

    # Without logging in, don't let anyone enter the dashboard!
    if profile is None:
        raise HTTPException(status_code=401, detail="Sign in to view your dashboard.")
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB Atlas is not configured.")

    gid_str = str(profile.get("github_id", ""))
    p_filter = {"$or": [{"github_id": gid_str}]}
    if gid_str.isdigit():
        p_filter["$or"].append({"github_id": int(gid_str)})

    projects_cursor = mongo_db["projects"].find(
        p_filter,
        {
            "_id": 0,
            "project_id": 1,
            "workspace_name": 1,
            "file_paths": 1,
            "folders": 1,
            "created_at": 1,
            "updated_at": 1,
        },
    ).sort("updated_at", -1)

    c_filter = {"$or": [{"github_id": gid_str}]}
    if gid_str.isdigit():
        c_filter["$or"].append({"github_id": int(gid_str)})

    chats_cursor = mongo_db["chat_history"].find(
        c_filter,
        {
            "_id": 0,
            "persona": 1,
            "question": 1,
            "answer": 1,
            "memories": 1,
            "files_used": 1,
            "bank_id": 1,
            "created_at": 1,
        },
    ).sort("created_at", -1)

    return {
        "user": profile,
        "projects": await projects_cursor.to_list(length=50),
        "chat_history": await chats_cursor.to_list(length=50),
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request, authorization: str | None = Header(None)):
    question = payload.question.strip()
    persona = payload.persona
    profile: dict[str, Any] | None = None

    if authorization:
        profile = await verify_github_user(authorization)
        await save_github_user(profile)
    elif request.cookies.get("ob_session"):
        profile = await profile_from_request(request)

    # Protected endpoint: user must be authenticated!
    if profile is None:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please log in to chat with Onboarding Buddy."
        )

    developer_name = profile.get("name") or profile.get("login") or payload.developer_name or "Developer"

    if persona not in PERSONAS:
        persona = "Friendly Mentor"

    try:
        project_name = "sample_repo"
        dev_bank_id = make_bank_id(developer_name)
        await run_in_threadpool(ensure_bank, dev_bank_id)

        # 1. Select codebase files (strictly budgeted to prevent token overflow)
        code_files: dict[str, str] = {}
        if payload.workspace_files:
            for file_name, content in payload.workspace_files.items():
                safe_name = Path(file_name).as_posix()
                if safe_name and "\x00" not in str(content):
                    code_files[safe_name[:120]] = str(content)[:1800]

        # If no direct files, look for active synced project in MongoDB
        if not code_files and mongo_db is not None:
            project = None
            if payload.project_id and payload.project_id != "sample_repo":
                project = await mongo_db["projects"].find_one({
                    "$or": [
                        {"project_id": payload.project_id},
                        {"workspace_name": payload.project_id, "github_id": profile["github_id"]},
                        {"project_id": f"{profile['github_id']}:{payload.project_id}"},
                    ]
                })
            elif profile:
                project = await mongo_db["projects"].find_one(
                    {"github_id": profile["github_id"]},
                    sort=[("updated_at", -1)]
                )
            if project and "files" in project and isinstance(project["files"], dict):
                project_name = project.get("workspace_name", "Workspace")
                code_files = select_relevant_project_files(question, project["files"])

        # Fallback to sample repository if still empty
        if not code_files:
            code_files = select_relevant_files(question)

        # 2. Dual Recall from Hindsight: Developer Bank + Project Bank
        prj_bank_id = make_project_bank_id(project_name)
        await run_in_threadpool(ensure_bank, prj_bank_id)

        dev_memories = await run_in_threadpool(recall_memories, dev_bank_id, question)
        prj_memories = await run_in_threadpool(recall_memories, prj_bank_id, question)

        # 3. Call Groq with dual memories and budgeted code context
        system_prompt = build_system_prompt(persona, dev_memories, prj_memories, code_files)
        result = await run_in_threadpool(call_groq, system_prompt, question)

        # 4. Dual Retain into Hindsight: User Learning Memory + Project AI Knowledge
        await run_in_threadpool(
            retain_learning, dev_bank_id, prj_bank_id, developer_name, project_name, persona, result
        )

        # 5. Refresh developer memories for immediate UI update
        updated_memories = dev_memories
        try:
            recalled_after = await run_in_threadpool(recall_memories, dev_bank_id, question)
            if recalled_after:
                updated_memories = recalled_after
        except Exception:
            pass

        # 6. Save in MongoDB chat history
        if mongo_db is not None:
            await mongo_db["chat_history"].insert_one({
                "github_id": profile["github_id"],
                "developer_name": developer_name,
                "project_name": project_name,
                "persona": persona,
                "question": question,
                "answer": result["answer"],
                "memories": updated_memories or dev_memories,
                "files_used": list(code_files.keys()),
                "bank_id": dev_bank_id,
                "created_at": datetime.now(timezone.utc),
            })

        return ChatResponse(
            answer=result["answer"],
            memories=updated_memories or dev_memories,
            files_used=list(code_files.keys()),
            bank_id=dev_bank_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI mentor request failed: {exc}")


@app.post("/api/projects/sync")
async def sync_project(
    payload: ProjectSyncRequest,
    request: Request,
    authorization: str | None = Header(None),
):
    profile = None
    if authorization:
        profile = await verify_github_user(authorization)
        await save_github_user(profile)
    else:
        profile = await profile_from_request(request)

    if profile is None:
        raise HTTPException(status_code=401, detail="Authentication required to sync projects.")
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB Atlas is not configured.")

    now = datetime.now(timezone.utc)
    safe_files = {}
    folders = set()

    for name, content in payload.workspace_files.items():
        if "\x00" not in name and "\x00" not in str(content):
            clean_name = Path(name).as_posix()
            # Store up to 4,000 characters per file (keeps MongoDB under 250KB for the entire repo)
            safe_files[clean_name] = str(content)[:4000]
            parent = str(Path(clean_name).parent.as_posix())
            if parent and parent != ".":
                parts = parent.split("/")
                for i in range(1, len(parts) + 1):
                    folders.add("/".join(parts[:i]))

    project_id = f"{profile['github_id']}:{payload.workspace_name}"
    await mongo_db["projects"].update_one(
        {"project_id": project_id},
        {
            "$set": {
                "github_id": profile["github_id"],
                "workspace_name": payload.workspace_name[:120],
                "files": safe_files,
                "file_paths": sorted(safe_files.keys()),
                "folders": sorted(list(folders)),
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return {
        "project_id": project_id,
        "workspace_name": payload.workspace_name,
        "file_count": len(safe_files),
        "folder_count": len(folders),
    }


@app.get("/api/projects")
async def list_projects(request: Request, authorization: str | None = Header(None)):
    profile = None
    if authorization:
        profile = await verify_github_user(authorization)
    else:
        profile = await profile_from_request(request)

    if profile is None:
        raise HTTPException(status_code=401, detail="Sign in to view synced projects.")
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB Atlas is not configured.")

    gid_str = str(profile.get("github_id", ""))
    find_filter = {"$or": [{"github_id": gid_str}]}
    if gid_str.isdigit():
        find_filter["$or"].append({"github_id": int(gid_str)})

    cursor = mongo_db["projects"].find(
        find_filter,
        {"_id": 0, "project_id": 1, "workspace_name": 1, "file_paths": 1, "folders": 1,
         "created_at": 1, "updated_at": 1},
    ).sort("updated_at", -1)
    return {"projects": await cursor.to_list(length=50)}


@app.get("/api/projects/{project_id:path}/files")
async def get_project_files(project_id: str, request: Request, authorization: str | None = Header(None)):
    profile = None
    if authorization:
        profile = await verify_github_user(authorization)
    else:
        profile = await profile_from_request(request)

    if profile is None:
        raise HTTPException(status_code=401, detail="Sign in required.")

    import urllib.parse
    clean_id = urllib.parse.unquote(project_id).strip()

    if clean_id in ("sample_repo", "default") or project_id in ("sample_repo", "default"):
        sample_files = {}
        for p in SAMPLE_REPO.glob("*.py"):
            sample_files[p.name] = p.read_text(encoding="utf-8")[:4000]
        return {
            "project_id": "sample_repo",
            "workspace_name": "sample_repo",
            "files": sample_files,
            "folders": [],
        }

    if mongo_db is None:
        return {
            "project_id": clean_id,
            "workspace_name": clean_id,
            "files": {},
            "folders": [],
        }

    gid_str = str(profile.get("github_id", ""))
    queries = [
        {"project_id": clean_id},
        {"project_id": project_id},
        {"workspace_name": clean_id, "github_id": gid_str},
        {"workspace_name": clean_id},
        {"project_id": f"{gid_str}:{clean_id}"},
    ]
    if gid_str.isdigit():
        queries.append({"workspace_name": clean_id, "github_id": int(gid_str)})

    project = await mongo_db["projects"].find_one({"$or": queries})
    if not project:
        # Match project_id ending with :clean_id
        project = await mongo_db["projects"].find_one({"project_id": {"$regex": f":{re.escape(clean_id)}$"}})

    if not project:
        return {
            "project_id": clean_id,
            "workspace_name": clean_id,
            "files": {},
            "folders": [],
            "error": "Project files not synced yet",
        }

    raw_files = project.get("files", {})
    normalized_files = {k.replace("\\", "/"): v for k, v in raw_files.items()}
    folders = [f.replace("\\", "/") for f in project.get("folders", [])]
    return {
        "project_id": project.get("project_id", clean_id),
        "workspace_name": project.get("workspace_name", clean_id),
        "files": normalized_files,
        "folders": folders,
    }


@app.delete("/api/projects/{project_id:path}")
async def delete_project(project_id: str, request: Request, authorization: str | None = Header(None)):
    profile = None
    if authorization:
        profile = await verify_github_user(authorization)
    else:
        profile = await profile_from_request(request)

    if profile is None:
        raise HTTPException(status_code=401, detail="Sign in required.")
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not configured.")

    import urllib.parse
    clean_id = urllib.parse.unquote(project_id).strip()

    if clean_id in ("sample_repo", "default") or project_id in ("sample_repo", "default"):
        raise HTTPException(status_code=400, detail="Cannot delete default demo workspace.")

    gid_str = str(profile.get("github_id", ""))
    queries = [
        {"project_id": clean_id, "github_id": gid_str},
        {"project_id": project_id, "github_id": gid_str},
        {"workspace_name": clean_id, "github_id": gid_str},
        {"project_id": f"{gid_str}:{clean_id}"},
    ]
    if gid_str.isdigit():
        queries.extend([
            {"workspace_name": clean_id, "github_id": int(gid_str)},
            {"project_id": clean_id, "github_id": int(gid_str)},
        ])

    result = await mongo_db["projects"].delete_one({"$or": queries})
    # Note: quizzes, chat history, and Hindsight memory banks are deliberately PRESERVED!
    return {
        "status": "deleted",
        "deleted_count": result.deleted_count,
        "project_id": clean_id,
        "preserved_knowledge": True
    }


@app.get("/api/learning-hub")
async def learning_hub_data(request: Request, authorization: str | None = Header(None)):
    profile = None
    if authorization:
        profile = await verify_github_user(authorization)
    else:
        profile = await profile_from_request(request)

    if profile is None:
        raise HTTPException(status_code=401, detail="Sign in required.")

    dev_name = profile.get("name") or profile.get("login") or "Developer"
    dev_bank = make_bank_id(dev_name)

    dev_memories = await run_in_threadpool(recall_memories, dev_bank, "learning concepts summary")

    quizzes = []
    chats = []
    prj_bank = "prj-general"

    if mongo_db is not None:
        try:
            quizzes = await mongo_db["quizzes"].find(
                {"github_id": profile["github_id"]},
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=20)
        except Exception:
            pass

        try:
            chats = await mongo_db["chat_history"].find(
                {"github_id": profile["github_id"]},
                {"_id": 0, "question": 1, "answer": 1, "persona": 1, "created_at": 1, "files_used": 1}
            ).sort("created_at", -1).to_list(length=30)
        except Exception:
            pass

        latest_project = await mongo_db["projects"].find_one(
            {"github_id": profile["github_id"]},
            sort=[("updated_at", -1)]
        )
        if latest_project:
            prj_bank = make_project_bank_id(latest_project.get("workspace_name", "workspace"))

    prj_memories = await run_in_threadpool(recall_memories, prj_bank, "codebase architecture patterns")

    return {
        "user": profile,
        "dev_bank_id": dev_bank,
        "prj_bank_id": prj_bank,
        "dev_memories": dev_memories,
        "prj_memories": prj_memories,
        "quizzes": quizzes,
        "chat_history": chats,
        "total_quizzes": len(quizzes),
        "total_chats": len(chats),
    }


@app.post("/api/quiz/generate")
async def quiz_generate(payload: QuizGenerateRequest, request: Request, authorization: str | None = Header(None)):
    profile = None
    if authorization:
        profile = await verify_github_user(authorization)
    else:
        profile = await profile_from_request(request)

    if profile is None:
        raise HTTPException(status_code=401, detail="Sign in required to take a quiz.")

    code_files: dict[str, str] = {}
    project_name = "sample_repo"

    if payload.project_id and payload.project_id != "sample_repo" and mongo_db is not None:
        project = await mongo_db["projects"].find_one({"project_id": payload.project_id})
        if project and "files" in project and isinstance(project["files"], dict):
            code_files = project["files"]
            project_name = project.get("workspace_name", "Workspace")
    elif mongo_db is not None:
        # Load user's latest project
        latest = await mongo_db["projects"].find_one(
            {"github_id": profile["github_id"]},
            sort=[("updated_at", -1)]
        )
        if latest and "files" in latest and isinstance(latest["files"], dict):
            code_files = latest["files"]
            project_name = latest.get("workspace_name", "Workspace")

    if not code_files:
        for p in SAMPLE_REPO.glob("*.py"):
            code_files[p.name] = p.read_text(encoding="utf-8")[:1500]

    questions = await run_in_threadpool(generate_project_quiz, code_files, payload.topic)
    return {
        "project_id": payload.project_id or "default",
        "project_name": project_name,
        "questions": questions,
    }


@app.post("/api/quiz/submit")
async def quiz_submit(payload: QuizSubmitRequest, request: Request, authorization: str | None = Header(None)):
    profile = None
    if authorization:
        profile = await verify_github_user(authorization)
    else:
        profile = await profile_from_request(request)

    if profile is None:
        raise HTTPException(status_code=401, detail="Sign in required.")

    dev_name = profile.get("name") or profile.get("login") or "Developer"
    bank_id = make_bank_id(dev_name)

    # 1. Save result to MongoDB
    if mongo_db is not None:
        await mongo_db["quizzes"].insert_one({
            "github_id": profile["github_id"],
            "developer_name": dev_name,
            "project_id": payload.project_id,
            "score": payload.score,
            "total": payload.total,
            "missed_topics": payload.missed_topics,
            "created_at": datetime.now(timezone.utc),
        })

    # 2. Retain quiz summary in Hindsight persistent memory
    missed_text = ", ".join(payload.missed_topics) if payload.missed_topics else "None"
    memory_text = (
        f"Developer: {dev_name} | "
        f"Quiz Score: {payload.score}/{payload.total} | "
        f"Missed Concepts: {missed_text} | "
        f"Summary: Completed codebase quiz with {payload.score}/{payload.total} correct."
    )
    try:
        await run_in_threadpool(
            memory_client.retain,
            bank_id=bank_id,
            content=memory_text,
            context="Onboarding Buddy quiz assessment",
        )
    except Exception as exc:
        print(f"[Warning] Failed to retain quiz in Hindsight: {exc}")

    return {
        "success": True,
        "score": payload.score,
        "total": payload.total,
        "bank_id": bank_id,
    }



# --- Static & SPA Hosting ---

if (DIST_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
else:
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def home():
        return FileResponse(FRONTEND_DIR / "index.html")
