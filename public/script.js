const clickBtn = document.getElementById("clickBtn");
const globalCounter = document.getElementById("globalCounter");
const clientCounter = document.getElementById("clientCounter");
const chat = document.getElementById("chat");
const chatInput = document.getElementById("chatInput");
const chatMediaInput = document.getElementById("chatMediaInput");
const sendBtn = document.getElementById("sendBtn");
const leaderboard = document.getElementById("leaderboard");
const announcementBar = document.getElementById("announcementBar");
const adminContainer = document.getElementById("adminContainer");
const adminGlobalInput = document.getElementById("adminGlobalInput");
const adminSetGlobalBtn = document.getElementById("adminSetGlobalBtn");
const adminAnnouncementInput = document.getElementById("adminAnnouncementInput");
const adminAnnouncementBtn = document.getElementById("adminAnnouncementBtn");
const adminStatus = document.getElementById("adminStatus");

const ADMIN_USERNAME = "bruh";
const MAX_IMAGE_SIZE_BYTES = 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 8 * 1024 * 1024;

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

function addChatMessage(name, message, imageDataUrl, videoDataUrl) {
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

  if (videoDataUrl) {
    const video = document.createElement("video");
    video.src = videoDataUrl;
    video.controls = true;
    video.style.maxWidth = "100%";
    video.style.maxHeight = "170px";
    video.style.display = "block";
    video.style.marginTop = "4px";
    wrapper.appendChild(video);
  }

  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

function readSelectedMediaAsDataUrl() {
  return new Promise((resolve, reject) => {
    const file = chatMediaInput.files && chatMediaInput.files[0];
    if (!file) {
      resolve({ imageDataUrl: "", videoDataUrl: "" });
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      reject(new Error("Only image and video files are allowed."));
      return;
    }

    if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
      reject(new Error("Image is too large (max 1MB)."));
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
      reject(new Error("Video is too large (max 8MB)."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve({
        imageDataUrl: isImage ? value : "",
        videoDataUrl: isVideo ? value : "",
      });
    };
    reader.onerror = () => reject(new Error("Failed to read selected file."));
    reader.readAsDataURL(file);
  });
}

async function sendChatMessage() {
  const message = chatInput.value.trim();

  let imageDataUrl;
  let videoDataUrl;
  try {
    const media = await readSelectedMediaAsDataUrl();
    imageDataUrl = media.imageDataUrl;
    videoDataUrl = media.videoDataUrl;
  } catch (err) {
    showAdminStatus(err.message, true);
    return;
  }

  if (message === "" && !imageDataUrl && !videoDataUrl) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "chat",
      message,
      image: imageDataUrl,
      video: videoDataUrl,
    })
  );

  chatInput.value = "";
  chatMediaInput.value = "";
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
    addChatMessage(data.name, data.message, data.image, data.video);
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
