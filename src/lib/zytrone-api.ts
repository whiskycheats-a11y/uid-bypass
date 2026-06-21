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

import { getSystemSetting } from "./system-settings";

async function callzytrone(
  endpoint: string,
  params: Record<string, string>
): Promise<zytroneResponse> {
  const zytrone_API_URL = await getSystemSetting("zytrone_API_URL");
  const zytrone_MASTER_KEY = await getSystemSetting("zytrone_MASTER_API_KEY");

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
      copyright: "zytrone On Top (Rapidfire Corp)",
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
