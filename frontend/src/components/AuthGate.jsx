import React, { useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  FolderGit2,
  Github,
  Info,
  Key,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import Logo from "./Logo";
import { apiFetch, apiUrl } from "../api";

const PRESETS = ["Alex (Frontend)", "Sarah (Backend)", "Jordan (Lead)"];

const TABS = [
  { id: "github", label: "GitHub", icon: Github },
  { id: "token", label: "Token", icon: Key },
  { id: "dev", label: "Dev quick", icon: Terminal },
];

export default function AuthGate({ onAuthSuccess, providersInfo }) {
  const [activeTab, setActiveTab] = useState("github");
  const [token, setToken] = useState("");
  const [devName, setDevName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGitHubOAuth = () => {
    window.location.href = apiUrl("/api/auth/github/login");
  };

  const handleTokenLogin = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Please enter a GitHub Personal Access Token.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/token-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (e) => {
    e.preventDefault();
    if (!devName.trim()) {
      setError("Please enter a developer name to sign in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developer_name: devName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Dev sign-in failed");
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (id) => {
    setActiveTab(id);
    setError(null);
  };

  return (
    <div className="auth" style={{ position: "relative" }}>
      <div className="auth-grid">
        {/* intro */}
        <div className="auth-intro">
          <div className="auth-brand">
            <Logo size={34} title="Onboarding Buddy" />
            <strong>Onboarding Buddy</strong>
            <span className="ver">v1.2</span>
          </div>

          <h1>
            Learn a codebase
            <br />
            the way a <em>mentor</em>
            <br />
            would teach it.
          </h1>

          <p className="lede">
            A persistent AI mentor for your repository. It adapts to your pace,
            remembers what you have already worked through with{" "}
            <strong>Hindsight</strong>, and grounds every answer in the files you
            actually sync.
          </p>

          <div className="feats">
            <div className="feat">
              <Brain size={17} strokeWidth={1.5} />
              <div>
                <strong>Persistent memory</strong>
                <p>
                  What you have covered stays covered. Buddy does not repeat
                  itself, and it circles back on the parts that confused you.
                </p>
              </div>
            </div>
            <div className="feat">
              <FolderGit2 size={17} strokeWidth={1.5} />
              <div>
                <strong>Your actual code</strong>
                <p>
                  Reads the files synced from your VS Code extension, so answers
                  cite your modules rather than generic examples.
                </p>
              </div>
            </div>
            <div className="feat">
              <Sparkles size={17} strokeWidth={1.5} />
              <div>
                <strong>Three mentoring styles</strong>
                <p>
                  Friendly Mentor, Strict Senior, or Explain-like-I'm-5 — switch
                  per conversation from the composer.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* card */}
        <div className="auth-card">
          <div className="auth-card-head">
            <ShieldCheck size={17} strokeWidth={1.6} />
            <strong>Sign in to your workspace</strong>
            <span className="tag">secure access</span>
          </div>

          <p className="sub">
            Your projects, memory bank and chat history unlock once you are
            signed in.
          </p>

          <div className="seg" role="tablist" aria-label="Sign-in method">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  type="button"
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => switchTab(tab.id)}
                >
                  <Icon size={13} strokeWidth={1.7} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ height: 16 }} />

          {error ? (
            <div className="error-line" role="alert">
              <Info size={14} strokeWidth={1.8} style={{ flex: "none", marginTop: 1 }} />
              <span>{error}</span>
            </div>
          ) : null}

          {activeTab === "github" ? (
            <div className="auth-form">
              <p className="sub" style={{ margin: 0 }}>
                Sign in with GitHub. This is the same session the VS Code
                extension uses.
              </p>

              <button type="button" className="btn btn--primary btn--block" onClick={handleGitHubOAuth}>
                <Github size={16} strokeWidth={1.8} />
                Continue with GitHub
              </button>

              {!providersInfo?.github_oauth_configured ? (
                <div className="notice">
                  <Info size={14} strokeWidth={1.8} />
                  <div>
                    GitHub OAuth credentials <code>GITHUB_CLIENT_ID</code> are not
                    set in <code>.env</code> yet. Use <strong>Token</strong> or{" "}
                    <strong>Dev quick</strong> to get in now.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "token" ? (
            <form className="auth-form" onSubmit={handleTokenLogin}>
              <div className="field">
                <label htmlFor="pat">GitHub personal access token</label>
                <input
                  id="pat"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                />
                <span className="help">
                  Needs the <code>read:user</code> scope to verify your identity.
                </span>
              </div>

              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? "Verifying…" : "Sign in with token"}
                {loading ? null : <ArrowRight size={15} strokeWidth={1.9} />}
              </button>
            </form>
          ) : null}

          {activeTab === "dev" ? (
            <form className="auth-form" onSubmit={handleDevLogin}>
              <div className="field">
                <label htmlFor="dev">Developer workspace name</label>
                <div className="auth-presets">
                  {PRESETS.map((preset) => (
                    <button type="button" key={preset} onClick={() => setDevName(preset)}>
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  id="dev"
                  type="text"
                  placeholder="Your name or dev handle"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  autoComplete="off"
                />
                <span className="help">
                  Creates a local workspace keyed to this name — useful for demos.
                </span>
              </div>

              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? "Initialising…" : "Enter workspace"}
                {loading ? null : <ArrowRight size={15} strokeWidth={1.9} />}
              </button>
            </form>
          ) : null}

          <div className="auth-foot">
            <Check size={13} strokeWidth={2} />
            Memory and project persistence is on (MongoDB Atlas + Hindsight)
          </div>
        </div>
      </div>

      <div className="auth-page-foot">
        Onboarding Buddy <span>·</span> FastAPI, Groq, Hindsight, MongoDB Atlas
      </div>
    </div>
  );
}
