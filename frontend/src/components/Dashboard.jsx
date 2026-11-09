import React, { useState } from "react";
import {
  Brain,
  FolderGit2,
  HelpCircle,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  X,
} from "lucide-react";
import ChatArea from "./ChatArea";
import MemoryPanel from "./MemoryPanel";
import QuizView from "./QuizView";
import ExplorerView from "./ExplorerView";
import LearningHubView from "./LearningHubView";
import Logo from "./Logo";
import { apiFetch } from "../api";

const NAV = [
  { id: "chat", label: "Mentor Chat", icon: MessageSquare },
  { id: "quiz", label: "Code Quiz", icon: HelpCircle },
  { id: "explorer", label: "Code Explorer", icon: FolderGit2 },
  { id: "memory", label: "Learning Hub", icon: Brain },
];

function isUp(value) {
  if (value === true) return true;
  if (!value) return false;
  let s = value;
  if (typeof s === "object") {
    s = s.status || s.state || "";
  }
  return ["ok", "up", "healthy", "connected", "ready"].includes(
    String(s || "").toLowerCase()
  );
}

function statusRows(healthInfo) {
  if (!healthInfo) {
    return [
      { label: "Backend", up: null },
      { label: "MongoDB", up: null },
      { label: "Groq", up: null },
    ];
  }
  const mongo = healthInfo.mongodb ?? healthInfo.mongodb_atlas ?? healthInfo.db;
  const engine = healthInfo.groq ?? healthInfo.llm ?? healthInfo.engine;
  return [
    { label: "Backend", up: isUp(healthInfo.status), raw: healthInfo.status },
    { label: "MongoDB", up: isUp(mongo), raw: mongo },
    { label: "Groq", up: isUp(engine), raw: engine },
  ];
}

export default function Dashboard({
  user,
  onLogout,
  dashboardData,
  onRefreshDashboard,
  healthInfo,
  theme,
  onToggleTheme,
}) {
  const [activeView, setActiveView] = useState("chat");
  const [activePersona, setActivePersona] = useState("Friendly Mentor");
  const [activeProject, setActiveProject] = useState(
    dashboardData?.projects?.[0] || null
  );
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello ${user.name || user.login}. Welcome to Onboarding Buddy.\n\nI am your mentor for this codebase. I can read the files synced from your workspace and I remember what we have already covered. Ask me how a module fits together, what a function is for, or why something is written the way it is.`,
      persona: "Friendly Mentor",
      files_used: [],
    },
  ]);
  const [memories, setMemories] = useState([]);
  const [bankId, setBankId] = useState(
    `developer-${(user.name || user.login || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}`
  );
  const [filesUsed, setFilesUsed] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [navOpen, setNavOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const personas = ["Friendly Mentor", "Strict Senior", "Explain-like-I'm-5"];

  const handleSendMessage = async (question) => {
    const newMessages = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developer_name: user.name || user.login,
          persona: activePersona,
          question,
          project_id: activeProject ? activeProject.project_id : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Mentor request failed");

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.answer,
          persona: activePersona,
          files_used: data.files_used || [],
        },
      ]);

      if (data.memories) setMemories(data.memories);
      if (data.bank_id) setBankId(data.bank_id);
      if (data.files_used) setFilesUsed(data.files_used);

      onRefreshDashboard();
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `Something went wrong: ${err.message}`,
          persona: activePersona,
          files_used: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Fresh session for ${user.name || user.login}. What would you like to look at?`,
        persona: activePersona,
        files_used: [],
      },
    ]);
  };

  const handleLoadHistoryChat = (chat) => {
    setMessages([
      ...messages,
      { role: "user", content: chat.question },
      {
        role: "assistant",
        content: chat.answer,
        persona: chat.persona || activePersona,
        files_used: chat.files_used || [],
      },
    ]);
    setActiveView("chat");
    setPanelOpen(false);
  };

  const selectView = (id) => {
    setActiveView(id);
    setNavOpen(false);
  };

  const rows = statusRows(healthInfo);

  return (
    <div className="app">
      {/* Mobile drawer backdrop */}
      {(navOpen || panelOpen) && (
        <div
          className="mobile-backdrop is-visible"
          onClick={() => {
            setNavOpen(false);
            setPanelOpen(false);
          }}
          aria-label="Close menu"
        />
      )}

      {/* ---------------- left rail ---------------- */}
      <aside className={`rail rail--left ${navOpen ? "is-open" : ""}`}>
        <div className="rail-inner">
          <div className="brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Logo size={30} title="Onboarding Buddy" />
              <div className="brand-text rail-label">
                <strong>Onboarding Buddy</strong>
                <span>v1.2</span>
              </div>
            </div>
            {navOpen && (
              <button
                type="button"
                className="icon-btn mobile-only close-btn"
                onClick={() => setNavOpen(false)}
                title="Close navigation"
                aria-label="Close navigation"
              >
                <X size={17} strokeWidth={2} />
              </button>
            )}
          </div>

          <nav className="nav" aria-label="Workspace">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`nav-item ${activeView === item.id ? "is-active" : ""}`}
                  onClick={() => selectView(item.id)}
                  aria-current={activeView === item.id ? "page" : undefined}
                  title={item.label}
                >
                  <Icon size={18} strokeWidth={1.6} />
                  <span className="rail-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="rail-spacer" />

          <div className="rail-group rail-label">Workspace</div>

          {rows.map((row) => (
            <div
              className="status-row"
              key={row.label}
              title={row.raw ? String(row.raw) : "no data from /api/health"}
            >
              <span
                className={`dot ${row.up === null ? "dot--unknown" : row.up ? "dot--up" : "dot--down"
                  }`}
              />
              <span className="rail-label">{row.label}</span>
              <span className="status-val rail-label">
                {row.up === null ? "…" : row.up ? "online" : "unknown"}
              </span>
            </div>
          ))}

          <button
            type="button"
            className="nav-item"
            onClick={onToggleTheme}
            title="Switch appearance"
            style={{ marginTop: 4 }}
          >
            {theme === "dark" ? (
              <Sun size={18} strokeWidth={1.6} />
            ) : (
              <Moon size={18} strokeWidth={1.6} />
            )}
            <span className="rail-label">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          <div className="user-card">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" />
            ) : (
              <span className="ava">
                {(user.name || user.login || "U").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="who rail-label">
              <strong>{user.name || user.login}</strong>
              <span>{user.login ? `@${user.login}` : "signed in"}</span>
            </div>
            <button
              type="button"
              className="icon-btn rail-label"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={14} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- centre ---------------- */}
      {activeView === "chat" && (
        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          activePersona={activePersona}
          setActivePersona={setActivePersona}
          personas={personas}
          activeProject={activeProject}
          onClearChat={handleClearChat}
          onOpenNav={() => setNavOpen((open) => !open)}
          onOpenPanel={() => setPanelOpen((open) => !open)}
          user={user}
        />
      )}

      {activeView === "quiz" && (
        <QuizView
          activeProject={activeProject}
          onQuizCompleted={onRefreshDashboard}
        />
      )}

      {activeView === "explorer" && (
        <ExplorerView
          activeProject={activeProject}
          projects={dashboardData?.projects || []}
          onSelectProject={(project) => setActiveProject(project)}
          onRefreshProjects={onRefreshDashboard}
        />
      )}

      {activeView === "memory" && (
        <LearningHubView
          user={user}
          onSelectQuestion={handleLoadHistoryChat}
          onGoToQuiz={() => selectView("quiz")}
          onBackToChat={() => selectView("chat")}
        />
      )}

      {/* ---------------- right rail ---------------- */}
      <aside className={`rail rail--right ${panelOpen ? "is-open" : ""}`}>
        <MemoryPanel
          bankId={bankId}
          memories={memories}
          filesUsed={filesUsed}
          projects={dashboardData?.projects || []}
          activeProject={activeProject}
          onSelectProject={(project) => {
            setActiveProject(project);
            setPanelOpen(false);
          }}
          onRefreshProjects={onRefreshDashboard}
          onClose={() => setPanelOpen(false)}
          chatHistory={dashboardData?.chat_history || []}
          onLoadHistoryChat={handleLoadHistoryChat}
        />
      </aside>
    </div>
  );
}
