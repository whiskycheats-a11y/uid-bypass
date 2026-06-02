import { Router } from "express";
import { userStore, trialStore, uidStore, settingsStore, tokenStore } from "../store";
import { config } from "../config";
import { logger } from "../lib/logger";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────

const ALLOWED_HOURS = [24, 72, 168, 336, 720];

function daysToHours(days: number): number {
  const hours = days * 24;
  return ALLOWED_HOURS.reduce((best, h) =>
    Math.abs(h - hours) < Math.abs(best - hours) ? h : best
  );
}

function daysToTokens(days: number): number {
  if (days === 1) return 10;
  if (days === 3) return 30;
  if (days === 7) return 70;
  if (days === 14) return 150;
  if (days === 30) return 300;
  return days;
}

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
  if (key) return key;
  // Hardcoded fallback API key
  return "MANI272-3D2C30C879C434C35DB85782C62BF60D";
}

function authHeaders(key: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-AUTH-KEY": key,
  };
}

function isSuccess(data: Record<string, unknown>): boolean {
  return (
    data.success === true ||
    data.status === "success" ||
    data.status === "ok" ||
    data.error === false ||
    data.result === "success"
  );
}

// ── Routes ────────────────────────────────────────────────────────────────

router.get("/list", async (req, res) => {
  try {
    const username = req.headers["x-username"] as string | undefined;
    const password = req.headers["x-password"] as string | undefined;

    if (username && password) {
      if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
        const uids = await uidStore.list();
        res.json({ success: true, uids });
        return;
      }
      const user = await userStore.verify(username, password);
      if (user) {
        if (user.role === "admin") {
          const uids = await uidStore.list();
          res.json({ success: true, uids });
        } else {
          const uids = await uidStore.listByUser(username);
          res.json({ success: true, uids });
        }
        return;
      }
    }

    res.json({ success: true, uids: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to list UIDs");
    res.status(500).json({ success: false, message: "Failed to list UIDs" });
  }
});

router.post("/add", async (req, res) => {
  const { uid, days = 30, bluestack = true, username, name } = req.body;
  const clientIp = ((req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0]).trim();
  if (!uid) {
    res.status(400).json({ success: false, message: "uid is required" });
    return;
  }

  const authUser = req.headers["x-username"] as string | undefined;
  const authPass = req.headers["x-password"] as string | undefined;

  let isAuthorized = false;
  let isAdmin = false;
  if (authUser && authPass) {
    if (authUser === config.ADMIN_USERNAME && authPass === config.ADMIN_PASSWORD) {
      isAuthorized = true;
      isAdmin = true;
    } else {
      const user = await userStore.verify(authUser, authPass);
      if (user) {
        if (user.role === "admin") {
          isAuthorized = true;
          isAdmin = true;
        } else if (user.username === username) {
          isAuthorized = true;
        }
      }
    }
  }

  if (!isAuthorized) {
    res.status(403).json({ success: false, message: "Unauthorized to add UID" });
    return;
  }

  let effectiveDays = days;
  let isTrial = false;
  let skipBalanceCheck = isAdmin;

  if (username) {
    const user = await userStore.find(username);
    if (user?.isTrial) {
      const existingUserUids = await uidStore.listByUser(username);
      if (existingUserUids.length >= 1) {
        res.json({ success: false, message: "TRIAL_LIMIT_REACHED" });
        return;
      }
      const ipExists = await uidStore.checkIpExists(clientIp);
      if (ipExists) {
        res.json({ success: false, message: "TRIAL_IP_LIMIT_REACHED" });
        return;
      }
      effectiveDays = 1;
      isTrial = true;
      skipBalanceCheck = true;
    }
  }

  const cost = daysToTokens(effectiveDays);

  if (!skipBalanceCheck && username) {
    const deduct = await userStore.deductBalance(username, cost);
    if (!deduct.ok) {
      res.json({
        success: false,
        message: deduct.error === "INSUFFICIENT_BALANCE" ? "INSUFFICIENT_BALANCE" : "User not found",
      });
      return;
    }
  }

  try {
    const base = await getBase();
    const key = await getKey();
    const hours = daysToHours(effectiveDays);
    req.log.info({ base, keyLength: key?.length, clientIp }, "External API Call Info");

    const response = await fetch(`${base}/api/v1/uids/add`, {
      method: "POST",
      headers: authHeaders(key),
      body: JSON.stringify({
        uid,
        days: effectiveDays,
        name: name || username || "MyUID",
      }),
    });
    const data = await response.json() as Record<string, unknown>;
    const success = isSuccess(data);

    if (success) {
      if (username && isTrial) trialStore.increment(username);
      await uidStore.save(uid, effectiveDays, bluestack, username ?? "", name ?? "", clientIp);
    } else if (!skipBalanceCheck && username) {
      await userStore.adjustBalance(username, cost);
    }

    res.json({
      ...data,
      success,
      message: data.message || data.error || (success ? "Success" : "Unknown error from external API")
    });
  } catch (err) {
    if (!skipBalanceCheck && username) {
      await userStore.adjustBalance(username, cost);
    }
    req.log.error({ err }, "Failed to add UID");
    res.status(500).json({ success: false, message: "Failed to contact external API" });
  }
});

router.post("/remove", async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    res.status(400).json({ success: false, message: "uid is required" });
    return;
  }

  try {
    const username = req.headers["x-username"] as string | undefined;
    const password = req.headers["x-password"] as string | undefined;

    let isAuthorized = false;
    if (username && password) {
      if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
        isAuthorized = true;
      } else {
        const user = await userStore.verify(username, password);
        if (user) {
          if (user.role === "admin") {
            isAuthorized = true;
          } else {
            const existingUid = await uidStore.get(uid);
            if (existingUid && existingUid.addedBy === username) {
              isAuthorized = true;
            }
          }
        }
      }
    }

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: "Unauthorized to remove this UID" });
      return;
    }

    const base = await getBase();
    const key = await getKey();

    const response = await fetch(`${base}/api/v1/uids/remove`, {
      method: "POST",
      headers: authHeaders(key),
      body: JSON.stringify({ uid }),
    });
    const data = await response.json() as Record<string, unknown>;
    const success = isSuccess(data);

    // Always permanently delete from local MongoDB on remove action
    await uidStore.remove(uid);

    res.json({
      ...data,
      success: true,
      message: data.message || data.error || "Removed successfully"
    });
  } catch (err) {
    req.log.error({ err }, "Failed to remove UID");
    res.status(500).json({ success: false, message: "Failed to contact external API" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const users = await userStore.listAll();
    const uids = await uidStore.list();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const map = new Map<string, { total: number; today: number; active: number; expired: number; displayName: string; avatar: string; role: string }>();

    // Initialize all users with 0 statistics
    for (const u of users) {
      map.set(u.username, {
        total: 0,
        today: 0,
        active: 0,
        expired: 0,
        displayName: u.displayName || u.username,
        avatar: u.avatar || "",
        role: u.role,
      });
    }

    // Process all UIDs
    for (const u of uids) {
      const name = u.addedBy || "Unknown";
      if (!map.has(name)) {
        // Fallback for deleted users or unknown contributors
        map.set(name, {
          total: 0,
          today: 0,
          active: 0,
          expired: 0,
          displayName: name,
          avatar: "",
          role: "user",
        });
      }
      const entry = map.get(name)!;
      entry.total += 1;

      // Check if added today
      const addedAt = new Date(u.addedAt);
      if (addedAt >= today) entry.today += 1;

      // Check expiry
      const expiresAt = new Date(addedAt.getTime() + u.days * 24 * 60 * 60 * 1000);
      if (expiresAt > new Date()) {
        entry.active += 1;
      } else {
        entry.expired += 1;
      }
    }

    const leaderboard = Array.from(map.entries()).map(([username, data]) => ({
      username,
      ...data,
    }));

    // Sort by total UIDs descending
    leaderboard.sort((a, b) => b.total - a.total);

    res.json({ success: true, leaderboard });
  } catch (err) {
    req.log.error({ err }, "Failed to get leaderboard");
    res.status(500).json({ success: false, message: "Failed to build leaderboard" });
  }
});

router.get("/token-info/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const tokenData = await tokenStore.get(token);
    if (!tokenData) {
      res.json({ success: false, message: "Invalid or non-existent token" });
      return;
    }
    const createdTime = new Date(tokenData.createdAt).getTime();
    const isExpired = Date.now() - createdTime > 24 * 60 * 60 * 1000;
    
    let isTrialExpired = false;
    const usedByUid = tokenData.usedByUid;
    if (tokenData.used && usedByUid) {
      const existingUid = await uidStore.get(usedByUid);
      if (existingUid) {
        const addedTime = new Date(existingUid.addedAt).getTime();
        const expiryTime = addedTime + existingUid.days * 24 * 60 * 60 * 1000;
        if (Date.now() > expiryTime) {
          isTrialExpired = true;
        }
      } else {
        isTrialExpired = true;
      }
    }

    res.json({
      success: true,
      token: tokenData.token,
      resellerUsername: tokenData.resellerUsername,
      days: tokenData.days,
      used: tokenData.used,
      isExpired,
      isTrialExpired
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/free-whitelist", async (req, res) => {
  const { token, uid, bluestack = true } = req.body ?? {};
  const clientIp = ((req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0]).trim();

  if (!token || !uid) {
    res.status(400).json({ success: false, message: "Token and UID are required" });
    return;
  }

  try {
    const tokenData = await tokenStore.get(token);
    if (!tokenData) {
      res.json({ success: false, message: "INVALID_TOKEN" });
      return;
    }

    if (tokenData.used) {
      res.json({ success: false, message: "TOKEN_ALREADY_USED" });
      return;
    }

    const createdTime = new Date(tokenData.createdAt).getTime();
    if (Date.now() - createdTime > 24 * 60 * 60 * 1000) {
      res.json({ success: false, message: "TOKEN_EXPIRED" });
      return;
    }

    // Only block if this IP has an ACTIVE (non-expired) free trial UID
    // This allows re-use after previous trial expires
    if (clientIp && clientIp !== "unknown" && clientIp !== "::1" && clientIp !== "127.0.0.1") {
      const activeIpExists = await uidStore.checkActiveIpExists(clientIp);
      if (activeIpExists) {
        res.json({ success: false, message: "TRIAL_IP_LIMIT_REACHED" });
        return;
      }
    }

    const existingUid = await uidStore.get(uid);
    if (existingUid) {
      const addedTime = new Date(existingUid.addedAt).getTime();
      const expiryTime = addedTime + existingUid.days * 24 * 60 * 60 * 1000;
      if (expiryTime > Date.now()) {
        res.json({ success: false, message: "UID_ALREADY_WHITELISTED" });
        return;
      }
    }

    const base = await getBase();
    const key = await getKey();

    req.log.info({ base, clientIp, token, uid }, "External free-whitelist API Call");

    const response = await fetch(`${base}/api/v1/uids/add`, {
      method: "POST",
      headers: authHeaders(key),
      body: JSON.stringify({
        uid,
        days: tokenData.days,
        name: `Trial-${tokenData.resellerUsername}`,
      }),
    });
    
    const data = await response.json() as Record<string, unknown>;
    const success = isSuccess(data);

    if (success) {
      await tokenStore.markAsUsed(token, uid, clientIp);
      trialStore.increment(tokenData.resellerUsername);
      await uidStore.save(uid, tokenData.days, bluestack, tokenData.resellerUsername, `Trial-${tokenData.resellerUsername}`, clientIp);
    }

    res.json({
      ...data,
      success,
      days: tokenData.days,
      message: data.message || data.error || (success ? "Success" : "Unknown error from external API")
    });

  } catch (err) {
    req.log.error({ err }, "Failed in free-whitelist endpoint");
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Background cleanup task to remove expired whitelisted UIDs from database & external API
async function cleanupExpiredUids() {
  try {
    const uids = await uidStore.list();
    const now = Date.now();
    const base = await getBase();
    const key = await getKey();
    
    for (const u of uids) {
      // Check if it's a trial UID by looking at its name / reseller prefix
      if (u.name?.startsWith("Trial-") || u.addedBy) {
        const addedTime = new Date(u.addedAt).getTime();
        const expiryTime = addedTime + u.days * 24 * 60 * 60 * 1000;
        
        if (now > expiryTime) {
          logger.info({ uid: u.uid }, "Trial expired. Removing expired trial UID...");
          // Expired! Remove from external API first
          try {
            const response = await fetch(`${base}/api/v1/uids/remove`, {
              method: "POST",
              headers: authHeaders(key),
              body: JSON.stringify({ uid: u.uid }),
            });
            const resData = await response.json() as Record<string, unknown>;
            logger.info({ uid: u.uid, resData }, "Expired trial UID remove status from external API");
          } catch (apiErr) {
            logger.error({ apiErr, uid: u.uid }, "Failed to remove expired trial UID from external API");
          }
          
          // Remove from database
          await uidStore.remove(u.uid);
          logger.info({ uid: u.uid }, "Successfully removed expired trial UID from database");
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error running cleanupExpiredUids background task");
  }
}

// Run cleanup task every 5 minutes
setInterval(() => {
  cleanupExpiredUids().catch(() => {});
}, 5 * 60 * 1000);

// Run once on startup after 10 seconds
setTimeout(() => {
  cleanupExpiredUids().catch(() => {});
}, 10 * 1000);

export default router;
