import { getSystemSetting } from "./system-settings";

export async function sendDiscordWebhook(
  webhookUrl: string | undefined,
  embed: DiscordEmbed
): Promise<boolean> {
  if (!webhookUrl) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    console.error("Discord webhook failed");
    return false;
  }
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
}

const COLORS = {
  green: 0x10b981,
  yellow: 0xf59e0b,
  red: 0xef4444,
  blue: 0x3b82f6,
  purple: 0x8b5cf6,
};

export function buildUidWebhook(
  action: "add" | "extend" | "replace" | "remove" | "info" | "error",
  userEmail: string,
  uid: string,
  details: Record<string, string | number>
): DiscordEmbed {
  const titles: Record<string, string> = {
    add: "🔑 UID Added",
    extend: "⏰ UID Extended",
    replace: "🔄 UID Replaced",
    remove: "🗑️ UID Removed",
    info: "🔍 UID Checked",
    error: "❌ UID Action Failed",
  };

  const colors: Record<string, number> = {
    add: COLORS.green,
    extend: COLORS.blue,
    replace: COLORS.yellow,
    remove: COLORS.red,
    info: COLORS.purple,
    error: COLORS.red,
  };

  const fields = [
    { name: "👤 User", value: `\`${userEmail}\``, inline: true },
    { name: "🔑 UID", value: `\`${uid}\``, inline: true },
  ];

  for (const [key, value] of Object.entries(details)) {
    fields.push({
      name: key,
      value: `\`${value}\``,
      inline: true,
    });
  }

  return {
    title: titles[action] || "UID Action",
    color: colors[action] || COLORS.purple,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: "UID BYPASS RESELLER Management" },
  };
}

export function buildUserManagementWebhook(
  action: "add" | "edit" | "delete",
  managerEmail: string,
  targetEmail: string,
  targetRole: string,
  details: string
): DiscordEmbed {
  const titles: Record<string, string> = {
    add: "👤 User Created",
    edit: "✏️ User Updated",
    delete: "🗑️ User Deleted",
  };

  const colors: Record<string, number> = {
    add: COLORS.green,
    edit: COLORS.yellow,
    delete: COLORS.red,
  };

  return {
    title: titles[action] || "User Management",
    color: colors[action] || COLORS.purple,
    fields: [
      { name: "👤 Manager", value: `\`${managerEmail}\``, inline: true },
      { name: "🎯 Target", value: `\`${targetEmail}\``, inline: true },
      { name: "🏷️ Role", value: `\`${targetRole}\``, inline: true },
      { name: "📝 Details", value: details, inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "UID BYPASS RESELLER Management" },
  };
}

export async function sendUidActionWebhook(data: {
  action: string;
  username: string;
  uid: string;
  days: number;
  response: string;
  status: "success" | "error";
}) {
  let mappedAction: "add" | "extend" | "replace" | "remove" | "info" | "error" = "error";
  if (data.status === "error") {
    mappedAction = "error";
  } else if (data.action.toLowerCase().includes("add")) {
    mappedAction = "add";
  } else if (data.action.toLowerCase().includes("extend")) {
    mappedAction = "extend";
  } else if (data.action.toLowerCase().includes("replace")) {
    mappedAction = "replace";
  } else if (data.action.toLowerCase().includes("remove")) {
    mappedAction = "remove";
  } else if (data.action.toLowerCase().includes("whitelist")) {
    mappedAction = "add";
  }

  const embed = buildUidWebhook(mappedAction, data.username, data.uid, {
    Days: data.days,
    Response: data.response,
    Action: data.action
  });

  const webhookUrl = await getSystemSetting("WEBHOOK_UID_MANAGEMENT");
  await sendDiscordWebhook(webhookUrl, embed);
}

export async function sendUserManagementWebhook(
  action: "add" | "edit" | "delete",
  managerEmail: string,
  targetEmail: string,
  targetRole: string,
  details: string
) {
  const embed = buildUserManagementWebhook(action, managerEmail, targetEmail, targetRole, details);
  const webhookUrl = await getSystemSetting("WEBHOOK_USER_MANAGEMENT");
  await sendDiscordWebhook(webhookUrl, embed);
}

export async function sendLimitManagementWebhook(
  managerEmail: string,
  targetEmail: string,
  amount: number,
  limitType: string,
  action: string
) {
  const embed: DiscordEmbed = {
    title: "📊 Limit Management",
    color: 0xf59e0b, // yellow
    fields: [
      { name: "👤 Manager", value: `\`${managerEmail}\``, inline: true },
      { name: "🎯 Target", value: `\`${targetEmail}\``, inline: true },
      { name: "💰 Amount", value: `\`${amount}\``, inline: true },
      { name: "🏷️ Type", value: `\`${limitType}\``, inline: true },
      { name: "📝 Action", value: `\`${action}\``, inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "UID BYPASS RESELLER Management" },
  };
  const webhookUrl = await getSystemSetting("WEBHOOK_LIMIT_MANAGEMENT");
  await sendDiscordWebhook(webhookUrl, embed);
}

export async function sendFreePortalWebhook(
  username: string,
  brandName: string,
  durationHours: number,
  maxUids: number
) {
  const embed: DiscordEmbed = {
    title: "🌐 Free Portal Created",
    color: 0x3b82f6, // blue
    fields: [
      { name: "👤 Reseller", value: `\`${username}\``, inline: true },
      { name: "🏷️ Brand", value: `\`${brandName}\``, inline: true },
      { name: "⏱️ Duration", value: `\`${durationHours} Hours\``, inline: true },
      { name: "🎯 Max UIDs", value: `\`${maxUids}\``, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "UID BYPASS RESELLER Management" },
  };
  const webhookUrl = await getSystemSetting("WEBHOOK_FREE_PORTALS");
  await sendDiscordWebhook(webhookUrl, embed);
}

export async function sendApiKeyChangeWebhook(
  username: string,
  email: string
) {
  const embed: DiscordEmbed = {
    title: "🔑 API Key Regenerated",
    color: 0x8b5cf6, // purple
    fields: [
      { name: "👤 User", value: `\`${username}\``, inline: true },
      { name: "📧 Email", value: `\`${email}\``, inline: true },
      { name: "⚠️ Warning", value: "Old API key was invalidated.", inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "UID BYPASS RESELLER Management" },
  };
  const webhookUrl = await getSystemSetting("WEBHOOK_API_KEY_CHANGES");
  await sendDiscordWebhook(webhookUrl, embed);
}
