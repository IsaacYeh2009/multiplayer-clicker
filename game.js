const scoreText = document.getElementById("score");
const button = document.getElementById("btn");

// Connect to WebSocket server
const socket = new WebSocket(`ws://${location.host}`);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  scoreText.textContent = "Score: " + data.score;
};

button.onclick = () => {
  socket.send("click");
};
