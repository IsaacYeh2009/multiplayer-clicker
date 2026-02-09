console.log("script.js loaded");

const button = document.getElementById("clickBtn");
const counter = document.getElementById("counter");

const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

socket.onopen = () => {
  console.log("WebSocket connected");
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  counter.textContent = data.count;
};

button.addEventListener("click", () => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send("click");
  }
});
