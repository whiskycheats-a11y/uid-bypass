import { Router } from "express";
import { settingsStore } from "../store";
import { config } from "../config";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const apiKey = req.headers["x-admin-key"];
  if (apiKey !== config.ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
}

router.get("/", requireAdmin, async (_req, res) => {
  const settings = await settingsStore.get();
  res.json({
    success: true,
    externalApiUrl: settings.externalApiUrl || config.EXTERNAL_API_URL,
    hasCustomKey: !!settings.externalApiKey,
  });
});

router.patch("/", requireAdmin, async (req, res) => {
  const { externalApiUrl, externalApiKey } = req.body ?? {};
  const update: { externalApiUrl?: string; externalApiKey?: string } = {};
  if (externalApiUrl !== undefined) update.externalApiUrl = externalApiUrl;
  if (externalApiKey !== undefined) update.externalApiKey = externalApiKey;
  await settingsStore.update(update);
  res.json({ success: true });
});

export default router;
