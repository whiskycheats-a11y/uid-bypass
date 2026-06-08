// ─────────────────────────────────────────────
//  CENTRAL CONFIG — edit only this file
// ─────────────────────────────────────────────

export const config = {
  // External UID backend — change IP/port here only.
  // Note: MongoDB AppSettings collection overrides this default.
  EXTERNAL_API_URL: "https://gtccheats.xyz/Api/uidbypassapi/api_user.php",

  // API key — value is read from the UID_API_KEY environment secret
  API_KEY_ENV: "UID_API_KEY",

  // MongoDB connection string
  MONGODB_URI: process.env["MONGODB_URI"] ?? "mongodb+srv://uidbypass:uidbypass@cluster0.igrfjw8.mongodb.net/?appName=Cluster0",

  // Admin credentials
  ADMIN_USERNAME: process.env["ADMIN_USERNAME"] ?? "",
  ADMIN_PASSWORD: process.env["ADMIN_PASSWORD"] ?? "",

  // Cloudflare Turnstile
  TURNSTILE_SECRET_KEY: process.env["TURNSTILE_SECRET_KEY"] ?? "1x0000000000000000000000000000000AA",
};

export function getApiKey(): string {
  const key = process.env[config.API_KEY_ENV];
  if (!key) return "MANI272-3D2C30C879C434C35DB85782C62BF60D";
  return key;
}
