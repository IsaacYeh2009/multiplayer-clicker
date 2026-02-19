const clickBtn = document.getElementById("clickBtn");
const globalCounter = document.getElementById("globalCounter");
const clientCounter = document.getElementById("clientCounter");
const chat = document.getElementById("chat");
const chatInput = document.getElementById("chatInput");
const chatImageInput = document.getElementById("chatImageInput");
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
const MAX_IMAGE_SIZE_BYTES = 1024 * 1024;

const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

let username = prompt("Enter your username:");
if (!username) username = "Anonymous";
username = username.trim();
if (!username) username = "Anonymous";

let announcementTimeout = null;
let lastClickSentAt = 0;

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

function addChatMessage(name, message, imageDataUrl) {
  const wrapper = document.createElement("div");

  if (message) {
    const text = document.createElement("div");
    text.textContent = `${name}: ${message}`;
    wrapper.appendChild(text);
  } else {
    const label = document.createElement("div");
    label.textContent = `${name} sent an image:`;
    wrapper.appendChild(label);
  }

  if (imageDataUrl) {
    const image = document.createElement("img");
    image.src = imageDataUrl;
    image.alt = "Chat image";
    image.style.maxWidth = "100%";
    image.style.maxHeight = "140px";
    image.style.display = "block";
    image.style.marginTop = "4px";
    wrapper.appendChild(image);
  }

  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

function readSelectedImageAsDataUrl() {
  return new Promise((resolve, reject) => {
    const file = chatImageInput.files && chatImageInput.files[0];
    if (!file) {
      resolve("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("Only image files are allowed."));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      reject(new Error("Image is too large (max 1MB)."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}

async function sendChatMessage() {
  const message = chatInput.value.trim();

  let imageDataUrl;
  try {
    imageDataUrl = await readSelectedImageAsDataUrl();
  } catch (err) {
    showAdminStatus(err.message, true);
    return;
  }

  if (message === "" && !imageDataUrl) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "chat",
      message,
      image: imageDataUrl,
    })
  );

  chatInput.value = "";
  chatImageInput.value = "";
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
    addChatMessage(data.name, data.message, data.image);
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
  const now = Date.now();
  if (now - lastClickSentAt < 120) {
    return;
  }

  lastClickSentAt = now;
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
    sendChatMessage();
  }
});

sendBtn.addEventListener("click", () => {
  sendChatMessage();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/") {
    chatInput.focus();
  }
});
