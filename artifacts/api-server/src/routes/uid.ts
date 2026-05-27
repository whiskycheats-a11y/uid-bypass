import { Router } from "express";
import { userStore, trialStore, uidStore, settingsStore } from "../store";
import { config } from "../config";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────

const ALLOWED_HOURS = [24, 72, 168, 336, 720];

function daysToHours(days: number): number {
  const hours = days * 24;
  return ALLOWED_HOURS.reduce((best, h) =>
    Math.abs(h - hours) < Math.abs(best - hours) ? h : best
  );
}

async function getBase(): Promise<string> {
  const s = await settingsStore.get();
  return (s.externalApiUrl || config.EXTERNAL_API_URL).replace(/\/$/, "");
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
    "Authorization": `Bearer ${key}`,
    "X-API-Key": key,
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
    const uids = await uidStore.list();
    res.json({ success: true, uids });
  } catch (err) {
    req.log.error({ err }, "Failed to list UIDs");
    res.status(500).json({ success: false, message: "Failed to list UIDs" });
  }
});

router.post("/add", async (req, res) => {
  const { uid, days = 30, bluestack = true, username } = req.body;
  if (!uid) {
    res.status(400).json({ success: false, message: "uid is required" });
    return;
  }

  let effectiveDays = days;
  let isTrial = false;
  let skipBalanceCheck = false;

  if (username) {
    const user = await userStore.find(username);
    if (user?.isTrial) {
      if (trialStore.getCount(username) >= 1) {
        res.json({ success: false, message: "TRIAL_LIMIT_REACHED" });
        return;
      }
      effectiveDays = 1;
      isTrial = true;
      skipBalanceCheck = true;
    }
  }

  const cost = effectiveDays;

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

    const response = await fetch(`${base}/api/v1/uids/add`, {
      method: "POST",
      headers: authHeaders(key),
      body: JSON.stringify({ uid, duration: hours, bluestack }),
    });
    const data = await response.json() as Record<string, unknown>;
    const success = isSuccess(data);

    if (success) {
      if (username && isTrial) trialStore.increment(username);
      await uidStore.save(uid, effectiveDays, bluestack, username ?? "");
    } else if (!skipBalanceCheck && username) {
      await userStore.adjustBalance(username, cost);
    }

    res.json({ ...data, success });
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
    const base = await getBase();
    const key = await getKey();

    const response = await fetch(`${base}/api/v1/uids/remove`, {
      method: "POST",
      headers: authHeaders(key),
      body: JSON.stringify({ uid, action: "remove" }),
    });
    const data = await response.json() as Record<string, unknown>;
    const success = isSuccess(data);

    if (success) {
      await uidStore.remove(uid);
    }
    res.json({ ...data, success });
  } catch (err) {
    req.log.error({ err }, "Failed to remove UID");
    res.status(500).json({ success: false, message: "Failed to contact external API" });
  }
});

export default router;
