import { Router } from "express";
import { chatStore, userStore, verifyPassword, sessionStore } from "../store";
import { config } from "../config";

const router = Router();

// Get recent messages
router.get("/", async (req, res) => {
  const username = req.headers["x-username"] as string;
  const password = req.headers["x-password"] as string;
  const sessionToken = req.headers["x-session-token"] as string;
  
  if (!username) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  let isAuthorized = false;
  if (sessionToken) {
    const session = sessionStore.get(sessionToken);
    if (session && session.username === username) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized && password) {
    const user = await userStore.verify(username, password);
    if (user || (username === config.ADMIN_USERNAME && verifyPassword(password, config.ADMIN_PASSWORD))) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
    // Purge old chats dynamically on load
    await chatStore.purgeOldChats().catch(() => {});
    const messages = await chatStore.list(50);
    res.json({ success: true, messages });
    return;
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to load messages" });
    return;
  }
});

// Purge periodically on server side
setInterval(() => {
  chatStore.purgeOldChats().catch(() => {});
}, 60 * 60 * 1000); // Every hour

// Post a message
router.post("/", async (req, res) => {
  const username = req.headers["x-username"] as string;
  const password = req.headers["x-password"] as string;
  const sessionToken = req.headers["x-session-token"] as string;
  const { message } = req.body ?? {};

  if (!username) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  if (!message || !message.trim()) {
    res.status(400).json({ success: false, error: "Message cannot be empty" });
    return;
  }

  let isAuthorized = false;
  let displayName = username;
  let avatar = "";

  if (sessionToken) {
    const session = sessionStore.get(sessionToken);
    if (session && session.username === username) {
      const user = await userStore.find(username);
      if (user) {
        displayName = user.displayName || user.username;
        avatar = user.avatar || "";
        isAuthorized = true;
      } else if (session.role === "admin") {
        displayName = username;
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized && password) {
    // Authenticate user or admin
    const user = await userStore.verify(username, password);
    if (user) {
      displayName = user.displayName || user.username;
      avatar = user.avatar || "";
      isAuthorized = true;
    } else {
      // Admin check
      const isAdmin = username === config.ADMIN_USERNAME && verifyPassword(password, config.ADMIN_PASSWORD);
      if (isAdmin) {
        displayName = "ADMIN";
        isAuthorized = true;
      } else {
        // Check if it's dynamic admin configured username
        const sysAdmin = await userStore.find(username);
        if (sysAdmin && sysAdmin.role === "admin" && verifyPassword(password, sysAdmin.password)) {
          displayName = sysAdmin.displayName || sysAdmin.username;
          avatar = sysAdmin.avatar || "";
          isAuthorized = true;
        }
      }
    }
  }

  if (!isAuthorized) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
    const chat = await chatStore.add(username, displayName, avatar, message.trim());
    res.json({ success: true, chat });
    return;
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to send message" });
    return;
  }
});

export default router;
