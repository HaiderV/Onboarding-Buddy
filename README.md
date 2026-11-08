# Onboarding Buddy

A beginner-friendly codebase mentor built with FastAPI, plain HTML/CSS/JavaScript, Groq, and Hindsight persistent memory.

## Features

- Developer name selects a separate Hindsight memory bank.
- Three teaching personas: Friendly Mentor, Strict Senior, and Explain-like-I'm-5.
- Recalls relevant memories before every answer.
- Passes recalled memories and selected sample code files to Groq.
- Retains a structured learning summary after every answer.
- Displays recalled memories and source files in the UI.
- Includes a seed script for a demo developer.

## Project structure

```text
Onboarding-Buddy/
├── main.py
├── seed.py
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
├── README.md
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── sample_repo/
    ├── auth.py
    ├── payments.py
    ├── database.py
    ├── middleware.py
    └── config.py
```

## Setup

### 1. Create a virtual environment

Windows PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Copy `.env.example` to `.env`, then add your own API keys:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
HINDSIGHT_API_KEY=your_hindsight_api_key
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
PORT=8000
```

Never commit `.env` or share API keys.

### 4. Seed the demo developer (optional)

```bash
python seed.py
```

This creates or uses the `developer-demo-developer` bank and adds three example learning memories. In the UI, enter `Demo Developer` to use that bank.

### 5. Start the application

```bash
uvicorn main:app --reload --port 8000
```

Open http://127.0.0.1:8000 in your browser.

## How Hindsight is used

Hindsight provides persistent, developer-specific learning memory.

1. **One bank per developer:** the developer name is normalized into a stable bank ID such as `developer-alex`. Different developers therefore have isolated memory.
2. **Recall before answering:** before every Groq request, the backend calls `client.recall(bank_id=..., query=question)`. The recalled facts are inserted into the system prompt.
3. **Memory-aware teaching:** the system prompt instructs the model to use only recalled memories as learning history and not to re-explain concepts already learned unless the developer asks for a refresher.
4. **Retain after answering:** after a successful answer, the backend calls `client.retain()` with a structured summary containing the explained module, concepts taught, confusion reported by the developer, and selected persona.
5. **Visible memory:** the backend recalls again after retaining and returns those memories to the side panel.

Hindsight is used for memory storage and retrieval; Groq is used to generate the explanation. The sample application does not ask Hindsight to generate the answer.

## Sample codebase retrieval

The sample repository contains five small Python modules. A simple keyword-based selector chooses up to three relevant files for each question. If no keywords match, it provides the authentication and database modules as a useful default. This is intentionally simple and can later be replaced with embeddings or a code search index.

## Notes and limitations

- The sample code is educational, not production authentication or payment code.
- The demo token implementation is deliberately simplified and is not a real JWT implementation.
- Developer names are converted to lowercase URL-safe bank IDs. If two developers normalize to the same name, they will share a bank; use unique developer names.
- The current frontend displays Markdown as readable plain text. A Markdown renderer can be added later if desired.
- The backend uses synchronous Hindsight SDK calls inside a threadpool so they do not block FastAPI's event loop.
- Groq calls use JSON output mode and retry once if the request or response parsing fails.
