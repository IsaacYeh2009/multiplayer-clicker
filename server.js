const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const ADMIN_USERNAME = "bruh";
const ADMIN_PASSWORD = "1234";

let globalCount = 0;

app.use(express.static(path.join(__dirname, "public")));

function buildLeaderboard() {
  const scoresByName = new Map();

  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;

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
      client.send(
        JSON.stringify({
          type: "leaderboard",
          entries,
        })
      );
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.score = 0;
  ws.username = "Anonymous";
  ws.isAdmin = false;

  // Send initial state
  ws.send(
    JSON.stringify({
      type: "init",
      globalCount,
      score: ws.score,
      leaderboard: buildLeaderboard(),
      isAdmin: ws.isAdmin,
    })
  );

  ws.on("message", (msg) => {
    let data;

    try {
      data = JSON.parse(msg);
    } catch {
      console.error("Invalid JSON:", msg.toString());
      return;
    }

    console.log("Received:", data);

    // Set username
    if (data.type === "setName") {
      ws.username = String(data.name || "Anonymous").trim() || "Anonymous";
      ws.isAdmin = false;
      broadcastLeaderboard();
      return;
    }

    // Admin auth
    if (data.type === "adminAuth") {
      const password = String(data.password || "");
      const normalizedName = ws.username.toLowerCase();

      if (normalizedName === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        ws.isAdmin = true;
        ws.send(
          JSON.stringify({
            type: "adminStatus",
            isAdmin: true,
            message: "Admin mode enabled.",
          })
        );
      } else {
        ws.isAdmin = false;
        ws.send(
          JSON.stringify({
            type: "adminStatus",
            isAdmin: false,
            message: "Invalid admin password.",
          })
        );
      }
      return;
    }

    // CLICK (FIXED: increments ONCE)
    if (data.type === "click") {
      globalCount++;
      ws.score++;

      // Send global count to everyone
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "global",
              count: globalCount,
            })
          );
        }
      });

      // Send personal score to clicking client
      ws.send(
        JSON.stringify({
          type: "score",
          score: ws.score,
          leaderboard: buildLeaderboard(),
        })
      );

      broadcastLeaderboard();
      return;
    }

    // Admin: set global
    if (data.type === "adminSetGlobal") {
      if (!ws.isAdmin) return;

      const nextCount = Number(data.count);
      if (!Number.isFinite(nextCount) || nextCount < 0) {
        ws.send(
          JSON.stringify({
            type: "adminError",
            message: "Global count must be 0 or greater.",
          })
        );
        return;
      }

      globalCount = Math.floor(nextCount);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "global",
              count: globalCount,
            })
          );
        }
      });
      return;
    }

    // Admin announcement
    if (data.type === "adminAnnouncement") {
      if (!ws.isAdmin) return;

      const message = String(data.message || "").trim();
      if (!message) {
        ws.send(
          JSON.stringify({
            type: "adminError",
            message: "Message cannot be empty.",
          })
        );
        return;
      }

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "announcement",
              message,
            })
          );
        }
      });
      return;
    }

    // Chat
    if (data.type === "chat") {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "chat",
              name: ws.username,
              message: data.message,
            })
          );
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
