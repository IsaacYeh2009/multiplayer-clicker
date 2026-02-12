const clickBtn = document.getElementById("clickBtn");
const globalCounter = document.getElementById("globalCounter");
const clientCounter = document.getElementById("clientCounter");
const chat = document.getElementById("chat");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const leaderboard = document.getElementById("leaderboard");

const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

let username = prompt("Enter your username:");
if (!username) username = "Anonymous";


function renderLeaderboard(entries) {
  leaderboard.innerHTML = "";

  if (!entries || entries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No players yet";
    leaderboard.appendChild(li);
    return;
  }

  entries.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name}: ${entry.score}`;
    leaderboard.appendChild(li);
  });
}

socket.onopen = () => {
  socket.send(JSON.stringify({
    type: "setName",
    name: username
  }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "init") {
    globalCounter.textContent = data.globalCount;
    clientCounter.textContent = data.score;
    renderLeaderboard(data.leaderboard);
  }

  if (data.type === "global") {
    globalCounter.textContent = data.count;
  }

  if (data.type === "score") {
    clientCounter.textContent = data.score;
    renderLeaderboard(data.leaderboard);
  }

  if (data.type === "leaderboard") {
    renderLeaderboard(data.entries);
  }

  if (data.type === "chat") {
    const div = document.createElement("div");
    div.textContent = `${data.name}: ${data.message}`;
    chat.appendChild(div);
  }
};

clickBtn.addEventListener("click", () => {
  socket.send(JSON.stringify({ type: "click" }));
});

sendBtn.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (msg !== "") {
    socket.send(JSON.stringify({
      type: "chat",
      message: msg
    }));
    chatInput.value = "";
  }
});
