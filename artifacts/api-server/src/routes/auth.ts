import { Router } from "express";
import crypto from "crypto";
import { userStore, sessionStore, loginGuard, loginHistoryStore } from "../store";
import { logger } from "../lib/logger";
import { verifyTurnstileToken } from "../lib/turnstile";
import { config } from "../config";

const router = Router();

// ── Anti-replay: track used Turnstile tokens (they should be single-use) ──
const usedTurnstileTokens = new Set<string>();
const TURNSTILE_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

function markTurnstileUsed(token: string): boolean {
  if (usedTurnstileTokens.has(token)) return false; // already used = replay
  usedTurnstileTokens.add(token);
  setTimeout(() => usedTurnstileTokens.delete(token), TURNSTILE_TOKEN_TTL);
  return true;
}

// Cleanup used tokens periodically
setInterval(() => {
  // Set auto-cleans via setTimeout, this is just a safety net
  if (usedTurnstileTokens.size > 10000) usedTurnstileTokens.clear();
}, 10 * 60 * 1000);

// ── VPN Detection ──
async function checkVpn(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.") || ip === "::1") return false;
  try {
    // Only check proxy — NOT hosting, because mobile data/cellular carriers
    // use cloud infrastructure that ip-api marks as "hosting", causing false positives.
    // Only actual VPN/SOCKS/HTTP proxies should trigger a block.
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=proxy`);
    const data = await res.json() as any;
    return data.proxy === true;
  } catch {
    return false;
  }
}

// ── Login-specific rate limiter (separate from global, stricter) ──
const loginRateMap = new Map<string, { count: number; resetAt: number }>();
const LOGIN_RATE_LIMIT = 6;            // 6 login requests per window
const LOGIN_RATE_WINDOW = 5 * 60 * 1000; // 5 minutes

function checkLoginRate(ip: string): boolean {
  const now = Date.now();
  let record = loginRateMap.get(ip);
  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + LOGIN_RATE_WINDOW };
    loginRateMap.set(ip, record);
  }
  record.count++;
  return record.count <= LOGIN_RATE_LIMIT;
}

// Cleanup
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginRateMap.entries()) {
    if (record.resetAt < now) loginRateMap.delete(ip);
  }
}, 5 * 60 * 1000);

// ══════════════════════════════════════════════════════════════════════════
//  POST /login — HARDENED (Server-side Cookies & HWID)
// ══════════════════════════════════════════════════════════════════════════
router.post("/login", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
  const turnstileToken = typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken.trim() : "";
  const requestTimestamp = typeof req.body?.t === "number" ? req.body.t : 0;
  const clientIp = ((req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0]).trim() || "unknown";
  const userAgent = req.headers["user-agent"] || "";

  // Get HWID from securely stored cookie, or generate a new one if missing
  let clientHwid = req.cookies?.device_hwid;
  let isNewHwid = false;
  if (!clientHwid) {
    clientHwid = crypto.randomUUID();
    isNewHwid = true;
  }

  // ─── 1. Basic input validation ───
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }

  // ─── Block scripted / automated tools by User-Agent ───
  const BLOCKED_UA_PATTERNS = [
    /python/i, /urllib/i, /httpx/i, /requests/i, /aiohttp/i, /pycurl/i,
    /curl\//i, /wget\//i, /libwww/i, /lwp-trivial/i, /java\//i,
    /okhttp/i, /go-http-client/i, /axios/i, /node-fetch/i, /got\//i,
    /superagent/i, /undici/i, /insomnia/i, /postman/i,
    /^-?$/, // empty or just a dash
  ];
  const isBlockedUA = !userAgent
    || userAgent.length < 10
    || BLOCKED_UA_PATTERNS.some((p) => p.test(userAgent));

  if (isBlockedUA) {
    logger.warn({ ip: clientIp, username, userAgent }, "Login blocked: automated/script user-agent");
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  // ─── 2. Request timestamp validation (mandatory — no timestamp = script) ───
  if (!requestTimestamp) {
    logger.warn({ ip: clientIp, username }, "Login blocked: missing request timestamp");
    return res.status(403).json({ success: false, error: "Invalid request. Please use the login page." });
  }
  const drift = Math.abs(Date.now() - requestTimestamp);
  if (drift > 2 * 60 * 1000) {
    logger.warn({ ip: clientIp, username, drift }, "Login blocked: timestamp drift too large");
    return res.status(403).json({ success: false, error: "Request expired. Please refresh the page." });
  }

  // ─── 3. Login-specific rate limiter ───
  if (!checkLoginRate(clientIp)) {
    logger.warn({ ip: clientIp, username }, "Login rate limit exceeded");
    return res.status(429).json({ 
      success: false, 
      error: "Too many login requests. Please wait 5 minutes.",
      blockedFor: 5
    });
  }

  // ─── 4. Turnstile verification (MANDATORY) ───
  if (!turnstileToken) {
    return res.status(400).json({ success: false, error: "Cloudflare verification is required. Please complete the challenge." });
  }

  // Anti-replay: reject reused turnstile tokens
  if (!markTurnstileUsed(turnstileToken)) {
    logger.warn({ ip: clientIp, username }, "Login blocked: reused Turnstile token (replay attack)");
    return res.status(403).json({ success: false, error: "Security token already used. Please refresh and try again." });
  }

  const isHuman = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!isHuman) {
    logger.warn({ ip: clientIp, username }, "Login blocked: Turnstile verification failed");
    return res.status(403).json({ success: false, error: "Cloudflare verification failed. Please try again." });
  }

  // ─── 5. Brute force protection (per-IP AND per-username) ───
  const ipKey = `ip:${clientIp}`;
  const userKey = `user:${username}`;

  const ipBlock = loginGuard.isBlocked(ipKey);
  if (ipBlock.blocked) {
    const mins = Math.ceil(ipBlock.remainingMs / 60000);
    logger.warn({ ip: clientIp, username }, "Login attempt from blocked IP");
    await loginHistoryStore.record(username, clientIp, false, userAgent);
    return res.status(429).json({ 
      success: false, 
      error: `IP blocked for ${mins} minute(s). Too many failed attempts.`,
      blockedFor: mins
    });
  }

  const userBlock = loginGuard.isBlocked(userKey);
  const isAdmin = config.ADMIN_USERNAME && username === config.ADMIN_USERNAME.toLowerCase();

  // Do not block the admin account globally by username (prevents DoS on the admin account)
  if (userBlock.blocked && !isAdmin) {
    const mins = Math.ceil(userBlock.remainingMs / 60000);
    logger.warn({ ip: clientIp, username }, "Login attempt on locked account");
    await loginHistoryStore.record(username, clientIp, false, userAgent);
    return res.status(429).json({ 
      success: false, 
      error: `Account temporarily locked for ${mins} minute(s). Contact admin to unlock.`,
      blockedFor: mins
    });
  }

  // ─── 6. Credential verification ───
  const user = await userStore.verify(username, password);
  if (!user) {
    // Record failure on ip
    const ipResult = loginGuard.recordFailure(ipKey);
    // Record failure on username ONLY if not admin
    let userResult = { blocked: false, attemptsLeft: 999 };
    if (!isAdmin) {
      userResult = loginGuard.recordFailure(userKey);
    }
    
    await loginHistoryStore.record(username, clientIp, false, userAgent);

    const attemptsLeft = Math.min(ipResult.attemptsLeft, userResult.attemptsLeft);
    
    logger.warn({ ip: clientIp, username, attemptsLeft }, "Failed login attempt");
    
    if (ipResult.blocked || userResult.blocked) {
      return res.status(429).json({ 
        success: false, 
        error: "Too many failed attempts. Account and IP have been locked for 30+ minutes.",
        blockedFor: 30
      });
    }
    
    // Don't tell attackers if the username exists — generic error
    return res.status(401).json({ 
      success: false, 
      error: "Invalid credentials",
      attemptsLeft
    });
  }

  // ─── 7. HWID device lock check ───
  if (user.hwidLockEnabled) {
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

  // ─── 8. Success — clear attempts and create session ───
  loginGuard.recordSuccess(ipKey);
  loginGuard.recordSuccess(userKey);
  const sessionToken = sessionStore.create(user.username, user.role);
  await loginHistoryStore.record(user.username, clientIp, true, userAgent);
  logger.info({ username: user.username, ip: clientIp }, "Successful login");

  // Set secure HttpOnly cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Must be HTTPS in production
    sameSite: "strict" as const,
  };

  res.cookie("auth_token", sessionToken, {
    ...cookieOptions,
    maxAge: 4 * 60 * 60 * 1000, // 4 hours
  });

  if (isNewHwid) {
    res.cookie("device_hwid", clientHwid, {
      ...cookieOptions,
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years (effectively permanent)
    });
  }

  const responsePayload = JSON.stringify({
    success: true,
    username: user.username,
    role: user.role,
    defaultDays: user.defaultDays,
    isTrial: user.isTrial,
    canResell: user.canResell ?? false,
    displayName: user.displayName || user.username,
    avatar: user.avatar || "",
  });

  const secret = "V3L0C1R4_M1TM_PR0T3CT10N"; 
  const signature = crypto.createHmac("sha256", secret).update(responsePayload).digest("hex");
  res.setHeader("X-Response-Signature", signature);
  res.setHeader("Content-Type", "application/json");

  return res.status(200).send(responsePayload);
});

// ══════════════════════════════════════════════════════════════════════════
//  POST /verify-session — SESSION TOKEN ONLY (from HttpOnly cookie)
// ══════════════════════════════════════════════════════════════════════════
router.post("/verify-session", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const role = typeof req.body?.role === "string" ? req.body.role.trim() : "";
  const sessionToken = req.cookies?.auth_token;

  if (!sessionToken) {
    return res.status(401).json({ success: false, error: "Session token required. Please login again." });
  }

  const session = sessionStore.get(sessionToken);
  if (session && session.username === username && session.role === role) {
    return res.json({ success: true });
  }

  // Clear invalid cookie
  res.clearCookie("auth_token");
  return res.status(401).json({ success: false, error: "Invalid or expired session. Please login again." });
});

router.post("/logout", async (req, res) => {
  const sessionToken = req.cookies?.auth_token;
  if (sessionToken) {
    sessionStore.remove(sessionToken);
  }
  
  res.clearCookie("auth_token");
  return res.json({ success: true });
});

router.post("/profile", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
  const avatar = typeof req.body?.avatar === "string" ? req.body.avatar.trim() : "";

  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }

  // ONLY allow session-cookie authentication — no header-based auth backdoor
  const sessionToken = req.cookies?.auth_token;
  if (!sessionToken) {
    return res.status(401).json({ success: false, error: "Unauthorized: Please login first." });
  }

  const session = sessionStore.get(sessionToken);
  if (!session || (session.username !== username && session.role !== "admin")) {
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

    let apiKey = user.apiKey || "";
    if (!apiKey && user.apiAccessEnabled) {
      apiKey = await userStore.ensureApiKey(user.username);
    }

    return res.json({
      success: true,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "",
      apiAccessEnabled: user.apiAccessEnabled || false,
      uidLimit: user.uidLimit ?? -1,
      apiKey,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
});

router.post("/update-key", async (req, res) => {
  // ── Must have a valid session ──
  const sessionToken = req.cookies?.auth_token;
  if (!sessionToken) {
    return res.status(401).json({ success: false, error: "Unauthorized: Please login first." });
  }
  const session = sessionStore.get(sessionToken);
  if (!session) {
    return res.status(401).json({ success: false, error: "Invalid or expired session. Please login again." });
  }

  // ── Rate-limit this endpoint per session user ──
  const clientIp = ((req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0]).trim() || "unknown";
  if (!checkLoginRate(clientIp)) {
    return res.status(429).json({ success: false, error: "Too many requests. Please wait 5 minutes." });
  }

  const username = session.username; // always use session username — never trust body
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword.trim() : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword.trim() : "";

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // Prevent changing the admin password via the portal
  if (config.ADMIN_USERNAME && username === config.ADMIN_USERNAME.toLowerCase()) {
    return res.status(403).json({ success: false, error: "Admin password cannot be changed via the portal. Update the environment variables." });
  }

  // Enforce minimum password strength
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
  }

  // ── Brute-force protection on the current-password check ──
  const ipKey = `ip:${clientIp}`;
  const userKey = `user:${username}`;
  if (loginGuard.isBlocked(ipKey).blocked || loginGuard.isBlocked(userKey).blocked) {
    return res.status(429).json({ success: false, error: "Too many failed attempts. Please wait before trying again." });
  }

  try {
    const user = await userStore.verify(username, currentPassword);
    if (!user) {
      loginGuard.recordFailure(ipKey);
      loginGuard.recordFailure(userKey);
      return res.status(401).json({ success: false, error: "Invalid current password" });
    }
    loginGuard.recordSuccess(ipKey);
    loginGuard.recordSuccess(userKey);
    const ok = await userStore.updatePassword(username, newPassword);
    if (!ok) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    // Invalidate all existing sessions for this user (force re-login)
    sessionStore.removeByUser(username);
    return res.json({ success: true, message: "Password updated successfully. Please re-login." });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to update security key" });
  }
});

export default router;
