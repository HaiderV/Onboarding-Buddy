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
const BACKEND_URL = "http://127.0.0.1:8000/api/chat";
const EXCLUDED_FILES = "{**/.git/**,**/.venv/**,**/venv/**,**/node_modules/**,**/dist/**,**/build/**,**/.env,**/.env.*}";
class OnboardingBuddyProvider {
    extensionUri;
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    resolveWebviewView(view) {
        view.webview.options = { enableScripts: true };
        view.webview.html = this.getHtml(view.webview);
        view.webview.onDidReceiveMessage(async (message) => {
            if (message.type === "ask") {
                await this.answerQuestion(view, message);
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
        if (!message.developerName.trim() || !message.question.trim()) {
            view.webview.postMessage({ type: "error", text: "Enter your name and a question." });
            return;
        }
        try {
            const workspaceFiles = await this.getWorkspaceContext(message.question);
            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    developer_name: message.developerName,
                    persona: message.persona,
                    question: message.question,
                    workspace_files: workspaceFiles
                })
            });
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
body{font-family:var(--vscode-font-family);color:var(--vscode-editorWidget-foreground);padding:12px}
label{display:block;margin-bottom:8px;font-size:12px}input,select,textarea,button{box-sizing:border-box;width:100%;margin-top:5px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);padding:8px}
textarea{resize:vertical;min-height:70px}button{background:var(--vscode-button-background);color:var(--vscode-button-foreground);cursor:pointer;border:0;margin-top:8px;padding:9px}
#messages{margin-top:14px;max-height:calc(100vh - 300px);overflow:auto}.message{white-space:pre-wrap;border-left:3px solid var(--vscode-focusBorder);padding:7px 10px;margin-bottom:10px;overflow-wrap:anywhere}.user{border-color:var(--vscode-textLink-foreground)}.meta{font-size:11px;color:var(--vscode-descriptionForeground);margin-top:8px}
</style>
</head>
<body>
<label>Developer name<input id="name" value="Demo Developer"></label>
<label>Persona<select id="persona"><option>Friendly Mentor</option><option>Strict Senior</option><option>Explain-like-I'm-5</option></select></label>
<label>Question<textarea id="question" placeholder="Ask about the open workspace..."></textarea></label>
<button id="ask">Ask mentor</button>
<div id="messages"></div>
<script nonce="${nonce}">
const vscode=acquireVsCodeApi();
document.getElementById("ask").addEventListener("click",()=>{
  const question=document.getElementById("question").value.trim();
  if(!question)return;
  const name=document.getElementById("name").value;
  const persona=document.getElementById("persona").value;
  document.getElementById("messages").insertAdjacentHTML("beforeend","<div class='message user'>"+question.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</div>");
  vscode.postMessage({type:"ask",developerName:name,persona,question});
  document.getElementById("question").value="";
});
window.addEventListener("message",event=>{
  const message=event.data;
  if(message.type==="answer"){
    const box=document.createElement("div");box.className="message";
    box.textContent=message.data.answer;
    const meta=document.createElement("div");meta.className="meta";
    meta.textContent="Files: "+(message.data.files_used||[]).join(", ")+" | Memory: "+message.data.memories.length+" item(s)";
    box.appendChild(meta);document.getElementById("messages").appendChild(box);
  }
  if(message.type==="error"){const box=document.createElement("div");box.className="message";box.textContent=message.text;document.getElementById("messages").appendChild(box);}
});
</script>
</body>
</html>`;
    }
}
function activate(context) {
    const provider = new OnboardingBuddyProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("onboardingBuddy.chat", provider));
    context.subscriptions.push(vscode.commands.registerCommand("onboardingBuddy.open", () => vscode.commands.executeCommand("workbench.view.extension.onboardingBuddy")));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map