import { Router } from "express";
import { userStore } from "../store";

const router = Router();

router.post("/login", async (req, res) => {
  const username = req.body?.username?.trim();
  const password = req.body?.password?.trim();
  const hwid = req.body?.hwid?.trim();
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }
  const user = await userStore.verify(username, password);
  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  // Check HWID device lock if enabled
  if (user.hwidLockEnabled) {
    const clientHwid = hwid || "unknown_device";
    if (!user.hwid) {
      await userStore.setHwid(user.username, clientHwid);
      user.hwid = clientHwid;
    } else if (user.hwid !== clientHwid) {
      return res.status(403).json({
        success: false,
        error: "HWID_MISMATCH",
        message: "Account locked to another device. Please contact administration to reset your hardware key."
      });
    }
  }

  return res.json({
    success: true,
    username: user.username,
    role: user.role,
    defaultDays: user.defaultDays,
    isTrial: user.isTrial,
    canResell: user.canResell ?? false,
    displayName: user.displayName || user.username,
    avatar: user.avatar || "",
  });
});

router.post("/profile", async (req, res) => {
  const { username, displayName, avatar } = req.body ?? {};
  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }
  try {
    const ok = await userStore.updateProfile(username, displayName || "", avatar || "");
    if (!ok) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.json({ success: true, displayName, avatar });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

router.get("/profile/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const user = await userStore.find(username);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.json({
      success: true,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "",
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
});

router.post("/update-key", async (req, res) => {
  const { username, currentPassword, newPassword } = req.body ?? {};
  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }
  try {
    const user = await userStore.verify(username, currentPassword);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid current password" });
    }
    const ok = await userStore.updatePassword(username, newPassword);
    if (!ok) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to update security key" });
  }
});

export default router;
