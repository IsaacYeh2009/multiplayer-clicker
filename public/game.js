/*const button = document.getElementById("clickBtn");
const counter = document.getElementById("counter");

const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  counter.textContent = data.count;
};

button.addEventListener("click", () => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send("click");
  }
});
*/
const button = document.getElementById("clickBtn");
const counter = document.getElementById("counter");

const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

console.log("Connecting to WebSocket...");

socket.onopen = () => {
  console.log("WebSocket connected");
};

socket.onerror = (err) => {
  console.error("WebSocket error:", err);
};

socket.onmessage = (event) => {
  console.log("Message from server:", event.data);
  const data = JSON.parse(event.data);
  counter.textContent = data.count;
};

button.addEventListener("click", () => {
  console.log("Button clicked, socket state:", socket.readyState);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send("click");
    console.log("Click sent to server");
  } else {
    console.warn("WebSocket not open");
  }
});
