/*const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let count = 0;

// Serve static files (index.html, script.js, style.css)
app.use(express.static(path.join(__dirname, "public")));

// WebSocket logic
wss.on("connection", (ws) => {
  // Send current count when someone connects
  ws.send(JSON.stringify({ count }));

  ws.on("message", () => {
    count++;

    // Broadcast updated count to everyone
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ count }));
      }
    });
  });
});
*/
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

  ws.on("message", (msg) => {
    console.log("Received message:", msg.toString());

    count++;

    // Broadcast updated count to everyone
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ count }));
      }
    });
  });
});

// ✅ DECLARE PORT ONCE
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

