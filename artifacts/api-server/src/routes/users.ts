import { Router } from "express";
import { userStore } from "../store";
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
  const removed = await userStore.remove(req.params.username);
  if (!removed) {
    return res.status(404).json({ success: false, error: "User not found or cannot be removed" });
  }
  return res.json({ success: true });
});

export default router;
