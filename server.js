const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let count = 0;

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// WebSocket logic
wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send current count to new client
  ws.send(JSON.stringify({ count }));

  // Per-client data
  ws.score = 0;
  ws.username = "Anonymous";

  // Send initial state
  ws.send(JSON.stringify({
    type: "init",
    score: ws.score
  }));
  
  ws.on("message", (msg) => {
    console.log("Received message:", msg.toString());
    
    // Broadcast updated count to everyone
    count++;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ count }));
      }
    });
    
    // Set username
    const data = JSON.parse(msg);
    if (data.type === "setName") {
      ws.username = data.name;
      return;
    }

    // Click = increase ONLY this client's score
    if (data.type === "click") {
      ws.score++;

      ws.send(JSON.stringify({
        type: "score",
        score: ws.score
      }));
    }
    
    // Chat message
    if (data.type === "chat") {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "chat",
            name: ws.username,
            message: data.message
          }));
        }
      });
    }
  });

  ws.on("close", () => {
      console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

