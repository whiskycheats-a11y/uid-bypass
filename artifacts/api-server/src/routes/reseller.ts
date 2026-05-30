import { Router } from "express";
import { userStore, tokenStore } from "../store";
import { config } from "../config";

const router = Router();

router.post("/trial-token", async (req, res) => {
  const { username, password, days } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Missing username or password" });
  }

  let isAuthorized = false;
  if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
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
    const token = await tokenStore.create(username, trialDays);
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
  const { resellerUsername, resellerKey, trialUsername, trialPassword, days } = req.body ?? {};

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
