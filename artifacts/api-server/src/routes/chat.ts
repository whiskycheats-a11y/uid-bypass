import { Router } from "express";
import { chatStore, userStore, verifyPassword, sessionStore } from "../store";
import { config } from "../config";

const router = Router();

// Get recent messages
router.get("/", async (req, res) => {
  const sessionToken = req.cookies?.auth_token;
  
  let isAuthorized = false;
  if (sessionToken) {
    const session = sessionStore.get(sessionToken);
    if (session) {
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
  const sessionToken = req.cookies?.auth_token;
  const { message } = req.body ?? {};

  if (!message || !message.trim()) {
    res.status(400).json({ success: false, error: "Message cannot be empty" });
    return;
  }

  let isAuthorized = false;
  let username = "";
  let displayName = "";
  let avatar = "";

  if (sessionToken) {
    const session = sessionStore.get(sessionToken);
    if (session) {
      username = session.username;
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
