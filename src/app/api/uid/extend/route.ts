import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as zytroneApi from "@/lib/zytrone-api";
import { extendUidSchema } from "@/lib/validators";
import { sendUidActionWebhook } from "@/lib/discord-webhook";

// Helper to authenticate via Session OR API Key
async function authenticateRequest(req: Request) {
  const session = await auth();
  if (session?.user?.id) {
    return await prisma.user.findUnique({ where: { id: session.user.id } });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key) {
    return await prisma.user.findUnique({ where: { apiKey: key } });
  }

  return null;
}

export async function GET(req: Request) {
  return handleExtendUid(req, true);
}

export async function POST(req: Request) {
  return handleExtendUid(req, false);
}

async function handleExtendUid(req: Request, isGet: boolean) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Invalid API Key or Session." }, { status: 401 });
    }

    let uid: string;
    let days: number;

    if (isGet) {
      const url = new URL(req.url);
      uid = url.searchParams.get("uid") || "";
      days = parseInt(url.searchParams.get("days") || "0", 10);
      const validation = extendUidSchema.safeParse({ uid, days });
      if (!validation.success) return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
    } else {
      const body = await req.json();
      const validation = extendUidSchema.parse(body);
      uid = validation.uid;
      days = validation.days;
    }

    if (user.uidLimit < 1) {
      return NextResponse.json({ message: "Insufficient UID limit. You need at least 1." }, { status: 403 });
    }

    // Ownership check
    let targetUserId = user.id;
    let existingUid = await prisma.uid.findFirst({ where: { uidValue: uid, userId: user.id } });
    
    if (!existingUid) {
      if (user.role === "ADMIN") {
        existingUid = await prisma.uid.findFirst({ where: { uidValue: uid } });
        if (existingUid) {
          targetUserId = existingUid.userId;
        } else {
          return NextResponse.json({ message: "UID not found in local database." }, { status: 404 });
        }
      } else {
        return NextResponse.json({ message: "Forbidden. You do not own this UID." }, { status: 403 });
      }
    }

    // Call UID Bypass API internally
    const response = await zytroneApi.extendUid(uid, days);
    
    if (response.success) {
      await prisma.user.update({
        where: { id: user.id },
        data: { uidLimit: { decrement: 1 } },
      });

      // Update existing UID or create if not found locally
      if (existingUid) {
        const newExpiresAt = new Date(existingUid.expiresAt || new Date());
        newExpiresAt.setDate(newExpiresAt.getDate() + days);
        await prisma.uid.update({
          where: { id: existingUid.id },
          data: { expiresAt: newExpiresAt, status: "ACTIVE", duration: { increment: days } },
        });
      } else {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        await prisma.uid.create({
          data: { userId: user.id, uidValue: uid, duration: days, status: "ACTIVE", expiresAt },
        });
      }

      await prisma.activityLog.create({
        data: { userId: user.id, action: "extend_uid", description: `Extended UID ${uid} for ${days} days. Cost: 1 limit.`, metadata: response ? JSON.parse(JSON.stringify(response)) : null },
      });

      await sendUidActionWebhook({ action: "Extend UID", username: user.username, uid, days, response: response.message || "Success", status: "success" });
      
      return NextResponse.json({ 
        success: true, 
        message: "UID extended successfully", 
        data: { 
          ...response, 
          issued_by: user.username, 
          remaining_uid_limit: user.uidLimit - 1 
        } 
      }, { status: 200 });
    } else {
      await sendUidActionWebhook({ action: "Extend UID", username: user.username, uid, days, response: response.message || "Failed", status: "error" });
      return NextResponse.json({ success: false, message: response.message || "Failed to extend UID" }, { status: 400 });
    }
  } catch (error: unknown) {
    if ((error as Error).name === "ZodError") return NextResponse.json({ message: (error as unknown as { issues: { message: string }[] }).issues[0].message }, { status: 400 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
