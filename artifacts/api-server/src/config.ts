// ─────────────────────────────────────────────
//  CENTRAL CONFIG — edit only this file
// ─────────────────────────────────────────────

export const config = {
  // External UID backend — set via environment variable
  EXTERNAL_API_URL: process.env["EXTERNAL_API_URL"] || process.env["GTC_API_URL"] || process.env["EndpointURL"] || "",

  // API key environment variable name fallback
  API_KEY_ENV: "UID_API_KEY",

  // MongoDB connection string
  MONGODB_URI: process.env["MONGODB_URI"] ?? "mongodb+srv://uidbypass:uidbypass@cluster0.igrfjw8.mongodb.net/?appName=Cluster0",

  // Admin credentials
  ADMIN_USERNAME: process.env["ADMIN_USERNAME"] ?? "",
  ADMIN_PASSWORD: process.env["ADMIN_PASSWORD"] ?? "",

  // Cloudflare Turnstile
  TURNSTILE_SECRET_KEY: process.env["TURNSTILE_SECRET_KEY"] ?? "",
};

export function getApiKey(): string {
  const key = process.env[config.API_KEY_ENV] || process.env["GTC_API_KEY"] || process.env["API_KEY"];
  return key || "";
}
