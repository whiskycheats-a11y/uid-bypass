import { Router } from "express";
import { userStore, tokenStore, uidStore, settingsStore, verifyPassword } from "../store";
import { config } from "../config";
import { logger } from "../lib/logger";

async function getBase(): Promise<string> {
  const s = await settingsStore.get();
  let url = (s.externalApiUrl || config.EXTERNAL_API_URL).replace(/\/$/, "");
  url = url.replace(/\/api\/v1\/uids\/(add|remove|list)$/i, "");
  url = url.replace(/\/api\/v1\/uids$/i, "");
  return url;
}

async function getKey(): Promise<string> {
  const s = await settingsStore.get();
  if (s.externalApiKey) return s.externalApiKey;
  const key = process.env[config.API_KEY_ENV];
  if (!key) throw new Error("API key not configured");
  return key;
}

function authHeaders(key: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-AUTH-KEY": key,
  };
}

const router = Router();

router.get("/trial-tokens", async (req, res) => {
  const username = req.headers["x-username"] as string;
  const password = req.headers["x-password"] as string;

  if (!username || !password) return res.status(401).json({ success: false });

  let isAdmin = false;
  if (username === config.ADMIN_USERNAME && verifyPassword(password, config.ADMIN_PASSWORD)) {
    isAdmin = true;
  } else {
    const user = await userStore.verify(username, password);
    if (!user) return res.status(401).json({ success: false });
    if (user.role === "admin") isAdmin = true;
  }

  const tokens = await tokenStore.list(isAdmin ? undefined : username);
  return res.json({ success: true, tokens });
});

router.delete("/trial-token/:token", async (req, res) => {
  const { token } = req.params;
  const username = req.headers["x-username"] as string;
  const password = req.headers["x-password"] as string;

  if (!username || !password) return res.status(401).json({ success: false });

  let isAdmin = false;
  if (username === config.ADMIN_USERNAME && verifyPassword(password, config.ADMIN_PASSWORD)) {
    isAdmin = true;
  } else {
    const user = await userStore.verify(username, password);
    if (!user) return res.status(401).json({ success: false });
    if (user.role === "admin") isAdmin = true;
  }

  const tokenData = await tokenStore.get(token);
  if (!tokenData) return res.status(404).json({ success: false, message: "Token not found" });

  if (!isAdmin && tokenData.resellerUsername !== username) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  // Delete from DB
  await tokenStore.remove(token);

  // If used, delete associated UID
  if (tokenData.usedByUid) {
    const uid = tokenData.usedByUid;
    await uidStore.remove(uid);

    try {
      const base = await getBase();
      const key = await getKey();
      await fetch(`${base}/api/v1/uids/remove`, {
        method: "POST",
        headers: authHeaders(key),
        body: JSON.stringify({ uid }),
      });
      logger.info({ uid, token }, "Deleted UID for removed trial token from external API");
    } catch (err) {
      logger.error({ err, uid }, "Failed to remove UID from external API after token deletion");
    }
  }

  return res.json({ success: true });
});

router.post("/trial-token", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
  const serverName = typeof req.body?.serverName === "string" ? req.body.serverName.trim() : "";
  const { days } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Missing username or password" });
  }

  let isAuthorized = false;
  if (username === config.ADMIN_USERNAME && verifyPassword(password, config.ADMIN_PASSWORD)) {
    isAuthorized = true;
  } else {
    const user = await userStore.verify(username, password);
    if (user && (user.role === "admin" || user.canResell)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({ success: false, error: "Unauthorized to generate trial links" });
  }

  const trialDays = Number(days) > 0 ? Number(days) : 1;
  try {
    const token = await tokenStore.create(username, trialDays, serverName);
    return res.json({
      success: true,
      token,
      days: trialDays
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to generate trial token" });
  }
});

router.post("/trial", async (req, res) => {
  const resellerUsername = typeof req.body?.resellerUsername === "string" ? req.body.resellerUsername.trim() : "";
  const resellerKey = typeof req.body?.resellerKey === "string" ? req.body.resellerKey.trim() : "";
  const trialUsername = typeof req.body?.trialUsername === "string" ? req.body.trialUsername.trim() : "";
  const trialPassword = typeof req.body?.trialPassword === "string" ? req.body.trialPassword.trim() : "";
  const { days } = req.body ?? {};

  if (!resellerUsername || !resellerKey || !trialUsername || !trialPassword) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const reseller = await userStore.verify(resellerUsername, resellerKey);
  if (!reseller) {
    return res.status(401).json({ success: false, error: "Invalid reseller credentials" });
  }
  if (reseller.isTrial || !reseller.canResell) {
    return res.status(403).json({ success: false, error: "You do not have permission to create free trials" });
  }

  const trialDays = Number(days) > 0 ? Number(days) : 1;
  const result = await userStore.add(trialUsername, trialPassword, trialDays, true);
  if (!result.ok) {
    return res.status(409).json({ success: false, error: result.error });
  }

  return res.json({
    success: true,
    username: result.user.username,
    defaultDays: result.user.defaultDays,
    isTrial: true,
  });
});

export default router;
