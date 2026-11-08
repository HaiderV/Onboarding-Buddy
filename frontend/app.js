const form = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const nameInput = document.getElementById("developerName");
const personaInput = document.getElementById("persona");
const questionInput = document.getElementById("question");
const sendButton = document.getElementById("sendButton");
const memoryList = document.getElementById("memoryList");
const bankLabel = document.getElementById("bankLabel");
const filesList = document.getElementById("filesList");

function addMessage(role, content) {
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "YOU" : "OB";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  // Text is inserted safely; backend Markdown is displayed as readable plain text.
  bubble.textContent = content;
  row.append(avatar, bubble);
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return row;
}

function renderMemories(memories) {
  memoryList.replaceChildren();
  if (!memories || memories.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No relevant memories were recalled yet.";
    memoryList.appendChild(empty);
    return;
  }
  memories.forEach(memory => {
    const item = document.createElement("div");
    item.className = "memory-item";
    item.textContent = memory;
    memoryList.appendChild(item);
  });
}

function renderFiles(files) {
  filesList.replaceChildren();
  if (!files || files.length === 0) {
    filesList.textContent = "None";
    return;
  }
  files.forEach(file => {
    const chip = document.createElement("span");
    chip.className = "file-chip";
    chip.textContent = file;
    filesList.appendChild(chip);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const developer_name = nameInput.value.trim();
  const question = questionInput.value.trim();
  if (!developer_name || !question) {
    alert("Please enter your developer name and a question.");
    return;
  }

  addMessage("user", question);
  questionInput.value = "";
  sendButton.disabled = true;
  sendButton.textContent = "Thinking...";
  const loading = addMessage("assistant", "I'm checking your learning memories and reading the relevant code...");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        developer_name,
        persona: personaInput.value,
        question
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Request failed");
    loading.querySelector(".bubble").textContent = data.answer;
    renderMemories(data.memories);
    renderFiles(data.files_used);
    bankLabel.textContent = `Memory bank: ${data.bank_id}`;
  } catch (error) {
    loading.querySelector(".bubble").textContent = `Sorry, something went wrong: ${error.message}`;
  } finally {
    sendButton.disabled = false;
    sendButton.innerHTML = 'Send <span>➜</span>';
    questionInput.focus();
  }
});
