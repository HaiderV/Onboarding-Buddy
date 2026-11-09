import React, { useState } from "react";
import { 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Brain, 
  FileCode2, 
  ArrowRight,
  Award
} from "lucide-react";
import { apiFetch } from "../api";

export default function QuizView({ activeProject, onQuizCompleted }) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [savedToMemory, setSavedToMemory] = useState(false);
  const [error, setError] = useState(null);

  const projectName = activeProject?.workspace_name || "Active Workspace";

  const generateQuiz = async () => {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setSelectedAnswers({});
    setSubmitted(false);
    setSavedToMemory(false);

    try {
      const res = await apiFetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: activeProject ? activeProject.project_id : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate quiz.");
      if (!data.questions || data.questions.length === 0) {
        throw new Error("Could not extract enough code context for questions. Try syncing your workspace files.");
      }
      setQuestions(data.questions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId, optionIdx) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    let correctCount = 0;
    const missedTopics = [];

    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.answer_index) {
        correctCount += 1;
      } else {
        missedTopics.push(q.file || q.question);
      }
    });

    setScore(correctCount);
    setSubmitted(true);

    // Retain quiz result in Hindsight memory
    try {
      await apiFetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: activeProject ? activeProject.project_id : null,
          score: correctCount,
          total: questions.length,
          missed_topics: missedTopics,
        }),
      });
      setSavedToMemory(true);
      if (onQuizCompleted) onQuizCompleted();
    } catch {
      // Ignored
    }
  };

  return (
    <section className="chat" style={{ overflowY: "auto", padding: "1.5rem" }}>
      <header className="chat-head" style={{ marginBottom: "1.5rem" }}>
        <div className="ctx">
          <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <HelpCircle size={18} color="#38bdf8" />
            Codebase Knowledge Check
          </strong>
          <span>Interactive quiz generated directly from your synced project code</span>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={generateQuiz}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Sparkles size={14} />
            <span>{loading ? "Generating Quiz..." : "New Project Quiz"}</span>
          </button>
        </div>
      </header>

      {error && (
        <div style={{
          background: "rgba(244, 63, 94, 0.12)",
          border: "1px solid rgba(244, 63, 94, 0.3)",
          color: "#fda4af",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "1.25rem",
          fontSize: "0.88rem"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Initial Empty State */}
      {questions.length === 0 && !loading && !error && (
        <div className="blank" style={{ marginTop: "2rem" }}>
          <div className="blank-ico" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
            <Award size={28} />
          </div>
          <h2>Test your knowledge on {projectName}</h2>
          <p style={{ maxWidth: "480px", margin: "0 auto 1.5rem auto" }}>
            Generate 3 AI-crafted questions based on your actual repository files. 
            Your score and missed concepts will be retained in your <strong>Hindsight memory bank</strong> so your mentor adapts future explanations.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={generateQuiz}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Sparkles size={16} /> Start Code Quiz
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--ink-3)" }}>
          <Brain size={36} color="#3b82f6" style={{ animation: "pulseGlow 1.5s infinite", marginBottom: "1rem" }} />
          <p style={{ fontSize: "0.95rem", color: "var(--ink)", fontWeight: 600 }}>
            Analyzing {projectName} code & generating questions...
          </p>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>Budgeted token request via Groq AI</span>
        </div>
      )}

      {/* Questions List */}
      {questions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "800px" }}>
          {questions.map((q, qIdx) => {
            const hasSelected = selectedAnswers[q.id] !== undefined;
            return (
              <div
                key={q.id}
                className="glass-panel"
                style={{
                  padding: "1.25rem 1.5rem",
                  border: "1px solid var(--line)",
                  borderRadius: "12px"
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem"
                }}>
                  <span className="badge badge-blue">Question {qIdx + 1} of {questions.length}</span>
                  {q.file && (
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-3)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <FileCode2 size={13} /> {q.file}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ink)", marginBottom: "1rem", lineHeight: 1.4 }}>
                  {q.question}
                </h3>

                {/* Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[q.id] === optIdx;
                    const isCorrect = q.answer_index === optIdx;

                    let bg = "var(--bg-sunken)";
                    let border = "1px solid var(--line)";
                    let textColor = "var(--ink)";

                    if (isSelected && !submitted) {
                      bg = "rgba(59, 130, 246, 0.15)";
                      border = "1px solid #3b82f6";
                      textColor = "var(--ink)";
                    }

                    if (submitted) {
                      if (isCorrect) {
                        bg = "rgba(16, 185, 129, 0.15)";
                        border = "1px solid #10b981";
                        textColor = "#10b981";
                      } else if (isSelected && !isCorrect) {
                        bg = "rgba(244, 63, 94, 0.15)";
                        border = "1px solid #f43f5e";
                        textColor = "#f43f5e";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        style={{
                          textAlign: "left",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: bg,
                          border: border,
                          color: textColor,
                          fontSize: "0.88rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: submitted ? "default" : "pointer"
                        }}
                      >
                        <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                        {submitted && isCorrect && <CheckCircle2 size={16} color="#10b981" />}
                        {submitted && isSelected && !isCorrect && <XCircle size={16} color="#f43f5e" />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation on submit */}
                {submitted && q.explanation && (
                  <div style={{
                    marginTop: "1rem",
                    padding: "10px 12px",
                    background: "var(--bg-sunken)",
                    borderLeft: "3px solid #3b82f6",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    color: "var(--ink-2)",
                    lineHeight: 1.4
                  }}>
                    <strong style={{ color: "#3b82f6" }}>Explanation: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit / Score Action */}
          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {!submitted ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSubmitQuiz}
                disabled={Object.keys(selectedAnswers).length < questions.length}
                style={{
                  padding: "10px 20px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>Submit Answers</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                width: "100%",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Award size={24} color="#f59e0b" />
                  <div>
                    <strong style={{ fontSize: "1.1rem", color: "#fff" }}>
                      Score: {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
                    </strong>
                    <p style={{ fontSize: "0.78rem", color: savedToMemory ? "#10b981" : "var(--text-muted)" }}>
                      {savedToMemory ? "✓ Result retained in Hindsight memory bank" : "Evaluating result..."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={generateQuiz}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <RotateCcw size={14} /> Retake / New Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

