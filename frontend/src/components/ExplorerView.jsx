import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  FolderGit2, 
  Folder, 
  FolderOpen, 
  FileCode2, 
  Copy, 
  Check, 
  FileText,
  ChevronRight,
  ChevronDown,
  UploadCloud,
  Trash2,
  Loader2,
} from "lucide-react";

export default function ExplorerView({ activeProject, projects = [], onSelectProject, onRefreshProjects }) {
  const [files, setFiles] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const folderInputRef = useRef(null);

  const projectId = activeProject?.project_id || "sample_repo";
  const projectName = activeProject?.workspace_name || "sample_repo";
  const isDemoProject = !activeProject || projectId === "sample_repo";

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const fetchFiles = async () => {
    setLoading(true);
    setFiles({});
    setSelectedFile(null);

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`);
      if (res.ok) {
        const data = await res.json();
        const rawFiles = data.files || {};
        const loadedFiles = {};
        Object.entries(rawFiles).forEach(([k, v]) => {
          loadedFiles[k.replace(/\\/g, "/")] = v;
        });

        setFiles(loadedFiles);
        const fileNames = Object.keys(loadedFiles);
        if (fileNames.length > 0) {
          setSelectedFile(fileNames[0]);
        }

        const initialExpanded = {};
        fileNames.forEach((f) => {
          const parts = f.split("/");
          if (parts.length > 1) {
            initialExpanded[parts[0]] = true;
          }
        });
        setExpandedFolders(initialExpanded);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!selectedFile || !files[selectedFile]) return;
    navigator.clipboard.writeText(files[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleDeleteProject = async () => {
    if (isDemoProject) return;
    const ok = window.confirm(
      `Remove project "${projectName}" from synced projects?\n\nNote: Your personal learning progress, chat inquiries, and quiz history will be safely preserved.`
    );
    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onSelectProject?.(null);
        onRefreshProjects?.();
      } else {
        const err = await res.json();
        alert(`Delete failed: ${err.detail || "Server error"}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
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

        if (count >= 60) break;

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

      const res = await fetch("/api/projects/sync", {
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
        alert(`Successfully synced project "${workspaceName}" with ${data.file_count} files!`);
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

  // Build hierarchical folder/file tree
  const tree = useMemo(() => {
    const root = { files: [], dirs: {} };

    Object.keys(files).forEach((filePath) => {
      const parts = filePath.split("/");
      let current = root;

      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        if (!current.dirs[dirName]) {
          current.dirs[dirName] = { files: [], dirs: {}, path: parts.slice(0, i + 1).join("/") };
        }
        current = current.dirs[dirName];
      }

      current.files.push({
        name: parts[parts.length - 1],
        fullPath: filePath,
      });
    });

    return root;
  }, [files]);

  // Recursive tree renderer
  const renderTree = (node, depth = 0) => {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Directories */}
        {Object.entries(node.dirs)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([dirName, subNode]) => {
            const isExpanded = expandedFolders[subNode.path] !== false;
            return (
              <div key={subNode.path}>
                <button
                  type="button"
                  onClick={() => toggleFolder(subNode.path)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "4px 8px",
                    paddingLeft: `${depth * 14 + 8}px`,
                    background: "transparent",
                    border: "none",
                    color: "var(--ink)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  {isExpanded ? <ChevronDown size={14} color="var(--ink-2)" /> : <ChevronRight size={14} color="var(--ink-2)" />}
                  {isExpanded ? <FolderOpen size={14} color="#f59e0b" /> : <Folder size={14} color="#f59e0b" />}
                  <span>{dirName}</span>
                </button>

                {isExpanded && renderTree(subNode, depth + 1)}
              </div>
            );
          })}

        {/* Files */}
        {node.files
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((f) => {
            const isSelected = selectedFile === f.fullPath;
            return (
              <button
                key={f.fullPath}
                type="button"
                onClick={() => setSelectedFile(f.fullPath)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "4px 8px",
                  paddingLeft: `${depth * 14 + 18}px`,
                  borderRadius: "4px",
                  background: isSelected ? "var(--bg-active)" : "transparent",
                  border: isSelected ? "1px solid var(--line-strong)" : "none",
                  color: isSelected ? "var(--ink)" : "var(--ink-2)",
                  fontSize: "0.8rem",
                  fontWeight: isSelected ? 600 : 400,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  margin: "1px 0",
                  overflow: "hidden",
                }}
              >
                <FileCode2 size={13} color={isSelected ? "#3b82f6" : "var(--ink-3)"} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </span>
              </button>
            );
          })}
      </div>
    );
  };

  const fileCount = Object.keys(files).length;

  return (
    <section className="chat" style={{ display: "grid", gridTemplateColumns: "270px 1fr", height: "100%", overflow: "hidden" }}>
      <input
        type="file"
        ref={folderInputRef}
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: "none" }}
        onChange={handleFolderUpload}
      />

      {/* File Tree Panel */}
      <div style={{
        borderRight: "1px solid var(--line)",
        background: "var(--bg-sunken)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}>
        {/* Project Header */}
        <div style={{
          padding: "0.85rem 1rem",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
              <FolderGit2 size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
              <strong style={{ fontSize: "0.85rem", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {projectName}
              </strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="badge badge-blue" style={{ fontSize: "0.68rem" }}>
                {fileCount} files
              </span>
              {!isDemoProject && (
                <button
                  type="button"
                  className="icon-btn-danger"
                  disabled={isDeleting}
                  onClick={handleDeleteProject}
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
                  {isDeleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                </button>
              )}
            </div>
          </div>

          {/* Project Switcher Selector */}
          {projects && projects.length > 0 && (
            <select
              value={activeProject ? activeProject.project_id : "sample_repo"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "sample_repo") {
                  onSelectProject?.(null);
                } else {
                  const p = projects.find((x) => x.project_id === val);
                  if (p) onSelectProject?.(p);
                }
              }}
              style={{
                width: "100%",
                fontSize: "0.78rem",
                padding: "5px 8px",
                background: "var(--bg-elev)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                borderRadius: "6px",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="sample_repo">📁 Demo workspace (sample_repo)</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  📦 {p.workspace_name} ({(p.file_paths || []).length} files)
                </option>
              ))}
            </select>
          )}

          {/* Direct Folder Upload Button */}
          <button
            type="button"
            className="btn btn--secondary"
            disabled={isUploading}
            onClick={() => folderInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "0.76rem",
              padding: "5px 10px",
              width: "100%"
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

        {/* Tree Container */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {loading ? (
            <div style={{ padding: "1rem", fontSize: "0.8rem", color: "var(--ink-3)", textAlign: "center" }}>
              Loading project tree...
            </div>
          ) : fileCount === 0 ? (
            <div style={{ padding: "1rem", fontSize: "0.8rem", color: "var(--ink-3)", textAlign: "center" }}>
              No files indexed in this project yet. Use "Upload Project Folder" or the VS Code extension to sync!
            </div>
          ) : (
            renderTree(tree)
          )}
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <header className="chat-head" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="ctx">
            <strong style={{ color: "var(--ink)" }}>{selectedFile || "Select a file to inspect"}</strong>
            <span style={{ color: "var(--ink-2)" }}>
              {selectedFile && files[selectedFile]
                ? `${files[selectedFile].split("\n").length} lines • ${files[selectedFile].length} characters`
                : "Browse files using the hierarchy tree on the left"}
            </span>
          </div>
          {selectedFile && files[selectedFile] && (
            <div className="head-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleCopy}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}
              >
                {copied ? <><Check size={13} color="#10b981" /> Copied</> : <><Copy size={13} /> Copy Code</>}
              </button>
            </div>
          )}
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: "1rem", background: "var(--code-bg)" }}>
          {selectedFile && files[selectedFile] ? (
            <pre style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "0.84rem",
              lineHeight: 1.6,
              color: "var(--ink)",
              whiteSpace: "pre",
            }}>
              <code>{files[selectedFile]}</code>
            </pre>
          ) : (
            <div className="blank" style={{ marginTop: "4rem" }}>
              <div className="blank-ico" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}>
                <FileText size={26} />
              </div>
              <h2 style={{ color: "var(--ink)" }}>Select a file to read</h2>
              <p style={{ color: "var(--ink-2)" }}>Explore the project files and folders synced to your workspace.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
