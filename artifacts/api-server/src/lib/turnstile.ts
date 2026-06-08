import { config } from "../config";
import { logger } from "./logger";

export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  if (!token) return false;

  const secret = config.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // If no secret is configured, bypass verification for dev

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.success === true;
  } catch (err) {
    logger.error({ err }, "Turnstile verification failed");
    return false;
  }
}
