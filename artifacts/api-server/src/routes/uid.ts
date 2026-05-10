import { Router } from "express";
import { userStore, trialStore, uidStore, settingsStore } from "../store";
import { config } from "../config";

const router = Router();

const ALLOWED_HOURS = [24, 72, 168, 336, 720];

function daysToHours(days: number): number {
  const hours = days * 24;
  return ALLOWED_HOURS.reduce((best, h) =>
    Math.abs(h - hours) < Math.abs(best - hours) ? h : best
  );
}

async function getApiBase(): Promise<string> {
  const settings = await settingsStore.get();
  return settings.externalApiUrl || config.EXTERNAL_API_URL;
}

async function getKey(): Promise<string> {
  const settings = await settingsStore.get();
  if (settings.externalApiKey) return settings.externalApiKey;
  const key = process.env[config.API_KEY_ENV];
  if (!key) throw new Error("API key not configured");
  return key;
}

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

  // Token cost: 1 token per day
  const cost = effectiveDays;

  // Deduct balance before calling external API (unless trial)
  if (!skipBalanceCheck && username) {
    const deduct = await userStore.deductBalance(username, cost);
    if (!deduct.ok) {
      res.json({ success: false, message: deduct.error === "INSUFFICIENT_BALANCE" ? "INSUFFICIENT_BALANCE" : "User not found" });
      return;
    }
  }

  try {
    const base = await getApiBase();
    const key = await getKey();
    const hours = daysToHours(effectiveDays);
    const url = `${base}?api=${encodeURIComponent(key)}&action=create&uid=${encodeURIComponent(uid)}&duration=${hours}`;
    const response = await fetch(url);
    const data = await response.json();

    const success = data.success === true || data.status === "success" || data.error === false;
    if (success) {
      if (username && isTrial) trialStore.increment(username);
      await uidStore.save(uid, effectiveDays, bluestack, username ?? "");
    } else if (!skipBalanceCheck && username) {
      // Refund tokens if external API failed
      await userStore.adjustBalance(username, cost);
    }

    res.json({ ...data, success });
  } catch (err) {
    // Refund tokens on network error
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
    const base = await getApiBase();
    const key = await getKey();
    const url = `${base}?api=${encodeURIComponent(key)}&action=delete&uid=${encodeURIComponent(uid)}`;
    const response = await fetch(url);
    const data = await response.json();

    const success = data.success === true || data.status === "success" || data.error === false;
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
