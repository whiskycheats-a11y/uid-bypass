import { Router } from "express";
import { userStore, uidStore, purgeExpiredTrials, settingsStore, loginHistoryStore } from "../store";
import { config, getApiKey } from "../config";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

async function removeUidFromExternal(uid: string): Promise<void> {
  try {
    const s = await settingsStore.get();
    let base = (s.externalApiUrl || config.EXTERNAL_API_URL).replace(/\/$/, "");
    let key = s.externalApiKey;
    if (!key) {
      try {
        key = getApiKey();
      } catch {
        key = "";
      }
    }
    const isPhpApi = base.includes("api_user.php");
    let url = "";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body = "";

    if (isPhpApi) {
      url = `${base}?action=delete`;
      headers["X-API-KEY"] = key;
      body = JSON.stringify({ account_id: uid });
    } else {
      base = base.replace(/\/api\/v1\/uids\/(add|remove|list)$/i, "");
      base = base.replace(/\/api\/v1\/uids$/i, "");
      url = `${base}/api/v1/uids/remove`;
      headers["X-AUTH-KEY"] = key;
      body = JSON.stringify({ uid });
    }

    await fetch(url, {
      method: "POST",
      headers,
      body,
    });
  } catch (err) {
    logger.warn({ err, uid }, "Failed to remove UID from external API during user cleanup");
  }
}

router.get("/login-history", requireAdmin, async (_req, res) => {
  const history = await loginHistoryStore.getRecent(100);
  res.json({ success: true, history });
});

router.get("/", requireAdmin, async (_req, res) => {
  const users = await userStore.list();
  res.json({
    success: true,
    users: users.map((u) => ({
      username: u.username,
      createdAt: u.createdAt,
      defaultDays: u.defaultDays,
      isTrial: u.isTrial,
      canResell: u.canResell ?? false,
      balance: u.balance ?? 0,
      hwid: u.hwid ?? "",
      hwidLockEnabled: u.hwidLockEnabled ?? false,
      isActive: u.isActive !== false,
    })),
  });
});

router.patch("/:username/active", requireAdmin, async (req, res) => {
  const { isActive } = req.body ?? {};
  const updated = await userStore.setActive(req.params.username as string, Boolean(isActive));
  if (!updated) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  return res.json({ success: true, isActive: Boolean(isActive) });
});

router.patch("/:username/resell", requireAdmin, async (req, res) => {
  const { canResell } = req.body ?? {};
  const updated = await userStore.setCanResell(req.params.username as string, Boolean(canResell));
  if (!updated) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  return res.json({ success: true, canResell: Boolean(canResell) });
});

router.patch("/:username/hwid-lock", requireAdmin, async (req, res) => {
  const { enabled } = req.body ?? {};
  const updated = await userStore.toggleHwidLock(req.params.username as string, Boolean(enabled));
  if (!updated) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  return res.json({ success: true, hwidLockEnabled: Boolean(enabled) });
});

router.post("/:username/hwid-reset", requireAdmin, async (req, res) => {
  const updated = await userStore.resetHwid(req.params.username as string);
  if (!updated) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  return res.json({ success: true, message: "HWID reset successful" });
});

router.post("/", requireAdmin, async (req, res) => {
  const { username, password, defaultDays, isTrial } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password are required" });
  }
  const days = Number(defaultDays) > 0 ? Number(defaultDays) : 30;
  const result = await userStore.add(username, password, days, Boolean(isTrial));
  if (!result.ok) {
    return res.status(409).json({ success: false, error: result.error });
  }
  return res.json({
    success: true,
    username: result.user.username,
    defaultDays: result.user.defaultDays,
    isTrial: result.user.isTrial,
  });
});

router.delete("/:username", requireAdmin, async (req, res) => {
  const username = req.params.username as string;

  const uidsToRemove = await uidStore.removeByUser(username);
  await Promise.all(uidsToRemove.map(removeUidFromExternal));

  const removed = await userStore.remove(username);
  if (!removed) {
    return res.status(404).json({ success: false, error: "User not found or cannot be removed" });
  }
  return res.json({ success: true, uidsRemoved: uidsToRemove.length });
});

async function runPurge() {
  try {
    const purged = await purgeExpiredTrials();
    if (purged.length > 0) {
      for (const { uids } of purged) {
        await Promise.all(uids.map(removeUidFromExternal));
      }
      logger.info({ count: purged.length }, "Auto-purge: expired trials deleted");
    }
  } catch (err) {
    logger.error({ err }, "Auto-purge failed");
  }
}

runPurge();
setInterval(runPurge, 30 * 60 * 1000);

export default router;
