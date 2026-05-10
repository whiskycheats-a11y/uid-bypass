import { Router } from "express";
import { userStore, paymentStore } from "../store";
import { logger } from "../lib/logger";

const router = Router();

router.post("/request", async (req, res) => {
  const xUsername = req.headers["x-username"] as string;
  const xPassword = req.headers["x-password"] as string;
  if (!xUsername || !xPassword) return res.status(401).json({ success: false, error: "Unauthorized" });
  const user = await userStore.verify(xUsername, xPassword);
  if (!user || user.role === "admin") return res.status(401).json({ success: false, error: "Unauthorized" });
  const { packageTokens, packagePrice, txNote } = req.body;
  if (!packageTokens || !packagePrice) return res.status(400).json({ success: false, error: "Missing package info" });
  const request = await paymentStore.create(xUsername, Number(packageTokens), String(packagePrice), txNote ?? "");
  req.log.info({ username: xUsername, packageTokens }, "Payment request submitted");
  return res.json({ success: true, request });
});

router.get("/", async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string;
  if (!adminKey) return res.status(401).json({ success: false, error: "Unauthorized" });
  const requests = await paymentStore.list();
  return res.json({ success: true, requests });
});

router.patch("/:id/approve", async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string;
  if (!adminKey) return res.status(401).json({ success: false, error: "Unauthorized" });
  const approved = await paymentStore.approve(req.params.id);
  if (!approved) return res.status(404).json({ success: false, error: "Not found or already processed" });
  const result = await userStore.adjustBalance(approved.username, approved.packageTokens);
  logger.info({ id: req.params.id, username: approved.username, tokens: approved.packageTokens }, "Payment approved, tokens added");
  return res.json({ success: true, balance: result.balance, username: approved.username });
});

router.patch("/:id/reject", async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string;
  if (!adminKey) return res.status(401).json({ success: false, error: "Unauthorized" });
  const ok = await paymentStore.reject(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: "Not found" });
  return res.json({ success: true });
});

export default router;
