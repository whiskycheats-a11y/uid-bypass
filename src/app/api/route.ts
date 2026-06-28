import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as zytroneApi from "@/lib/zytrone-api";
import { sendUidActionWebhook } from "@/lib/discord-webhook";

// Helper to handle both GET and POST requests in the same way (gtccheats/keyauth standard format)
async function handleUniversalApi(req: Request) {
  try {
    const url = new URL(req.url);
    
    // Parse params from URL (GET) or JSON Body (POST)
    let params: Record<string, any> = {};
    if (req.method === "POST") {
      try { 
        params = await req.json(); 
      } catch (e) {
        // Fallback to form data if JSON fails
        try {
          const formData = await req.formData();
          formData.forEach((value, key) => { params[key] = value.toString(); });
        } catch(err) {}
      }
    }
    
    // Helper to gracefully extract either URL search params or body params
    const getParam = (key: string) => params[key] || url.searchParams.get(key) || "";

    const apiKey = getParam("key") || getParam("api_key");
    const action = getParam("action");
    const uid = getParam("uid") || getParam("account_id");
    const daysStr = getParam("days") || getParam("for_days") || "0";
    const days = parseInt(daysStr, 10);

    // 1. Validate API Key
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "API key is required." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { apiKey } });
    if (!user || user.apiAccessEnabled === false) {
      return NextResponse.json({ success: false, message: "Invalid or disabled API key." }, { status: 401 });
    }

    // 2. Validate Action
    if (!action) {
      return NextResponse.json({ success: false, message: "Action is required (e.g. action=add)." }, { status: 400 });
    }

    // --- HANDLE ACTIONS ---

    // [ADD / EXTEND]
    if (action === "add" || action === "extend") {
      if (!uid) return NextResponse.json({ success: false, message: "UID (account_id) is required." }, { status: 400 });
      if (days <= 0) return NextResponse.json({ success: false, message: "Valid days (for_days) is required." }, { status: 400 });
      
      if (user.uidLimit < 1) {
        return NextResponse.json({ success: false, message: "Insufficient UID limit." }, { status: 403 });
      }

      // Hit Backend
      const response = await zytroneApi.addUid(uid, days);
      
      if (response.success) {
        // Deduct Limit
        await prisma.user.update({ where: { id: user.id }, data: { uidLimit: { decrement: 1 } } });
        
        // Calculate Expiry
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        
        // Save to Database
        const existingUid = await prisma.uid.findFirst({ where: { userId: user.id, uidValue: uid } });
        if (existingUid) {
          await prisma.uid.update({ where: { id: existingUid.id }, data: { duration: days, status: "ACTIVE", expiresAt } });
        } else {
          await prisma.uid.create({ data: { userId: user.id, uidValue: uid, duration: days, status: "ACTIVE", expiresAt } });
        }
        
        // Log Activity
        await prisma.activityLog.create({
          data: { userId: user.id, action: "add_uid_api", description: `API Bot added UID ${uid} for ${days} days.`, metadata: response ? JSON.parse(JSON.stringify(response)) : null },
        });

        await sendUidActionWebhook({ action: "API Bot Add", username: user.username, uid, days, response: response.message || "Success", status: "success" });
        return NextResponse.json({ success: true, message: "UID added successfully", data: response }, { status: 200 });
      } else {
        let errorMsg = response.message || "Failed to add UID";
        if (errorMsg.toLowerCase().includes("already") || errorMsg.toLowerCase().includes("active")) {
          errorMsg = "Your UID is already whitelisted.";
        }
        await sendUidActionWebhook({ action: "API Bot Add", username: user.username, uid, days, response: errorMsg, status: "error" });
        return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
      }
    } 
    
    // [REMOVE]
    else if (action === "remove") {
      if (!uid) return NextResponse.json({ success: false, message: "UID (account_id) is required." }, { status: 400 });
      
      const response = await zytroneApi.removeUid(uid);
      if (response.success) {
        await prisma.uid.deleteMany({ where: { userId: user.id, uidValue: uid } });
        await prisma.activityLog.create({
          data: { userId: user.id, action: "remove_uid_api", description: `API Bot removed UID ${uid}.`, metadata: response ? JSON.parse(JSON.stringify(response)) : null },
        });
        await sendUidActionWebhook({ action: "API Bot Remove", username: user.username, uid, days: 0, response: "Removed", status: "success" });
        return NextResponse.json({ success: true, message: "UID removed successfully" }, { status: 200 });
      }
      return NextResponse.json({ success: false, message: response.message || "Failed to remove" }, { status: 400 });
    }
    
    // [CHECK / INFO]
    else if (action === "check" || action === "info" || action === "check_uid") {
      if (!uid) return NextResponse.json({ success: false, message: "UID (account_id) is required." }, { status: 400 });
      
      const response = await zytroneApi.getUidInfo(uid);
      if (response.success) {
        return NextResponse.json({ success: true, message: "Info retrieved", data: response }, { status: 200 });
      }
      return NextResponse.json({ success: false, message: response.message || "Failed to check info" }, { status: 400 });
    }
    
    // [UNKNOWN]
    return NextResponse.json({ success: false, message: "Invalid action provided." }, { status: 400 });

  } catch (error) {
    console.error("Universal API Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleUniversalApi(req);
}

export async function POST(req: Request) {
  return handleUniversalApi(req);
}
