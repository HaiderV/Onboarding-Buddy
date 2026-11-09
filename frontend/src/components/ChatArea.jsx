import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Menu,
  PanelRight,
  RotateCcw,
  FileCode2,
  Check,
  Copy,
  Terminal,
} from "lucide-react";
import { marked } from "marked";
import Logo from "./Logo";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDiagram =
    !language ||
    language.toLowerCase() === "text" ||
    language.toLowerCase() === "ascii" ||
    code.includes("┌") ||
    code.includes("├") ||
    code.includes("└") ||
    code.includes("│") ||
    code.includes("──") ||
    code.includes("-->") ||
    code.includes("+--") ||
    code.includes("|   |");

  const displayLang = isDiagram
    ? "Architecture / Diagram"
    : (language || "Code").toUpperCase();

  return (
    <div className={`chat-code-block ${isDiagram ? "chat-code-block--diagram" : ""}`}>
      <div className="chat-code-header">
        <span className="chat-code-lang">
          <Terminal size={12} strokeWidth={1.8} style={{ opacity: 0.7 }} />
          {displayLang}
        </span>
        <button
          type="button"
          className="chat-code-copy"
          onClick={handleCopy}
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} color="#10b981" strokeWidth={2.2} />
              <span style={{ color: "#10b981" }}>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} strokeWidth={1.8} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="chat-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownMessage({ content }) {
  if (!content) return null;

  // Split by fenced code blocks: ```lang\ncode\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = content.slice(lastIndex, match.index);
      if (textChunk.trim()) {
        segments.push({ type: "text", value: textChunk });
      }
    }
    segments.push({
      type: "code",
      language: match[1]?.trim() || "",
      value: match[2]?.replace(/\r?\n$/, "") || "",
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const textChunk = content.slice(lastIndex);
    if (textChunk.trim()) {
      segments.push({ type: "text", value: textChunk });
    }
  }

  if (segments.length === 0) {
    segments.push({ type: "text", value: content });
  }

  return (
    <div className="markdown-body">
      {segments.map((seg, i) => {
        if (seg.type === "code") {
          return <CodeBlock key={i} language={seg.language} code={seg.value} />;
        }
        try {
          const html = marked.parse(seg.value);
          return (
            <div
              key={i}
              className="markdown-text-chunk"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <div key={i} className="markdown-text-chunk">{seg.value}</div>;
        }
      })}
    </div>
  );
}

function initials(user) {
  const source = user?.name || user?.login || "U";
  const words = source.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return (words[0]?.[0] || "U") + (words[1]?.[0] || "");
}

const PERSONA_CONFIG = {
  "Friendly Mentor": {
    icon: "🎓",
    badge: "Friendly",
    desc: "Supportive, guided explanations & step-by-step code",
    color: "#10b981",
  },
  "Strict Senior": {
    icon: "⚡",
    badge: "Senior",
    desc: "Direct, architecture-first review & blunt efficiency",
    color: "#f59e0b",
  },
  "Explain-like-I'm-5": {
    icon: "👶",
    badge: "ELI5",
    desc: "Simple analogies, plain English & mental models",
    color: "#38bdf8",
  },
};

export default function ChatArea({
  messages,
  onSendMessage,
  isLoading,
  activePersona,
  setActivePersona,
  personas,
  activeProject,
  onClearChat,
  onOpenNav,
  onOpenPanel,
  user,
}) {
  const [draft, setDraft] = useState("");
  const [personaOpen, setPersonaOpen] = useState(false);
  const threadRef = useRef(null);
  const boxRef = useRef(null);
  const personaRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (personaRef.current && !personaRef.current.contains(e.target)) {
        setPersonaOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft]);

  const send = () => {
    const question = draft.trim();
    if (!question || isLoading) return;
    onSendMessage(question);
    setDraft("");
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const projectName = activeProject?.workspace_name || "Demo workspace";
  const projectMeta = activeProject
    ? `${(activeProject.file_paths || []).length} files synced`
    : "sample_repo · deliberate python";

  return (
    <section className="chat">
      <header className="chat-head">
        <button
          type="button"
          className="icon-btn mobile-only"
          onClick={onOpenNav}
          aria-label="Open navigation"
        >
          <Menu size={17} strokeWidth={1.7} />
        </button>

        <div className="ctx">
          <strong>{projectName}</strong>
          <span>{projectMeta}</span>
        </div>

        <div className="head-actions">
          <button type="button" className="btn btn--ghost" onClick={onClearChat}>
            <RotateCcw size={13} strokeWidth={1.8} />
            New chat
          </button>
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={onOpenPanel}
            aria-label="Open memory panel"
          >
            <PanelRight size={17} strokeWidth={1.7} />
          </button>
        </div>
      </header>

      <div className="thread" ref={threadRef}>
        <div className="thread-inner">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <article key={index} className={`msg ${isUser ? "msg--user" : "msg--assistant"}`}>
                <div className="msg-ava">
                  {isUser ? (
                    user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      initials(user)
                    )
                  ) : (
                    <Logo size={16} variant="mono" />
                  )}
                </div>

                <div className="msg-body">
                  <div className="msg-meta">
                    <span>{isUser ? "You" : "Onboarding Buddy"}</span>
                    {!isUser && message.persona ? (
                      <span className="persona">{message.persona}</span>
                    ) : null}
                  </div>

                  <div className="msg-text">
                    <MarkdownMessage content={message.content || ""} />
                  </div>

                  {!isUser && message.files_used?.length > 0 ? (
                    <div className="msg-files">
                      {message.files_used.map((file, i) => (
                        <span className="chip" key={i} title={file}>
                          <FileCode2 size={11} strokeWidth={1.8} />
                          {file}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}

          {isLoading ? (
            <article className="msg msg--assistant">
              <div className="msg-ava">
                <Logo size={16} variant="mono" />
              </div>
              <div className="msg-body">
                <div className="msg-meta">
                  <span>Onboarding Buddy</span>
                </div>
                <div className="typing" aria-label="Thinking">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </article>
          ) : null}
        </div>
      </div>

      <div className="composer-wrap">
        <div className="composer-inner">
          <div className="composer">
            <textarea
              ref={boxRef}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about the codebase, a file, or how something works…"
              aria-label="Your question"
            />

            <div className="composer-bar">
              <div className="persona-picker-wrapper" ref={personaRef}>
                <button
                  type="button"
                  className={`persona-trigger ${personaOpen ? "is-open" : ""}`}
                  onClick={() => setPersonaOpen((open) => !open)}
                  title="Select AI Mentor Persona"
                  aria-expanded={personaOpen}
                >
                  <span className="persona-trigger-icon">
                    {PERSONA_CONFIG[activePersona]?.icon || "🎓"}
                  </span>
                  <span className="persona-trigger-name">{activePersona}</span>
                  <ChevronDown
                    size={13}
                    strokeWidth={2}
                    className={`persona-trigger-chevron ${personaOpen ? "is-open" : ""}`}
                  />
                </button>

                {personaOpen && (
                  <div className="persona-popover">
                    <div className="persona-popover-title">CHOOSE MENTOR VIBE</div>
                    {personas.map((persona) => {
                      const cfg = PERSONA_CONFIG[persona] || { icon: "💬", desc: "" };
                      const isSelected = activePersona === persona;
                      return (
                        <button
                          key={persona}
                          type="button"
                          className={`persona-item ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            setActivePersona(persona);
                            setPersonaOpen(false);
                          }}
                        >
                          <span className="persona-item-icon">{cfg.icon}</span>
                          <div className="persona-item-content">
                            <div className="persona-item-header">
                              <strong>{persona}</strong>
                              {isSelected && <span className="persona-active-badge">Active</span>}
                            </div>
                            <p>{cfg.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="send"
                onClick={send}
                disabled={!draft.trim() || isLoading}
                aria-label="Send message"
              >
                <ArrowUp size={16} strokeWidth={2.1} />
              </button>
            </div>
          </div>

          <p className="composer-hint">
            <kbd>Enter</kbd> to send · <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
          </p>
        </div>
      </div>
    </section>
  );
}
