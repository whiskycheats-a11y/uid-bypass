"use server";



interface zytroneResponse {
  success: boolean;
  status: number;
  action: string;
  uid: string;
  message: string;
  data: Record<string, unknown> | null;
  copyright: string;
}

/**
 * Core function to call the GTC backend API.
 * Uses POST with X-API-KEY header and JSON body, matching the gtccheats.xyz format.
 */
async function callGtcApi(
  action: string,
  body: Record<string, unknown>
): Promise<zytroneResponse> {
  const apiUrl = process.env.ZYTRONE_API_URL;
  const masterKey = process.env.ZYTRONE_MASTER_API_KEY;

  if (!masterKey) {
    return {
      success: false,
      status: 500,
      action,
      uid: (body.account_id as string) || (body.old_uid as string) || "",
      message: "Master API Key is not configured. Add ZYTRONE_MASTER_API_KEY to your Vercel Environment Variables.",
      data: null,
      copyright: "UID Bypass",
    };
  }

  // Build the URL: base + ?action=add / ?action=change_uid etc.
  const url = `${apiUrl}?action=${action}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": masterKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Non-JSON response from backend:", text.substring(0, 500));
      return {
        success: false,
        status: res.status,
        action,
        uid: (body.account_id as string) || (body.old_uid as string) || "",
        message: `API returned non-JSON response (Status ${res.status}). Check API URL and Master Key in Vercel Environment Variables.`,
        data: null,
        copyright: "UID Bypass",
      };
    }

    const data = await res.json();

    // The gtccheats API returns { success: true/false, message: "..." }
    // Normalize to our internal format
    return {
      success: data.success === true,
      status: res.status,
      action,
      uid: (body.account_id as string) || (body.old_uid as string) || "",
      message: data.message || (data.success ? "Success" : "Failed"),
      data: data,
      copyright: "UID Bypass",
    };
  } catch (error) {
    console.error("Backend API call failed:", error);
    return {
      success: false,
      status: 500,
      action,
      uid: (body.account_id as string) || (body.old_uid as string) || "",
      message: error instanceof Error ? error.message : "API request failed",
      data: null,
      copyright: "UID Bypass",
    };
  }
}

/**
 * Add a UID to the whitelist.
 * Maps to: POST ?action=add  body: { account_id, for_days }
 */
export async function addUid(uid: string, days: number): Promise<zytroneResponse> {
  return callGtcApi("add", {
    account_id: uid,
    for_days: days,
  });
}

/**
 * Extend a UID's expiry.
 * Maps to: POST ?action=add  body: { account_id, for_days }
 * (Re-adding extends the duration on the backend)
 */
export async function extendUid(uid: string, days: number): Promise<zytroneResponse> {
  return callGtcApi("add", {
    account_id: uid,
    for_days: days,
  });
}

/**
 * Replace/Change a UID.
 * Maps to: POST ?action=change_uid  body: { old_uid, new_uid }
 */
export async function replaceUid(oldUid: string, newUid: string): Promise<zytroneResponse> {
  return callGtcApi("change_uid", {
    old_uid: oldUid,
    new_uid: newUid,
  });
}

/**
 * Remove a UID from the whitelist.
 * Maps to: POST ?action=remove  body: { account_id }
 */
export async function removeUid(uid: string): Promise<zytroneResponse> {
  return callGtcApi("remove", {
    account_id: uid,
  });
}

/**
 * Get info about a UID.
 * Maps to: POST ?action=info  body: { account_id }
 */
export async function getUidInfo(uid: string): Promise<zytroneResponse> {
  return callGtcApi("info", {
    account_id: uid,
  });
}
