import { prisma } from "./prisma";

export const DEFAULT_SETTINGS = {
  WEBHOOK_UID_MANAGEMENT: "",
  WEBHOOK_USER_MANAGEMENT: "",
  WEBHOOK_LIMIT_MANAGEMENT: "",
  WEBHOOK_FREE_PORTALS: "",
  WEBHOOK_API_KEY_CHANGES: "",
  zytrone_API_URL: "https://gtccheats.xyz/Api/uidbypassapi/api_user.php",
  zytrone_MASTER_API_KEY: "",
  TRIAL_PAID_UID_ENABLED: "false", // "true" or "false"
};

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

/**
 * Fetch a single system setting value by key.
 * If the setting doesn't exist in the DB, it returns the default defined above.
 */
export async function getSystemSetting(key: SettingKey): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey: key },
    });

    if (setting) {
      return setting.settingValue;
    }
  } catch (error) {
    console.error(`Failed to fetch setting ${key}:`, error);
  }

  // Fallback to default
  return DEFAULT_SETTINGS[key];
}

/**
 * Fetch all system settings as an object.
 */
export async function getAllSystemSettings(): Promise<Record<SettingKey, string>> {
  try {
    const settings = await prisma.systemSetting.findMany();
    
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
    
    settings.forEach((s) => {
      settingsMap[s.settingKey] = s.settingValue;
    });

    return settingsMap as Record<SettingKey, string>;
  } catch (error) {
    console.error("Failed to fetch all settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update multiple system settings at once.
 */
export async function updateSystemSettings(updates: Partial<Record<SettingKey, string>>) {
  try {
    const transactions = Object.entries(updates).map(([key, value]) => {
      return prisma.systemSetting.upsert({
        where: { settingKey: key },
        update: { settingValue: value as string },
        create: { settingKey: key, settingValue: value as string },
      });
    });

    await prisma.$transaction(transactions);
    return true;
  } catch (error) {
    console.error("Failed to update settings:", error);
    return false;
  }
}
