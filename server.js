const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let globalCount = 0;

app.use(express.static(path.join(__dirname, "public")));

function buildLeaderboard() {
  const scoresByName = new Map();

  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    const name = client.username || "Anonymous";
    const score = Number(client.score) || 0;
    scoresByName.set(name, (scoresByName.get(name) || 0) + score);
  });

  return [...scoresByName.entries()]
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function broadcastLeaderboard() {
  const entries = buildLeaderboard();

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "leaderboard",
        entries,
      }));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Per-client data
  ws.score = 0;
  ws.username = "Anonymous";

  // Send initial state
  ws.send(JSON.stringify({
    type: "init",
    globalCount,
    score: ws.score,
    leaderboard: buildLeaderboard(),
  }));

  ws.on("message", (msg) => {
    let data;

    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.error("Invalid JSON received:", msg.toString());
      return;
    }

    console.log("Received:", data);

    // Set username
    if (data.type === "setName") {
      ws.username = data.name || "Anonymous";
      broadcastLeaderboard();
      return;
    }

    // Global + per-client click
    if (data.type === "click") {
      globalCount++;
      ws.score++;

      // Send global count to everyone
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "global",
            count: globalCount,
          }));
        }
      });

      // Send personal score only to this client
      ws.send(JSON.stringify({
        type: "score",
        score: ws.score,
        leaderboard: buildLeaderboard(),
      }));

      broadcastLeaderboard();
    }

    // Chat
    if (data.type === "chat") {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "chat",
            name: ws.username,
            message: data.message,
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    broadcastLeaderboard();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
