// ─────────────────────────────────────────────
//  CENTRAL CONFIG — edit only this file
// ─────────────────────────────────────────────

export const config = {
  // External UID backend — change IP/port here only
  EXTERNAL_API_URL: "https://dev-armorauidbypass.pantheonsite.io",

  // API key — value is read from the UID_API_KEY environment secret
  API_KEY_ENV: "UID_API_KEY",

  // MongoDB connection string
  MONGODB_URI: process.env["MONGODB_URI"] ?? "mongodb+srv://baunemonff_db_user:BVGUWJCSc7lOjqBJ@cluster0.qo77nxw.mongodb.net/?appName=Cluster0",

  // Admin credentials
  ADMIN_USERNAME: process.env["ADMIN_USERNAME"] ?? "admin",
  ADMIN_PASSWORD: process.env["ADMIN_PASSWORD"] ?? "UID@Admin2024",
};

export function getApiKey(): string {
  const key = process.env[config.API_KEY_ENV];
  if (!key) throw new Error(`${config.API_KEY_ENV} environment secret is not set`);
  return key;
}
