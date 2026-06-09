import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { userStore, sessionStore, verifyPassword } from "../store";

// Helper to check if a value is a non-empty string
export function isString(val: any): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.auth_token;
  if (isString(sessionToken)) {
    const session = sessionStore.get(sessionToken);
    if (session && session.role === "admin") {
      return next();
    }
  }

  return res.status(403).json({ success: false, error: "Forbidden: Admin access denied. Please login." });
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.auth_token;
  if (isString(sessionToken)) {
    const session = sessionStore.get(sessionToken);
    if (session) {
      const user = await userStore.find(session.username);
      if (user) {
        (req as any).user = user;
        return next();
      }
    }
  }

  return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired session. Please login." });
}
