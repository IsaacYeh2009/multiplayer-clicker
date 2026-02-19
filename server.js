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
    } catch (err) {
      console.error("Invalid JSON received:", msg.toString());
      return;
    }

    console.log("Received:", data);

    if (data.type === "setName") {
      ws.username = String(data.name || "Anonymous").trim() || "Anonymous";
      ws.isAdmin = false;
      broadcastLeaderboard();
      return;
    }

    if (data.type === "adminAuth") {
      const normalizedName = ws.username.toLowerCase();
      const password = String(data.password || "");

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

    if (data.type === "click") {
      globalCount += 1;
      ws.score += 1;

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

    if (data.type === "adminSetGlobal") {
      if (!ws.isAdmin) {
        return;
      }

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

    if (data.type === "adminAnnouncement") {
      if (!ws.isAdmin) {
        return;
      }

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

    if (data.type === "chat") {
      const message = String(data.message || "").trim();
      const image = String(data.image || "").trim();

      if (!message && !image) {
        return;
      }

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "chat",
              name: ws.username,
              message,
              image,
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
