// Get elements from the page
const button = document.getElementById("clickBtn");
const counter = document.getElementById("counter");

// Choose correct WebSocket protocol (ws for local, wss for Render/HTTPS)
const protocol = location.protocol === "https:" ? "wss" : "ws";

// Connect to the SAME host that served the page
const socket = new WebSocket(`${protocol}://${location.host}`);

// When we receive data from the server
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  counter.textContent = data.count;
};

// When the button is clicked, tell the server
button.addEventListener("click", () => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send("click");
  }
});
