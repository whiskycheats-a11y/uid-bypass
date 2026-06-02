import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { userStore } from "../store";

// Helper to check if a value is a non-empty string
export function isString(val: any): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-admin-key"];
  
  if (!isString(apiKey)) {
    return res.status(403).json({ success: false, error: "Forbidden: Invalid or missing admin key" });
  }

  // 1. Verify against central config password
  if (apiKey === config.ADMIN_PASSWORD) {
    return next();
  }

  // 2. Fallback: Verify against seeded admin username/password in database
  const user = await userStore.find(config.ADMIN_USERNAME);
  if (user && user.role === "admin" && user.password === apiKey) {
    return next();
  }

  return res.status(403).json({ success: false, error: "Forbidden: Access denied" });
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const username = req.headers["x-username"];
  const password = req.headers["x-password"];

  if (!isString(username) || !isString(password)) {
    return res.status(401).json({ success: false, error: "Unauthorized: Missing username or password" });
  }

  // Allow admin key bypass/override
  if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
    return next();
  }

  const user = await userStore.verify(username, password);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid operator credentials" });
  }

  (req as any).user = user;
  return next();
}
