alert("script.js loaded");

const button = document.getElementById("clickBtn");
const counter = document.getElementById("counter");

const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

console.log("Connecting to WebSocket...");

socket.onopen = () => {
  console.log("WebSocket connected");
};

button.addEventListener("click", () => {
  alert("Button click detected in JS");

  if (socket.readyState === WebSocket.OPEN) {
    socket.send("click");
    console.log("Click sent");
  }
});
