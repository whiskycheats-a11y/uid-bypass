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

router.get("/notice", async (_req, res) => {
  const settings = await settingsStore.get();
  let activeNotice = "";
  if (settings.noticeText && settings.noticeExpiry) {
    if (settings.noticeExpiry === "indefinite") {
      activeNotice = settings.noticeText;
    } else {
      const expiryDate = new Date(settings.noticeExpiry);
      if (expiryDate.getTime() > Date.now()) {
        activeNotice = settings.noticeText;
      }
    }
  }
  res.json({
    success: true,
    noticeText: activeNotice,
    expiry: settings.noticeExpiry || "",
  });
});

router.patch("/notice", requireAdmin, async (req, res) => {
  const { noticeText, noticeExpiry } = req.body ?? {};
  
  let expiryTime = "";
  if (!noticeText) {
    expiryTime = "";
  } else if (noticeExpiry === "indefinite" || !noticeExpiry) {
    expiryTime = "indefinite";
  } else if (["1h", "6h", "24h", "72h"].includes(noticeExpiry)) {
    const hours = parseInt(noticeExpiry);
    expiryTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  } else {
    expiryTime = noticeExpiry;
  }
  
  await settingsStore.update({
    noticeText: noticeText || "",
    noticeExpiry: expiryTime
  });
  res.json({ success: true, noticeText: noticeText || "", expiry: expiryTime });
});

export default router;
