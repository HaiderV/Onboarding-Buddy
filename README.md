# Onboarding Buddy

An AI-powered developer onboarding mentor with persistent Hindsight memory, MongoDB Atlas repository synchronization, adaptive teaching personas, and a modern Vite + React developer interface.

---

## What's New in v1.2

- **Strict Dashboard Authentication Gate:** The workspace dashboard, chat mentor, and synced code files are completely protected. Unauthenticated visitors cannot enter or use the dashboard without signing in.
- **Modern Vite + React Workspace:** Modern dark theme interface with syntax-highlighted code blocks, one-click copy buttons, rich Markdown rendering, and prompt recommendation pills.
- **Multi-Option Sign-In:**
  1. **GitHub OAuth:** Official GitHub sign-in flow.
  2. **GitHub Personal Access Token (PAT):** Instant verification directly with the GitHub API—ideal when an OAuth application is not yet registered.
  3. **Dev Quick Sign-in:** One-click workspace login for rapid local development and testing.
- **Dynamic Multi-Project Retrieval:** Automatically retrieves context files from your synced repositories stored in MongoDB Atlas, rather than only falling back to sample files.
- **Resilient Memory Engine:** Hindsight recall and retain operations handle transient network latency gracefully without breaking conversations.
- **Enhanced VS Code Extension:** Supports workspace project syncing to MongoDB, rich Markdown formatting, and custom teaching personas.

---

## Project Structure

```text
Onboarding-Buddy/
├── main.py                    # FastAPI server (API, Auth, Groq, Hindsight, MongoDB, SPA host)
├── seed.py                    # Demo developer memory bank seeder
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables (Groq, Hindsight, MongoDB, GitHub OAuth)
├── .env.example
├── frontend/                  # Modern Vite + React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthGate.jsx   # Strict login and landing view
│   │   │   ├── Dashboard.jsx  # Authenticated developer workspace
│   │   │   ├── ChatArea.jsx   # Markdown chat & code block viewer
│   │   │   └── MemoryPanel.jsx# Hindsight memory cards & synced projects
│   │   ├── App.jsx
│   │   └── index.css
│   ├── dist/                  # Production build served directly by FastAPI
│   ├── package.json
│   └── vite.config.js
├── sample_repo/               # Built-in fallback Python modules
└── extension/                 # VS Code Extension
    ├── src/extension.ts
    └── package.json
```

---

## Quick Start

### 1. Backend Setup

```powershell
cd Onboarding-Buddy
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Ensure your `.env` contains:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

HINDSIGHT_API_KEY=your_hindsight_api_key
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=onboarding_buddy

# Optional: Add for GitHub OAuth (or use PAT / Dev Login)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://127.0.0.1:8000/api/auth/github/callback

PORT=8000
```

### 2. Run the Application

```powershell
# From Onboarding-Buddy directory:
uvicorn main:app --reload --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

- You will be greeted by the **Auth Gate**.
- Choose **GitHub OAuth**, **Token (PAT)**, or **Dev Quick Login**.
- Once authenticated, you will enter the **Workspace Dashboard** with interactive mentor chat, Hindsight persistent memory, and synced project files!

### 3. Frontend Development (Optional)

If modifying the frontend:

```powershell
cd frontend
npm run dev     # Starts Vite dev server with proxy to FastAPI on port 5173
npm run build   # Compiles to frontend/dist (auto-served by FastAPI at port 8000)
```

### 4. VS Code Extension

1. Open `Onboarding-Buddy/extension` in VS Code.
2. Run `npm run compile`.
3. Press `F5` to open the Extension Development Host.
4. Click **Sign in & Sync Workspace** to synchronize all workspace files into MongoDB Atlas.
