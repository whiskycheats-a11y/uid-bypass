import { Router } from "express";
import { userStore, sessionStore } from "../store";
import { config } from "../config";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// Admin: add/set credits for a user
router.patch("/:username", requireAdmin, async (req, res) => {
  const username = req.params.username as string;
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
  const sessionToken = req.cookies?.auth_token;

  let isAuthorized = false;
  let userBalance = 0;

  if (sessionToken) {
    const session = sessionStore.get(sessionToken);
    if (session) {
      const user = await userStore.find(session.username);
      if (user) {
        isAuthorized = true;
        userBalance = user.balance ?? 0;
      }
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  return res.json({ success: true, balance: userBalance });
});

export default router;
