import { config } from "../config";
import { logger } from "./logger";

export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  if (!token) return false;

  const secret = config.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // No secret key configured — BLOCK all requests (secure by default)
    logger.error("TURNSTILE_SECRET_KEY not configured — all logins will be blocked. Set it in environment variables.");
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    
    if (!data.success) {
      logger.warn({ ip, errors: data["error-codes"] }, "Turnstile verification rejected");
    }
    
    return data.success === true;
  } catch (err) {
    logger.error({ err }, "Turnstile verification network error");
    return false; // Fail closed — deny access on error
  }
}
