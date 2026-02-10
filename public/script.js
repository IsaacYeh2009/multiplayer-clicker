const button = document.getElementById("clickBtn");
const globalCounter = document.getElementById("globalCounter");
const clientCounter = document.getElementById("clientCounter");
const chat = document.getElementById("chat");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

let username = prompt("Enter your username:");
if (!username) username = "Anonymous";

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
  }

  if (data.type === "global") {
    globalCounter.textContent = data.count;
  }

  if (data.type === "score") {
    clientCounter.textContent = data.score;
  }

  if (data.type === "chat") {
    const div = document.createElement("div");
    div.textContent = `${data.name}: ${data.message}`;
    chat.appendChild(div);
  }
};

button.addEventListener("click", () => {
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
