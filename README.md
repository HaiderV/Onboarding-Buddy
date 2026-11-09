# 🚀 Onboarding Buddy

> **The Intelligent, Persistent AI Developer Onboarding Mentor with Dual-Bank Cognitive Memory & Real Codebase Grounding.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Groq](https://img.shields.io/badge/Groq-Llama%203.3%20%7C%20GPT--OSS-F55036.svg?style=flat)](https://groq.com)
[![Hindsight](https://img.shields.io/badge/Memory-Hindsight%20AI-7C3AED.svg?style=flat)](https://hindsight.vectorize.io)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248.svg?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![TypeScript](https://img.shields.io/badge/VS%20Code-TypeScript-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://code.visualstudio.com)
[![Deploy on Render](https://img.shields.io/badge/Backend-Render-46E3B7.svg?style=flat&logo=render&logoColor=black)](https://render.com)
[![Deploy on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000.svg?style=flat&logo=vercel&logoColor=white)](https://vercel.com)

---

## 💡 The Problem

Onboarding onto a complex, unfamiliar codebase is one of the most frustrating experiences in software engineering:
- **Outdated Documentation:** Internal READMEs and wikis are often stale within months.
- **Senior Developer Fatigue:** New developers constantly interrupt senior engineers for trivial architectural questions, context, and environment nuances.
- **Generic AI Fails:** Standard ChatGPT or Copilot doesn't know your private repository's architecture, forgets past conversations, and repeats basic explanations you already understand.
- **Context Window Blowup:** Dumping large multi-megabyte repositories into LLMs triggers token rate limits (`413 Request too large`) and burns expensive quotas.

## ✨ The Solution: Onboarding Buddy

**Onboarding Buddy** is an end-to-end, privacy-conscious AI onboarding mentor that connects directly to any repository. It pairs an **interactive VS Code extension** with a **modern web dashboard**, grounding every answer in your actual codebase files. 

Powered by **Groq** for instantaneous inference and **Hindsight** for dual-bank persistent memory, it **remembers what you've learned**, tracks your comprehension, designs interactive codebase quizzes, and builds collective team intelligence.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────┐          ┌──────────────────────────────────┐
│   Native VS Code Extension      │          │     Modern Vite + React Web      │
│  (Packaged .vsix / Workspace)   │          │  (Code Explorer, Quizzes, Hub)   │
└────────────────┬────────────────┘          └──────────────────┬───────────────┘
                 │                                              │
                 │ 1. Workspace Sync (Folder Tree & Signatures) │
                 ▼                                              ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Backend (Render)                            │
│  • Strict Auth Gate (GitHub OAuth / Token / Dev Login)                        │
│  • Smart Token Budgeting Engine (Zero 413 Overflow Rate Limits)              │
│  • Multi-Project Manager & Dynamic File Retrieval                             │
└───────────────┬──────────────────────┬──────────────────────┬─────────────────┘
                │                      │                      │
                ▼                      ▼                      ▼
┌─────────────────────────┐ ┌──────────────────────┐ ┌─────────────────────────┐
│     Hindsight AI        │ │    Groq Inference    │ │   MongoDB Atlas         │
│   (Dual-Bank Memory)    │ │ (Llama 3.3 / GPT-OSS)│ │   (Cloud Database)      │
├─────────────────────────┤ ├──────────────────────┤ ├─────────────────────────┤
│ • dev-<user>            │ │ • 1,500 token budget │ │ • User profiles & auth  │
│   (Personal Mastery)    │ │ • Model fallback list│ │ • Repository cache      │
│ • prj-<workspace>       │ │ • Markdown & diagram │ │ • Q&A session history   │
│   (Team Intelligence)   │ │   synthesis          │ │ • Quiz assessments      │
└─────────────────────────┘ └──────────────────────┘ └─────────────────────────┘
```

---

## 🌟 Key Features

### 1. Dual-Bank Cognitive Memory (Powered by Hindsight)
Unlike stateless chatbots that forget everything when you refresh the page:
- **Developer Personal Bank (`dev-<developer-slug>`):** Remembers which concepts you already understand (e.g. JWT authentication, DB connection lifecycle) and notes areas where you were confused. The mentor stops re-explaining mastered concepts!
- **AI Collective Project Bank (`prj-<workspace-slug>`):** Collects repository-wide architecture patterns, module relationships, and common pitfalls discovered across all team members. When a new engineer joins next month, the mentor is already armed with collective wisdom.

### 2. Smart Token Budgeting Engine (Zero 413 Errors)
- Never crashes under Groq's 8,000 Tokens-Per-Minute (TPM) on-demand limit.
- **Dynamic Keyword Relevance Scoring:** Automatically selects only the **top 2 most relevant source files** (capped at 1,800 characters each) + a 150-token folder tree outline.
- **Automatic Fallback Chain:** If the primary model (`openai/gpt-oss-120b`) is momentarily rate-limited, it automatically falls back to `llama-3.3-70b-versatile` and `llama-3.1-8b-instant`.

### 3. Interactive Codebase Quizzes
- Automatically crafts 3 multiple-choice questions derived directly from your repository's actual functions and schemas.
- Immediate evaluation with code-grounded explanations.
- Automatically calculates your mastery percentage and retains score and missed topics in your personal Hindsight memory profile!

### 4. In-Browser Code Explorer
- Expandable/collapsible folder and file hierarchy tree mirroring VS Code.
- Formatted syntax viewer with line numbers, copy buttons, and breadcrumbs.
- Switch seamlessly between synced repositories or the built-in demo workspace with a single dropdown.

### 5. Dual Workspace Synchronization
- **From VS Code:** Sync any folder on your computer using the native extension.
- **From the Browser:** Click **"Upload Project Folder"** to sync an entire local directory directly from the web dashboard.
- **Smart Filtering:** Automatically excludes heavy folders (`node_modules`, `.git`, `.venv`, `dist`, `build`, `.next`) and binary assets, storing only lightweight structural signatures (~210 KB total).

### 6. Adaptive Teaching Personas
Switch teaching styles on the fly via the custom floating popover in the prompt bar:
- 🎓 **Friendly Mentor:** Encouraging, step-by-step guidance with patient explanations.
- ⚡ **Strict Senior:** Direct, architecture-first code reviews and no-fluff answers.
- 👶 **Explain-like-I'm-5:** High-level mental models, simple analogies, and plain English.

### 7. Rich Markdown & Architecture Diagrams
- Clean GitHub Flavored Markdown (GFM) tables with zebra striping and sticky headers.
- Code blocks with language badges and one-click clipboard copying.
- ASCII box-drawing diagram detection (`ARCHITECTURE / DIAGRAM`) with non-wrapping monospace rendering.

### 8. Full Light & Dark Theme Support
- Balanced contrast in both modes. Dark charcoal text on clean off-white cards in light mode, and deep OLED backgrounds in dark mode.

---

## 📂 Project Directory Structure

```text
Onboarding-Buddy/
├── main.py                    # FastAPI Backend (REST API, Auth, Groq, Hindsight, MongoDB)
├── render.yaml                # Render Infrastructure-as-Code Blueprint
├── requirements.txt           # Python backend dependencies
├── .env.example               # Template environment configuration
├── seed.py                    # Hindsight demo memory seeder
│
├── frontend/                  # Modern Vite + React Single-Page Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthGate.jsx        # Login & landing view (OAuth, PAT, Dev Login)
│   │   │   ├── Dashboard.jsx       # Main authenticated container & mobile drawers
│   │   │   ├── ChatArea.jsx        # Mentor chat, Markdown parser & persona popover
│   │   │   ├── QuizView.jsx        # Interactive codebase quiz with score retention
│   │   │   ├── ExplorerView.jsx    # Hierarchical folder tree & code viewer
│   │   │   ├── LearningHubView.jsx # Dual-bank memory inspector & mastery stats
│   │   │   ├── MemoryPanel.jsx     # Workspace drawer & folder upload
│   │   │   └── Logo.jsx            # Animated mascot
│   │   ├── App.jsx
│   │   ├── index.css               # Complete design system (Light + Dark tokens)
│   │   └── useTheme.js             # Theme toggle hook
│   ├── vercel.json            # Vercel deployment & routing configuration
│   ├── package.json
│   └── vite.config.js
│
├── extension/                 # VS Code Extension
│   ├── src/
│   │   └── extension.ts       # Activity bar view, workspace sync & mentor chat
│   ├── onboarding-buddy-0.1.0.vsix # Pre-packaged extension installer
│   ├── package.json
│   └── tsconfig.json
│
└── sample_repo/               # Built-in fallback demo repository (5 Python modules)
```

---

## ⚡ Quick Start (Local Setup)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- MongoDB Atlas cluster (or local MongoDB)
- Groq Cloud API Key ([console.groq.com](https://console.groq.com))
- Hindsight API Key ([vectorize.io](https://vectorize.io))

---

### Step 1: Clone & Configure Backend

```powershell
# Navigate into project directory
cd Onboarding-Buddy

# Create and activate Python virtual environment
py -m venv .venv
.venv\Scripts\Activate.ps1    # On Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `Onboarding-Buddy/` root:

```env
# AI Engine
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Cognitive Memory
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io

# Cloud Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=onboarding_buddy

# App Config
FRONTEND_URL=http://localhost:5173
PORT=8000
COOKIE_SECRET=change_this_to_a_random_32_character_secret

# Optional: GitHub OAuth (You can also use Token or Dev Login without this!)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:5173/api/auth/github/callback
```

Run the backend server:

```powershell
uvicorn main:app --reload --port 8000
```

Verify backend health at: `http://127.0.0.1:8000/api/health`

---

### Step 2: Run the Vite Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.
1. Sign in via **Dev Quick Login** (enter any name), **GitHub PAT**, or **GitHub OAuth**.
2. Explore the **Mentor Chat**, take a **Code Quiz**, or inspect files in the **Code Explorer**!

---

### Step 3: Install the VS Code Extension

You don't need to run debug windows! We have pre-compiled the extension:

1. Open your regular VS Code editor.
2. Press `Ctrl + Shift + X` (open Extensions panel).
3. Click the `...` menu in the top-right corner of the Extensions panel.
4. Select **"Install from VSIX..."**.
5. Pick `Onboarding-Buddy/extension/onboarding-buddy-0.1.0.vsix`.
6. Click the new **Onboarding Buddy** book icon in your activity bar and hit **"⚡ Sign in & Sync Workspace"**!

---

## 🌐 Production Deployment Guide

### A. Deploy Backend to Render

1. Create a free account on [render.com](https://render.com).
2. Click **New ➔ Web Service** and connect your GitHub repository.
3. Configure the service settings:
   - **Root Directory:** `.` (or `Onboarding-Buddy`)
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Under **Environment Variables**, add:
   - `GROQ_API_KEY`: Your Groq API key
   - `HINDSIGHT_API_KEY`: Your Hindsight API key
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `MONGODB_DB_NAME`: `onboarding_buddy`
   - `GROQ_MODEL`: `openai/gpt-oss-120b`
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://onboarding-buddy.vercel.app`)
5. Click **Deploy**. Your backend will be live at `https://<service-name>.onrender.com`!

---

### B. Deploy Frontend to Vercel

1. Create an account on [vercel.com](https://vercel.com).
2. Click **Add New ➔ Project** and import your GitHub repository.
3. In the project setup:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click edit and select `frontend` (or `Onboarding-Buddy/frontend`).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: Your Render backend URL (e.g. `https://onboarding-buddy.onrender.com`)
5. Click **Deploy**. Vercel will build and serve your app globally on an edge CDN!

> **Tip:** In `frontend/vercel.json`, you can optionally add a direct `/api` rewrite to proxy all API requests to Render without CORS.

---

## 🔑 Environment Variables Reference

| Variable | Description | Required? | Example |
|---|---|---|---|
| `GROQ_API_KEY` | Groq Cloud API access key | **Yes** | `gsk_abc123...` |
| `GROQ_MODEL` | Primary LLM model identifier | **Yes** | `openai/gpt-oss-120b` |
| `HINDSIGHT_API_KEY` | Hindsight persistent memory key | **Yes** | `your_hindsight_key` |
| `HINDSIGHT_BASE_URL` | Hindsight endpoint URL | **Yes** | `https://api.hindsight.vectorize.io` |
| `MONGODB_URI` | MongoDB Atlas replica set URI | **Yes** | `mongodb+srv://user:pass@cluster...` |
| `MONGODB_DB_NAME` | Database collection namespace | **Yes** | `onboarding_buddy` |
| `FRONTEND_URL` | Allowed origin for production CORS | Recommended | `https://onboarding-buddy.vercel.app` |
| `PORT` | Backend listener port | Optional | `8000` |
| `GITHUB_CLIENT_ID` | OAuth app Client ID | Optional | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | OAuth app Client Secret | Optional | `d60f9e...` |
| `GITHUB_REDIRECT_URI` | OAuth authorization callback URL | Optional | `http://localhost:5173/api/auth/github/callback` |

---

## 🏆 Hackathon Judges' Summary

| Criteria | How Onboarding Buddy Delivers |
|---|---|
| **Real-World Impact** | Drastically cuts engineering ramp-up time from months to days while eliminating repetitive senior developer interruptions. |
| **Technical Innovation** | Dual-Bank cognitive memory architecture separating personal developer mastery (`dev-*`) from collective team intelligence (`prj-*`). |
| **Scalability & Engineering** | Dynamic relevance scoring and file truncation prevents token overflows (413 errors) and keeps MongoDB Atlas storage lightweight (<250 KB per repo). |
| **User Experience** | Cohesive design system supporting Light & Dark themes, interactive codebase quizzes, collapsible directory tree, and zero-install folder uploads. |
| **Production Ready** | Fully decoupled architecture ready for 1-click deployment on Render (Backend) and Vercel (Frontend). |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Built with ❤️ for the Developer Onboarding Experience.
