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


async function callzytrone(
  endpoint: string,
  params: Record<string, string>
): Promise<zytroneResponse> {
  const zytrone_API_URL = process.env.ZYTRONE_API_URL || "https://api.zytrone.org";
  const zytrone_MASTER_KEY = process.env.ZYTRONE_MASTER_KEY || "";

  const url = new URL(`/api/${endpoint}`, zytrone_API_URL);
  url.searchParams.set("key", zytrone_MASTER_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      return {
        success: false,
        status: res.status,
        action: endpoint,
        uid: params.uid || params.old_uid || "",
        message: `API returned non-JSON response (Status ${res.status}). Please check ZYTRONE_API_URL and ZYTRONE_MASTER_KEY in Vercel Environment Variables.`,
        data: null,
        copyright: "UID Bypass",
      };
    }

    const data = await res.json();
    return data as zytroneResponse;
  } catch (error) {
    return {
      success: false,
      status: 500,
      action: endpoint,
      uid: params.uid || params.old_uid || "",
      message: error instanceof Error ? error.message : "API request failed",
      data: null,
      copyright: "UID Bypass",
    };
  }
}

export async function addUid(uid: string, days: number): Promise<zytroneResponse> {
  return callzytrone("add", { uid, days: days.toString() });
}

export async function extendUid(uid: string, days: number): Promise<zytroneResponse> {
  return callzytrone("extend", { uid, days: days.toString() });
}

export async function replaceUid(oldUid: string, newUid: string): Promise<zytroneResponse> {
  return callzytrone("replace", { old_uid: oldUid, new_uid: newUid });
}

export async function removeUid(uid: string): Promise<zytroneResponse> {
  return callzytrone("remove", { uid });
}

export async function getUidInfo(uid: string): Promise<zytroneResponse> {
  return callzytrone("info", { uid });
}
