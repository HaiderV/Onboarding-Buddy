"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function getBaseUrl() {
    const config = vscode.workspace.getConfiguration("onboardingBuddy");
    const url = config.get("backendUrl") || "http://127.0.0.1:8000";
    return url.replace(/\/$/, "");
}
function getChatUrl() {
    return `${getBaseUrl()}/api/chat`;
}
function getProjectSyncUrl() {
    return `${getBaseUrl()}/api/projects/sync`;
}
const EXCLUDED_FILES = "{**/.git/**,**/.venv/**,**/venv/**,**/node_modules/**,**/dist/**,**/build/**,**/.next/**,**/__pycache__/**,**/.cache/**,**/.turbo/**,**/.idea/**,**/.vscode/**,**/*.lock,**/package-lock.json,**/pnpm-lock.yaml,**/yarn.lock,**/.env,**/.env.*,**/*.pyc,**/*.map,**/*.min.js,**/*.min.css}";
class OnboardingBuddyProvider {
    extensionUri;
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    async getGitHubSession(createIfNone = false) {
        return vscode.authentication.getSession("github", ["read:user", "user:email"], { createIfNone });
    }
    async syncProject() {
        const session = await this.getGitHubSession(true);
        if (!session) {
            throw new Error("Sign in with GitHub before syncing your project.");
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.length) {
            throw new Error("Open a workspace before syncing a project.");
        }
        const workspaceName = workspaceFolders[0].name;
        const files = await vscode.workspace.findFiles("**/*.{py,js,jsx,ts,tsx,json,md,yaml,yml,toml,html,css,sql,sh,rs,go,java}", EXCLUDED_FILES, 60);
        const workspaceFiles = {};
        for (const file of files) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const relPath = vscode.workspace.asRelativePath(file).replace(/\\/g, "/");
                // Store first 3,500 characters: preserves architecture, imports, and definitions safely within quotas
                workspaceFiles[relPath] = document.getText().slice(0, 3500);
            }
            catch {
                continue;
            }
        }
        const syncUrl = getProjectSyncUrl();
        let response;
        try {
            response = await fetch(syncUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.accessToken}`
                },
                body: JSON.stringify({ workspace_name: workspaceName, workspace_files: workspaceFiles })
            });
        }
        catch {
            throw new Error(`Cannot reach the backend at ${syncUrl}. Verify your backend URL or start the server, then try again.`);
        }
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Project sync failed.");
        }
        return { workspaceName: data.workspace_name, fileCount: data.file_count };
    }
    resolveWebviewView(view) {
        view.webview.options = { enableScripts: true };
        view.webview.html = this.getHtml(view.webview);
        view.webview.onDidReceiveMessage(async (message) => {
            if (message.type === "ask") {
                await this.answerQuestion(view, message);
            }
            if (message.type === "sync") {
                try {
                    const result = await this.syncProject();
                    view.webview.postMessage({
                        type: "success",
                        text: `Synced "${result.workspaceName}" with ${result.fileCount} files.`
                    });
                }
                catch (error) {
                    const text = error instanceof Error ? error.message : String(error);
                    view.webview.postMessage({ type: "error", text });
                }
            }
        });
    }
    async getWorkspaceContext(question) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.length) {
            return {};
        }
        const files = await vscode.workspace.findFiles("**/*.{py,js,jsx,ts,tsx,json,md,yaml,yml,toml}", EXCLUDED_FILES, 40);
        const words = question.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? [];
        const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
        const scored = [];
        for (const file of files) {
            const relative = vscode.workspace.asRelativePath(file);
            let score = relative === vscode.workspace.asRelativePath(activePath ?? "") ? 5 : 0;
            const lowerRelative = relative.toLowerCase();
            for (const word of words) {
                if (lowerRelative.includes(word)) {
                    score += 4;
                }
            }
            scored.push({ file, score });
        }
        scored.sort((a, b) => b.score - a.score);
        const context = {};
        for (const item of scored.slice(0, 4)) {
            try {
                const document = await vscode.workspace.openTextDocument(item.file);
                if (document.uri.scheme === "file") {
                    const relative = vscode.workspace.asRelativePath(document.uri);
                    context[relative] = document.getText().slice(0, 20_000);
                }
            }
            catch {
                continue;
            }
        }
        return context;
    }
    async answerQuestion(view, message) {
        if (!message.question.trim()) {
            view.webview.postMessage({ type: "error", text: "Enter a question." });
            return;
        }
        try {
            const session = await this.getGitHubSession(true);
            if (!session) {
                throw new Error("Sign in with GitHub before asking the mentor.");
            }
            const workspaceFiles = await this.getWorkspaceContext(message.question);
            const chatUrl = getChatUrl();
            let response;
            try {
                response = await fetch(chatUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.accessToken}`
                    },
                    body: JSON.stringify({
                        developer_name: session.account.label,
                        persona: message.persona,
                        question: message.question,
                        workspace_files: workspaceFiles
                    })
                });
            }
            catch {
                throw new Error(`Cannot reach the backend at ${chatUrl}. Verify your backend URL or start the server, then try again.`);
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || "The mentor request failed.");
            }
            view.webview.postMessage({ type: "answer", data });
        }
        catch (error) {
            const text = error instanceof Error ? error.message : String(error);
            view.webview.postMessage({ type: "error", text });
        }
    }
    getHtml(webview) {
        const nonce = String(Date.now());
        return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
body {
  font-family: var(--vscode-font-family);
  color: var(--vscode-editorWidget-foreground);
  padding: 12px;
  margin: 0;
  box-sizing: border-box;
}
* { box-sizing: border-box; }
.header-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.btn {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  border: 0;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.btn:hover { background: var(--vscode-button-hoverBackground); }
.btn-secondary {
  background: var(--vscode-button-secondaryBackground, #3a3d41);
  color: var(--vscode-button-secondaryForeground, #fff);
}
label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--vscode-descriptionForeground);
  font-weight: 600;
}
select, textarea {
  width: 100%;
  margin-bottom: 10px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.1));
  border-radius: 4px;
  padding: 8px;
  font-family: inherit;
  font-size: 12px;
}
textarea {
  resize: vertical;
  min-height: 70px;
}
.chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 10px;
  padding-bottom: 2px;
}
.chip {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  color: var(--vscode-textLink-foreground);
}
.chip:hover {
  background: rgba(255, 255, 255, 0.12);
}
#messages {
  margin-top: 14px;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.message {
  border-left: 3px solid var(--vscode-focusBorder);
  padding: 8px 10px;
  background: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.03));
  border-radius: 0 4px 4px 0;
  overflow-wrap: break-word;
  font-size: 12.5px;
  line-height: 1.5;
}
.message.user {
  border-color: var(--vscode-textLink-foreground);
  background: rgba(59, 130, 246, 0.1);
}
.message pre {
  background: var(--vscode-textCodeBlock-background, #1e1e1e);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 8px;
  overflow-x: auto;
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 11.5px;
  margin: 6px 0;
}
.message code:not(pre code) {
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 11.5px;
}
.meta {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-top: 6px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
}
.status-pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}
</style>
</head>
<body>
<div class="header-actions">
  <button id="sync" class="btn">⚡ Sign in & Sync Workspace</button>
</div>

<label for="persona">Teaching Persona</label>
<select id="persona">
  <option>Friendly Mentor</option>
  <option>Strict Senior</option>
  <option>Explain-like-I'm-5</option>
</select>

<div class="chips">
  <div class="chip" data-q="Explain the architecture of this project">✦ Architecture</div>
  <div class="chip" data-q="How does authentication work here?">✦ Auth Flow</div>
  <div class="chip" data-q="Explain the active file and key functions">✦ Active File</div>
</div>

<label for="question">Ask Your Question</label>
<textarea id="question" placeholder="Ask about this workspace (Enter to send, Shift+Enter for newline)..."></textarea>
<button id="ask" class="btn btn-secondary">Ask Mentor ➜</button>

<div id="messages"></div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();

function formatMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Format code blocks using String.fromCharCode(96) to avoid template string escaping issues
  const tick3 = String.fromCharCode(96, 96, 96);
  const tick1 = String.fromCharCode(96);
  
  const blockRegex = new RegExp(tick3 + '([\\\\s\\\\S]*?)' + tick3, 'g');
  html = html.replace(blockRegex, '<pre><code>$1</code></pre>');

  const inlineRegex = new RegExp(tick1 + '([^' + tick1 + ']+)' + tick1, 'g');
  html = html.replace(inlineRegex, '<code>$1</code>');

  html = html.replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/\\n/g, '<br>');
  return html;
}

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('question').value = chip.getAttribute('data-q');
    document.getElementById('ask').click();
  });
});

document.getElementById('question').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('ask').click();
  }
});

document.getElementById('ask').addEventListener('click', () => {
  const question = document.getElementById('question').value.trim();
  if (!question) return;
  const persona = document.getElementById('persona').value;
  
  const userBox = document.createElement('div');
  userBox.className = 'message user';
  userBox.textContent = question;
  document.getElementById('messages').appendChild(userBox);
  
  const loadingBox = document.createElement('div');
  loadingBox.className = 'message';
  loadingBox.id = 'loading-msg';
  loadingBox.textContent = 'Analyzing workspace & recalling memories...';
  document.getElementById('messages').appendChild(loadingBox);
  
  vscode.postMessage({ type: 'ask', persona, question });
  document.getElementById('question').value = '';
});

document.getElementById('sync').addEventListener('click', () => {
  vscode.postMessage({ type: 'sync' });
});

window.addEventListener('message', event => {
  const message = event.data;
  const loading = document.getElementById('loading-msg');
  if (loading) loading.remove();

  if (message.type === 'answer') {
    const box = document.createElement('div');
    box.className = 'message';
    box.innerHTML = formatMarkdown(message.data.answer);
    
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = '<span>Files: ' + (message.data.files_used || []).join(', ') + '</span><span class="status-pill">Memory (' + (message.data.memories || []).length + ')</span>';
    box.appendChild(meta);
    document.getElementById('messages').appendChild(box);
  }
  if (message.type === 'error') {
    const box = document.createElement('div');
    box.className = 'message';
    box.style.borderLeftColor = 'var(--vscode-errorForeground)';
    box.textContent = '⚠️ ' + message.text;
    document.getElementById('messages').appendChild(box);
  }
  if (message.type === 'success') {
    const box = document.createElement('div');
    box.className = 'message';
    box.style.borderLeftColor = '#10b981';
    box.textContent = '✅ ' + message.text;
    document.getElementById('messages').appendChild(box);
  }
});
</script>
</body>
</html>`;
    }
}
function activate(context) {
    const provider = new OnboardingBuddyProvider(context.extensionUri);
    void vscode.window.showInformationMessage("Onboarding Buddy extension is active.");
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("onboardingBuddy.chat", provider));
    context.subscriptions.push(vscode.commands.registerCommand("onboardingBuddy.open", () => vscode.commands.executeCommand("workbench.view.extension.onboardingBuddy")));
    context.subscriptions.push(vscode.commands.registerCommand("onboardingBuddy.signIn", async () => {
        const session = await vscode.authentication.getSession("github", ["read:user", "user:email"], { createIfNone: true });
        if (session) {
            void vscode.window.showInformationMessage(`Signed in to Onboarding Buddy as ${session.account.label}.`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("onboardingBuddy.syncProject", async () => {
        try {
            const result = await provider.syncProject();
            void vscode.window.showInformationMessage(`Synced "${result.workspaceName}" with ${result.fileCount} files.`);
        }
        catch (error) {
            const text = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(text);
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map