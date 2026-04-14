// ─────────────────────────────────────────────
//  CENTRAL CONFIG — edit only this file
// ─────────────────────────────────────────────

export const config = {
  // External UID backend — change IP/port here only
  EXTERNAL_API_URL: "http://152.42.251.212:25568",

  // API key — value is read from the UID_API_KEY environment secret
  // To change the key, update the secret named UID_API_KEY in Replit Secrets
  API_KEY_ENV: "UID_API_KEY",
};

export function getApiKey(): string {
  const key = process.env[config.API_KEY_ENV];
  if (!key) throw new Error(`${config.API_KEY_ENV} environment secret is not set`);
  return key;
}
