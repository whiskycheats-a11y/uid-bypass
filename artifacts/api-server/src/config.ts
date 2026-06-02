// ─────────────────────────────────────────────
//  CENTRAL CONFIG — edit only this file
// ─────────────────────────────────────────────

export const config = {
  // External UID backend — change IP/port here only
  EXTERNAL_API_URL: "https://mani272uidbypass.vercel.app",

  // API key — value is read from the UID_API_KEY environment secret
  API_KEY_ENV: "UID_API_KEY",

  // MongoDB connection string
  MONGODB_URI: process.env["MONGODB_URI"] ?? "mongodb+srv://uidbypass:uidbypass@cluster0.igrfjw8.mongodb.net/?appName=Cluster0",

  // Admin credentials
  ADMIN_USERNAME: process.env["ADMIN_USERNAME"] ?? "admin",
  ADMIN_PASSWORD: process.env["ADMIN_PASSWORD"] ?? "UID@Admin2024",
};

export function getApiKey(): string {
  const key = process.env[config.API_KEY_ENV];
  if (!key) return "MANI272-3D2C30C879C434C35DB85782C62BF60D";
  return key;
}
