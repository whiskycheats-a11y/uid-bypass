import { Router } from "express";
import { userStore, uidStore, purgeExpiredTrials } from "../store";
import { config, getApiKey } from "../config";
import { logger } from "../lib/logger";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const apiKey = req.headers["x-admin-key"];
  if (apiKey !== config.ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
}

async function removeUidFromExternal(uid: string): Promise<void> {
  try {
    await fetch(`${config.EXTERNAL_API_URL}/api/uid/remove`, {
      method: "POST",
      headers: { "X-API-KEY": getApiKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ uid }),
    });
  } catch (err) {
    logger.warn({ err, uid }, "Failed to remove UID from external API during user cleanup");
  }
}

router.get("/", requireAdmin, async (_req, res) => {
  const users = await userStore.list();
  res.json({
    success: true,
    users: users.map((u) => ({
      username: u.username,
      createdAt: u.createdAt,
      defaultDays: u.defaultDays,
      isTrial: u.isTrial,
    })),
  });
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
  const { username } = req.params;

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
