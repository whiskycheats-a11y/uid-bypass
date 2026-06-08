import { Router } from "express";
import { userStore, sessionStore, loginGuard, verifyPassword } from "../store";
import { config } from "../config";
import { logger } from "../lib/logger";
import { verifyTurnstileToken } from "../lib/turnstile";

const router = Router();

async function checkVpn(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.") || ip === "::1") return false;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=proxy,hosting`);
    const data = await res.json() as any;
    return data.proxy || data.hosting || false;
  } catch {
    return false;
  }
}

router.post("/login", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
  const hwid = typeof req.body?.hwid === "string" ? req.body.hwid.trim() : "";
  const turnstileToken = typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken.trim() : "";
  const clientIp = ((req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0]).trim() || "unknown";
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }

  if (!turnstileToken) {
    return res.status(400).json({ success: false, error: "Cloudflare verification is required" });
  }

  const isHuman = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!isHuman) {
    return res.status(403).json({ success: false, error: "Cloudflare verification failed. Please try again." });
  }

  // Check if IP is blocked (brute force protection)
  const blockStatus = loginGuard.isBlocked(clientIp);
  if (blockStatus.blocked) {
    const mins = Math.ceil(blockStatus.remainingMs / 60000);
    logger.warn({ ip: clientIp, username }, "Login attempt from blocked IP");
    return res.status(429).json({ 
      success: false, 
      error: `Too many failed attempts. IP blocked for ${mins} minute(s). Try again later.`,
      blockedFor: mins
    });
  }

  const user = await userStore.verify(username, password);
  if (!user) {
    const result = loginGuard.recordFailure(clientIp);
    logger.warn({ ip: clientIp, username, attemptsLeft: result.attemptsLeft }, "Failed login attempt");
    
    if (result.blocked) {
      return res.status(429).json({ 
        success: false, 
        error: "Too many failed attempts. Your IP has been blocked for 15 minutes.",
        blockedFor: 15
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: "Invalid credentials",
      attemptsLeft: result.attemptsLeft
    });
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

    const isVpn = await checkVpn(clientIp);
    if (isVpn) {
      return res.status(403).json({
        success: false,
        error: "VPN_DETECTED",
        message: "VPN or Proxy connection detected. Please disable your VPN to access your account."
      });
    }
  }

  // Successful login — clear attempts and create session token
  loginGuard.recordSuccess(clientIp);
  const sessionToken = sessionStore.create(user.username, user.role);
  logger.info({ username: user.username, ip: clientIp }, "Successful login");

  return res.json({
    success: true,
    username: user.username,
    role: user.role,
    defaultDays: user.defaultDays,
    isTrial: user.isTrial,
    canResell: user.canResell ?? false,
    displayName: user.displayName || user.username,
    avatar: user.avatar || "",
    sessionToken,
  });
});

router.post("/verify-session", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
  const role = typeof req.body?.role === "string" ? req.body.role.trim() : "";
  const sessionToken = typeof req.body?.sessionToken === "string" ? req.body.sessionToken.trim() : "";

  // Session token verification (preferred, secure method)
  if (sessionToken) {
    const session = sessionStore.get(sessionToken);
    if (session && session.username === username && session.role === role) {
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, error: "Invalid or expired session" });
  }

  // Legacy password-based verification (backward compat)
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, error: "Missing session fields" });
  }

  if (role === "admin") {
    if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
      return res.json({ success: true });
    }
    const user = await userStore.find(username);
    if (user && user.role === "admin" && verifyPassword(password, user.password)) {
      return res.json({ success: true });
    }
  } else if (role === "user") {
    const user = await userStore.verify(username, password);
    if (user && user.role === "user") {
      return res.json({ success: true });
    }
  }

  return res.status(401).json({ success: false, error: "Invalid session" });
});

router.post("/logout", async (req, res) => {
  const sessionToken = typeof req.body?.sessionToken === "string" ? req.body.sessionToken.trim() : "";
  if (sessionToken) {
    sessionStore.remove(sessionToken);
  }
  return res.json({ success: true });
});

router.post("/profile", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
  const avatar = typeof req.body?.avatar === "string" ? req.body.avatar.trim() : "";

  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }

  // Require authentication — verify session token or credentials
  const sessionToken = req.headers["x-session-token"] as string;
  const authUsername = req.headers["x-username"] as string;
  const authPassword = req.headers["x-password"] as string;

  let isAuthorized = false;
  if (sessionToken) {
    const session = sessionStore.get(sessionToken);
    if (session && (session.username === username || session.role === "admin")) {
      isAuthorized = true;
    }
  } else if (authUsername && authPassword) {
    if (authUsername === username || (authUsername === config.ADMIN_USERNAME && authPassword === config.ADMIN_PASSWORD)) {
      const user = await userStore.verify(authUsername, authPassword);
      if (user) isAuthorized = true;
      // Also allow direct admin config check
      if (authUsername === config.ADMIN_USERNAME && authPassword === config.ADMIN_PASSWORD) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({ success: false, error: "Unauthorized: You can only update your own profile" });
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
  const username = typeof req.params?.username === "string" ? req.params.username.trim() : "";
  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }
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
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword.trim() : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword.trim() : "";

  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // Enforce minimum password strength
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
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
    // Invalidate all existing sessions for this user
    sessionStore.removeByUser(username);
    return res.json({ success: true, message: "Password updated successfully. Please re-login." });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to update security key" });
  }
});

export default router;
