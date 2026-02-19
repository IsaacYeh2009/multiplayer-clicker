const clickBtn = document.getElementById("clickBtn");
const globalCounter = document.getElementById("globalCounter");
const clientCounter = document.getElementById("clientCounter");
const chat = document.getElementById("chat");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const leaderboard = document.getElementById("leaderboard");
const announcementBar = document.getElementById("announcementBar");
const adminContainer = document.getElementById("adminContainer");
const adminGlobalInput = document.getElementById("adminGlobalInput");
const adminSetGlobalBtn = document.getElementById("adminSetGlobalBtn");
const adminAnnouncementInput = document.getElementById(
  "adminAnnouncementInput"
);
const adminAnnouncementBtn = document.getElementById("adminAnnouncementBtn");
const adminStatus = document.getElementById("adminStatus");

const ADMIN_USERNAME = "bruh";

const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

let username = prompt("Enter your username:");
if (!username) username = "Anonymous";
username = username.trim();
if (!username) username = "Anonymous";

let announcementTimeout = null;

function renderLeaderboard(entries) {
  leaderboard.innerHTML = "";

  if (!entries || entries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No players yet";
    leaderboard.appendChild(li);
    return;
  }

  entries.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name}: ${entry.score}`;
    leaderboard.appendChild(li);
  });
}

function setAdminMode(enabled) {
  adminContainer.hidden = !enabled;
}

function showAdminStatus(message, isError = false) {
  adminStatus.textContent = message;
  adminStatus.style.color = isError ? "#ff8080" : "#9bd79b";
}

function showAnnouncement(message) {
  announcementBar.textContent = message;
  announcementBar.hidden = false;

  if (announcementTimeout) {
    clearTimeout(announcementTimeout);
  }

  announcementTimeout = setTimeout(() => {
    announcementBar.hidden = true;
    announcementBar.textContent = "";
  }, 4000);
}

socket.onopen = () => {
  socket.send(
    JSON.stringify({
      type: "setName",
      name: username,
    })
  );

  if (username.toLowerCase() === ADMIN_USERNAME) {
    const password = prompt("Admin password:");
    if (password !== null) {
      socket.send(
        JSON.stringify({
          type: "adminAuth",
          password,
        })
      );
    }
  }
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "init") {
    globalCounter.textContent = data.globalCount;
    clientCounter.textContent = data.score;
    renderLeaderboard(data.leaderboard);
    setAdminMode(Boolean(data.isAdmin));
  }

  if (data.type === "global") {
    globalCounter.textContent = data.count;
  }

  if (data.type === "score") {
    clientCounter.textContent = data.score;
    renderLeaderboard(data.leaderboard);
  }

  if (data.type === "leaderboard") {
    renderLeaderboard(data.entries);
  }

  if (data.type === "chat") {
    const div = document.createElement("div");
    div.textContent = `${data.name}: ${data.message}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  if (data.type === "adminStatus") {
    setAdminMode(Boolean(data.isAdmin));
    showAdminStatus(data.message, !data.isAdmin);
  }

  if (data.type === "adminError") {
    showAdminStatus(data.message, true);
  }

  if (data.type === "announcement") {
    showAnnouncement(`ADMIN: ${data.message}`);
  }
};

clickBtn.addEventListener("click", () => {
  socket.send(JSON.stringify({ type: "click" }));
});

adminSetGlobalBtn.addEventListener("click", () => {
  const count = adminGlobalInput.value;
  socket.send(
    JSON.stringify({
      type: "adminSetGlobal",
      count,
    })
  );
});

adminAnnouncementBtn.addEventListener("click", () => {
  const message = adminAnnouncementInput.value.trim();
  if (message === "") {
    showAdminStatus("Message cannot be empty.", true);
    return;
  }

  socket.send(
    JSON.stringify({
      type: "adminAnnouncement",
      message,
    })
  );

  adminAnnouncementInput.value = "";
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const msg = chatInput.value.trim();
    if (msg !== "") {
      socket.send(JSON.stringify({ type: "chat", message: msg }));
      chatInput.value = "";
    }
  }
});

sendBtn.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (msg !== "") {
    socket.send(
      JSON.stringify({
        type: "chat",
        message: msg,
      })
    );
    chatInput.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/") {
    chatInput.focus();
  }
});
