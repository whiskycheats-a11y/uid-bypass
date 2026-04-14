import { Router } from "express";
import { userStore, trialStore, uidStore } from "../store";
import { config, getApiKey } from "../config";

const router = Router();

router.get("/list", async (req, res) => {
  try {
    const response = await fetch(`${config.EXTERNAL_API_URL}/api/uid/list`, {
      headers: { "X-API-KEY": getApiKey() },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to list UIDs");
    res.status(500).json({ success: false, message: "Failed to contact external API" });
  }
});

router.post("/add", async (req, res) => {
  const { uid, days = 30, bluestack = true, username } = req.body;
  if (!uid) {
    res.status(400).json({ success: false, message: "uid is required" });
    return;
  }

  let effectiveDays = days;
  if (username) {
    const user = await userStore.find(username);
    if (user?.isTrial) {
      if (trialStore.getCount(username) >= 1) {
        res.json({ success: false, message: "TRIAL_LIMIT_REACHED" });
        return;
      }
      effectiveDays = 1;
    }
  }

  try {
    const response = await fetch(`${config.EXTERNAL_API_URL}/api/uid/add`, {
      method: "POST",
      headers: {
        "X-API-KEY": getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid, days: effectiveDays, bluestack }),
    });
    const data = await response.json();

    if (data.success) {
      if (username) {
        const user = await userStore.find(username);
        if (user?.isTrial) trialStore.increment(username);
      }
      await uidStore.save(uid, effectiveDays, bluestack, username ?? "");
    }

    res.json(data);
  } catch (err) {
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
    const response = await fetch(`${config.EXTERNAL_API_URL}/api/uid/remove`, {
      method: "POST",
      headers: {
        "X-API-KEY": getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid }),
    });
    const data = await response.json();
    if (data.success) {
      await uidStore.remove(uid);
    }
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to remove UID");
    res.status(500).json({ success: false, message: "Failed to contact external API" });
  }
});

export default router;
