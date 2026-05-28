import { Router } from "express";
import { userStore } from "../store";

const router = Router();

router.post("/login", async (req, res) => {
  const username = req.body?.username?.trim();
  const password = req.body?.password?.trim();
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }
  const user = await userStore.verify(username, password);
  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }
  return res.json({
    success: true,
    username: user.username,
    role: user.role,
    defaultDays: user.defaultDays,
    isTrial: user.isTrial,
    canResell: user.canResell ?? false,
  });
});

export default router;
