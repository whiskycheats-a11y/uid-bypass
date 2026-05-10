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

// Admin: add/set credits for a user
router.patch("/:username", requireAdmin, async (req, res) => {
  const { username } = req.params;
  const { amount } = req.body ?? {};
  if (typeof amount !== "number") {
    return res.status(400).json({ success: false, error: "amount (number) is required" });
  }
  const result = await userStore.adjustBalance(username, amount);
  if (!result.ok) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  return res.json({ success: true, username, balance: result.balance });
});

// User: check own balance
router.get("/me", async (req, res) => {
  const username = req.headers["x-username"] as string;
  const password = req.headers["x-password"] as string;
  if (!username || !password) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const user = await userStore.verify(username, password);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  return res.json({ success: true, balance: user.balance ?? 0 });
});

export default router;
