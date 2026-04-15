import { Router } from "express";
import { userStore } from "../store";

const router = Router();

router.post("/trial", async (req, res) => {
  const { resellerUsername, resellerKey, trialUsername, trialPassword, days } = req.body ?? {};

  if (!resellerUsername || !resellerKey || !trialUsername || !trialPassword) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const reseller = await userStore.verify(resellerUsername, resellerKey);
  if (!reseller) {
    return res.status(401).json({ success: false, error: "Invalid reseller credentials" });
  }
  if (reseller.isTrial) {
    return res.status(403).json({ success: false, error: "Trial users cannot create sub-trials" });
  }

  const trialDays = Number(days) > 0 ? Number(days) : 1;
  const result = await userStore.add(trialUsername, trialPassword, trialDays, true);
  if (!result.ok) {
    return res.status(409).json({ success: false, error: result.error });
  }

  return res.json({
    success: true,
    username: result.user.username,
    defaultDays: result.user.defaultDays,
    isTrial: true,
  });
});

export default router;
