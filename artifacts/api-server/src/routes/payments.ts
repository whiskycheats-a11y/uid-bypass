import { Router } from "express";
import { userStore, paymentStore } from "../store";
import { logger } from "../lib/logger";
import { requireAdmin, requireUser } from "../middlewares/auth";

const router = Router();

router.post("/request", requireUser, async (req, res) => {
  const user = (req as any).user;
  // Admin credentials bypassed by requireUser should not request payments
  if (user.role === "admin") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  
  const { packageTokens, packagePrice, txNote } = req.body;
  if (!packageTokens || !packagePrice) return res.status(400).json({ success: false, error: "Missing package info" });
  
  const request = await paymentStore.create(user.username, Number(packageTokens), String(packagePrice), txNote ?? "");
  req.log.info({ username: user.username, packageTokens }, "Payment request submitted");
  return res.json({ success: true, request });
});

router.get("/", requireAdmin, async (req, res) => {
  const requests = await paymentStore.list();
  return res.json({ success: true, requests });
});

router.patch("/:id/approve", requireAdmin, async (req, res) => {
  const approved = await paymentStore.approve(req.params.id as string);
  if (!approved) return res.status(404).json({ success: false, error: "Not found or already processed" });
  const result = await userStore.adjustBalance(approved.username, approved.packageTokens);
  logger.info({ id: req.params.id, username: approved.username, tokens: approved.packageTokens }, "Payment approved, tokens added");
  return res.json({ success: true, balance: result.balance, username: approved.username });
});

router.patch("/:id/reject", requireAdmin, async (req, res) => {
  const ok = await paymentStore.reject(req.params.id as string);
  if (!ok) return res.status(404).json({ success: false, error: "Not found" });
  return res.json({ success: true });
});

export default router;
