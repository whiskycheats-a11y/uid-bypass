import { Router } from "express";
import { chatStore, userStore, verifyPassword } from "../store";
import { config } from "../config";

const router = Router();

// Get recent messages
router.get("/", async (req, res) => {
  const username = req.headers["x-username"] as string;
  const password = req.headers["x-password"] as string;
  
  if (!username || !password) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  // Simple authentication validation
  const user = await userStore.verify(username, password);
  if (!user && username !== config.ADMIN_USERNAME) {
    // Also support checking admin key directly
    const isAdmin = verifyPassword(password, config.ADMIN_PASSWORD);
    if (!isAdmin) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
  } else if (username === config.ADMIN_USERNAME && !verifyPassword(password, config.ADMIN_PASSWORD)) {
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
  const { message } = req.body ?? {};

  if (!username || !password) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  if (!message || !message.trim()) {
    res.status(400).json({ success: false, error: "Message cannot be empty" });
    return;
  }

  // Authenticate user or admin
  const user = await userStore.verify(username, password);
  let displayName = username;
  let avatar = "";

  if (user) {
    displayName = user.displayName || user.username;
    avatar = user.avatar || "";
  } else {
    // Admin check
    const isAdmin = username === config.ADMIN_USERNAME && verifyPassword(password, config.ADMIN_PASSWORD);
    if (!isAdmin) {
      // Check if it's dynamic admin configured username
      const sysAdmin = await userStore.find(username);
      if (sysAdmin && sysAdmin.role === "admin" && verifyPassword(password, sysAdmin.password)) {
        displayName = sysAdmin.displayName || sysAdmin.username;
        avatar = sysAdmin.avatar || "";
      } else {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
    } else {
      displayName = "ADMIN";
      avatar = "";
    }
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
