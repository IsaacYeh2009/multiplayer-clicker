const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let globalScore = 0;

// Serve static files
app.use(express.static("public"));

// WebSocket logic
wss.on("connection", (ws) => {
  console.log("Player connected");

  // Send current score to new player
  ws.send(JSON.stringify({ score: globalScore }));

  ws.on("message", () => {
    globalScore++;

    // Broadcast updated score to all players
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ score: globalScore }));
      }
    });
  });

  ws.on("close", () => {
    console.log("Player disconnected");
  });
});

// Start server
server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
