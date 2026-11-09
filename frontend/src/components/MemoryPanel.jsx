import React, { useRef, useState } from "react";
import {
  Brain,
  Clock,
  FileCode2,
  FolderGit2,
  History,
  Layers,
  Trash2,
  UploadCloud,
  X,
  Loader2,
} from "lucide-react";
import { apiFetch } from "../api";

export default function MemoryPanel({
  bankId,
  memories,
  filesUsed,
  projects,
  activeProject,
  onSelectProject,
  onRefreshProjects,
  onClose,
  chatHistory,
  onLoadHistoryChat,
}) {
  const hasMemories = memories && memories.length > 0;
  const hasProjects = projects && projects.length > 0;
  const hasHistory = chatHistory && chatHistory.length > 0;

  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const folderInputRef = useRef(null);

  const handleDeleteProject = async (e, project) => {
    e.stopPropagation();
    const ok = window.confirm(
      `Remove project "${project.workspace_name}" from synced projects?\n\nNote: Your personal learning progress, chat inquiries, and quiz history will be safely preserved.`
    );
    if (!ok) return;

    setDeletingId(project.project_id);
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(project.project_id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (activeProject && activeProject.project_id === project.project_id) {
          onSelectProject(null);
        }
        onRefreshProjects?.();
      } else {
        const err = await res.json();
        alert(`Delete failed: ${err.detail || "Server error"}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFolderUpload = async (event) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      const EXCLUDED_DIRS = [
        "node_modules", ".git", ".venv", "venv", "dist", "build", ".next",
        "__pycache__", ".cache", ".turbo", ".idea", ".vscode", "coverage"
      ];
      const EXCLUDED_EXTS = [
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".pdf",
        ".zip", ".tar", ".gz", ".lock", ".pyc", ".map", ".min.js", ".min.css", ".exe", ".dll"
      ];

      let workspaceName = "uploaded_project";
      const selectedFiles = {};
      let count = 0;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const relPath = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
        const parts = relPath.split("/");

        if (parts.length > 1) {
          workspaceName = parts[0];
        }

        const relativeInside = parts.slice(1).join("/") || file.name;
        const lower = relPath.toLowerCase();

        if (EXCLUDED_DIRS.some((ex) => lower.includes(`/${ex}/`) || lower.startsWith(`${ex}/`))) {
          continue;
        }
        if (EXCLUDED_EXTS.some((ext) => lower.endsWith(ext))) {
          continue;
        }
        if (file.size > 200 * 1024) continue;

        if (count >= 60) break; // Limit to 60 files

        try {
          const text = await file.text();
          selectedFiles[relativeInside] = text.slice(0, 3500);
          count++;
        } catch {
          continue;
        }
      }

      if (Object.keys(selectedFiles).length === 0) {
        alert("No readable source code files found in selected folder.");
        return;
      }

      const res = await apiFetch("/api/projects/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_name: workspaceName,
          workspace_files: selectedFiles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onRefreshProjects?.();
        alert(`Successfully synced "${workspaceName}" with ${data.file_count} files!`);
      } else {
        const err = await res.json();
        alert(`Sync failed: ${err.detail || "Server error"}`);
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        ref={folderInputRef}
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: "none" }}
        onChange={handleFolderUpload}
      />

      {/* collapsed state: three quiet glyphs */}
      <div className="rail-icons" aria-hidden="true">
        <span className="icon-btn"><Brain size={17} strokeWidth={1.6} /></span>
        <span className="icon-btn"><FolderGit2 size={17} strokeWidth={1.6} /></span>
        <span className="icon-btn"><History size={17} strokeWidth={1.6} /></span>
      </div>

      <div className="rail-body">
        {/* Mobile Header with Close Button */}
        {onClose && (
          <div className="mobile-only" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontSize: "0.88rem", color: "var(--ink)" }}>Workspace & Memory</strong>
            <button
              type="button"
              className="icon-btn close-btn"
              onClick={onClose}
              title="Close panel"
              aria-label="Close panel"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* memory bank */}
        <section className="pblock">
          <div className="pblock-head">
            <Brain size={15} strokeWidth={1.6} />
            <h3>Developer memory</h3>
            <span className="count">{hasMemories ? memories.length : 0}</span>
          </div>

          <div className="bank-id" title={bankId}>
            <span className="dot dot--up" />
            {bankId || "connecting to bank…"}
          </div>

          <div className="stack">
            {hasMemories ? (
              memories.map((memory, index) => (
                <div className="mem" key={index}>
                  {memory}
                </div>
              ))
            ) : (
              <p className="empty">
                Nothing recalled yet. Ask a question and this fills with what
                Buddy already knows about you.
              </p>
            )}
          </div>

          {filesUsed && filesUsed.length > 0 ? (
            <div className="stack" style={{ marginTop: 10 }}>
              <div className="pblock-head" style={{ marginBottom: 4 }}>
                <FileCode2 size={13} strokeWidth={1.6} />
                <h3 style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500 }}>
                  Files in last answer
                </h3>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {filesUsed.map((file, index) => (
                  <span className="chip" key={index} title={file}>
                    {file}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* projects */}
        <section className="pblock">
          <div className="pblock-head">
            <FolderGit2 size={15} strokeWidth={1.6} />
            <h3>Synced projects</h3>
            <span className="count">{hasProjects ? projects.length : 0}</span>
          </div>

          <div className="stack">
            {hasProjects
              ? projects.map((project) => {
                const selected =
                  activeProject && activeProject.project_id === project.project_id;
                const isDeleting = deletingId === project.project_id;

                return (
                  <div
                    key={project.project_id}
                    className={`prow ${selected ? "is-active" : ""}`}
                    onClick={() => onSelectProject(project)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  >
                    <div className="prow-txt" style={{ overflow: "hidden" }}>
                      <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.workspace_name}
                      </strong>
                      <span>{(project.file_paths || []).length} stored files</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {selected ? <span className="dot dot--on" /> : null}
                      <button
                        type="button"
                        className="icon-btn-danger"
                        disabled={isDeleting}
                        onClick={(e) => handleDeleteProject(e, project)}
                        title="Delete synced project (preserves knowledge)"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--ink-3)",
                          cursor: "pointer",
                          padding: "3px",
                          borderRadius: "4px",
                          display: "inline-flex",
                          alignItems: "center"
                        }}
                      >
                        {isDeleting ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })
              : null}

            <button
              type="button"
              className={`prow ${activeProject === null ? "is-active" : ""}`}
              onClick={() => onSelectProject(null)}
            >
              <Layers size={13} strokeWidth={1.6} style={{ color: "var(--ink-3)" }} />
              <div className="prow-txt">
                <strong>Demo workspace</strong>
                <span>sample_repo · 5 modules</span>
              </div>
              {activeProject === null ? <span className="dot dot--on" /> : null}
            </button>

            {/* Direct Folder Upload Button */}
            <button
              type="button"
              className="btn btn--secondary"
              disabled={isUploading}
              onClick={() => folderInputRef.current?.click()}
              style={{
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "0.78rem",
                width: "100%",
                padding: "6px 10px"
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="spin" />
                  <span>Syncing folder...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={13} />
                  <span>Upload Project Folder</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* history */}
        <section className="pblock">
          <div className="pblock-head">
            <Clock size={15} strokeWidth={1.6} />
            <h3>Previous inquiries</h3>
            <span className="count">{hasHistory ? chatHistory.length : 0}</span>
          </div>

          <div className="stack">
            {hasHistory ? (
              chatHistory.map((chat, index) => (
                <button
                  type="button"
                  key={index}
                  className="hrow"
                  onClick={() => onLoadHistoryChat && onLoadHistoryChat(chat)}
                >
                  <strong>{chat.question}</strong>
                  <span>
                    {chat.answer ? `${chat.answer.slice(0, 72)}…` : "No answer"}
                  </span>
                </button>
              ))
            ) : (
              <p className="empty">No previous questions saved yet.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
