import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  Award,
  HelpCircle,
  CheckCircle2,
  History,
  FolderGit2,
  FileCode2,
  Cpu,
  RotateCcw,
  BookOpen,
  ArrowRight
} from "lucide-react";

export default function LearningHubView({ user, onSelectQuestion, onGoToQuiz, onBackToChat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHubData();
  }, []);

  const fetchHubData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/learning-hub");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="chat" style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
        <Brain size={38} color="#a78bfa" style={{ animation: "pulseGlow 1.5s infinite", marginBottom: "1rem" }} />
        <p style={{ color: "#f8fafc", fontSize: "1rem", fontWeight: 600 }}>Loading Learning Hub & Hindsight Banks...</p>
      </section>
    );
  }

  const devMemories = data?.dev_memories || [];
  const prjMemories = data?.prj_memories || [];
  const quizzes = data?.quizzes || [];
  const chats = data?.chat_history || [];

  const avgQuizScore = quizzes.length > 0
    ? Math.round((quizzes.reduce((acc, q) => acc + (q.score / (q.total || 1)), 0) / quizzes.length) * 100)
    : null;

  return (
    <section className="chat" style={{ overflowY: "auto", padding: "1.5rem" }}>
      {/* Header */}
      <header className="chat-head" style={{ marginBottom: "1.5rem" }}>
        <div className="ctx">
          <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Brain size={20} color="#a78bfa" />
            Developer Learning Hub & Memory
          </strong>
          <span>Dual Hindsight memory: personal developer comprehension + AI codebase intelligence</span>
        </div>
        <div className="head-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onBackToChat && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onBackToChat}
            >
              Back to chat
            </button>
          )}
          <button
            type="button"
            className="btn btn--secondary"
            onClick={fetchHubData}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCcw size={13} /> Refresh Hub
          </button>
        </div>
      </header>

      {/* Overview Stats Bar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        marginBottom: "1.75rem"
      }}>
        <div className="glass-panel" style={{ padding: "1rem", borderRadius: "10px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)", display: "block", marginBottom: "4px" }}>
            PERSONAL MEMORY BANK
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
            <strong style={{ fontSize: "0.95rem", color: "#3b82f6", fontFamily: "var(--font-mono)" }}>
              {data?.dev_bank_id || "dev-user"}
            </strong>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--ink-2)", marginTop: "4px", display: "block" }}>
            Tracks personal concepts & confusion
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "1rem", borderRadius: "10px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)", display: "block", marginBottom: "4px" }}>
            PROJECT AI KNOWLEDGE BANK
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8b5cf6" }} />
            <strong style={{ fontSize: "0.95rem", color: "#8b5cf6", fontFamily: "var(--font-mono)" }}>
              {data?.prj_bank_id || "prj-general"}
            </strong>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--ink-2)", marginTop: "4px", display: "block" }}>
            Collective codebase patterns & pitfalls
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "1rem", borderRadius: "10px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)", display: "block", marginBottom: "4px" }}>
            QUIZ PERFORMANCE
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={18} color="#f59e0b" />
            <strong style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
              {avgQuizScore !== null ? `${avgQuizScore}%` : "No tests yet"}
            </strong>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--ink-2)", marginTop: "4px", display: "block" }}>
            {quizzes.length} quiz assessment(s) taken
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "1rem", borderRadius: "10px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)", display: "block", marginBottom: "4px" }}>
            MENTOR DISCUSSIONS
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BookOpen size={18} color="#0284c7" />
            <strong style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
              {chats.length}
            </strong>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--ink-2)", marginTop: "4px", display: "block" }}>
            Codebase topics explored
          </span>
        </div>
      </div>

      {/* Dual Memory Grids */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>

        {/* Left: Personal Learning Memory */}
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--line)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Brain size={16} color="#3b82f6" />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>
                Your Learning Profile
              </h3>
            </div>
            <span className="badge badge-blue">Personal</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {devMemories.length > 0 ? (
              devMemories.map((mem, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    color: "var(--ink)",
                    lineHeight: 1.4
                  }}
                >
                  ✦ {mem}
                </div>
              ))
            ) : (
              <p style={{ fontSize: "0.82rem", color: "var(--ink-3)", padding: "12px", textAlign: "center" }}>
                Ask questions in the mentor chat to start building your personal memory profile.
              </p>
            )}
          </div>
        </div>

        {/* Right: AI Collective Project Intelligence */}
        <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--line)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={16} color="#8b5cf6" />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>
                AI Codebase Intelligence
              </h3>
            </div>
            <span className="badge badge-purple">Project Shared</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {prjMemories.length > 0 ? (
              prjMemories.map((mem, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    color: "var(--ink)",
                    lineHeight: 1.4
                  }}
                >
                  ✦ {mem}
                </div>
              ))
            ) : (
              <p style={{ fontSize: "0.82rem", color: "var(--ink-3)", padding: "12px", textAlign: "center" }}>
                As developers onboard and discuss the codebase, collective architecture patterns appear here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Quizzes & Assessments */}
      <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", marginBottom: "2rem" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--line)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={18} color="#f59e0b" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>
              Quiz Assessments
            </h3>
          </div>
          {onGoToQuiz && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onGoToQuiz}
              style={{ fontSize: "0.78rem", padding: "4px 10px" }}
            >
              Take New Quiz ➜
            </button>
          )}
        </div>

        {quizzes.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
            {quizzes.map((q, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--ink)" }}>
                    Score: {q.score} / {q.total} ({Math.round((q.score / (q.total || 1)) * 100)}%)
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--ink-2)", display: "block" }}>
                    {q.missed_topics && q.missed_topics.length > 0
                      ? `Missed: ${q.missed_topics.join(", ")}`
                      : "Perfect score!"}
                  </span>
                </div>
                <CheckCircle2 size={16} color={q.score === q.total ? "#10b981" : "#f59e0b"} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "var(--ink-3)", textAlign: "center", padding: "1rem" }}>
            No quiz attempts recorded yet. Head over to <strong>Code Quiz</strong> to test your codebase comprehension!
          </p>
        )}
      </div>

      {/* Past Questions & Inquiries */}
      <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--line)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <History size={18} color="#0284c7" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>
              Previous Learning Questions
            </h3>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>
            {chats.length} recorded inquiries
          </span>
        </div>

        {chats.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {chats.map((c, idx) => (
              <div
                key={idx}
                onClick={() => onSelectQuestion && onSelectQuestion(c)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  cursor: onSelectQuestion ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--ink)", display: "block", marginBottom: "2px" }}>
                    {c.question}
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--ink-2)" }}>
                    {c.answer ? c.answer.slice(0, 100) + "..." : ""}
                  </span>
                </div>
                {onSelectQuestion && <ArrowRight size={14} color="var(--ink-3)" />}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "var(--ink-3)", textAlign: "center", padding: "1rem" }}>
            No previous chats recorded.
          </p>
        )}
      </div>
    </section>
  );
}
