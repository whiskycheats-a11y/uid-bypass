import { Router } from "express";
import { userStore } from "../store";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const apiKey = req.headers["x-admin-key"];
  if (apiKey !== (process.env.ADMIN_PASSWORD ?? "UID@Admin2024")) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
}

router.get("/", requireAdmin, (_req, res) => {
  const users = userStore.list();
  res.json({ success: true, users: users.map((u) => ({ username: u.username, createdAt: u.createdAt })) });
});

router.post("/", requireAdmin, (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password are required" });
  }
  const result = userStore.add(username, password);
  if (!result.ok) {
    return res.status(409).json({ success: false, error: result.error });
  }
  return res.json({ success: true, username: result.user.username });
});

router.delete("/:username", requireAdmin, (req, res) => {
  const removed = userStore.remove(req.params.username);
  if (!removed) {
    return res.status(404).json({ success: false, error: "User not found or cannot be removed" });
  }
  return res.json({ success: true });
});

export default router;
