import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as zytroneApi from "@/lib/zytrone-api";
import { addUidSchema } from "@/lib/validators";
import { sendUidActionWebhook } from "@/lib/discord-webhook";

// Helper to authenticate via Session OR API Key
async function authenticateRequest(req: Request) {
  // 1. Try Session Auth (Web Dashboard)
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    return user;
  }

  // 2. Try API Key Auth (External Scripts/Bots)
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key) {
    const user = await prisma.user.findUnique({ where: { apiKey: key } });
    return user;
  }

  return null;
}

// Handle GET requests (External API / Bots)
export async function GET(req: Request) {
  return handleAddUid(req, true);
}

// Handle POST requests (Web Dashboard)
export async function POST(req: Request) {
  return handleAddUid(req, false);
}

async function handleAddUid(req: Request, isGet: boolean) {
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

      const validation = addUidSchema.safeParse({ uid, days });
      if (!validation.success) {
        return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
      }
    } else {
      const body = await req.json();
      const validation = addUidSchema.parse(body);
      uid = validation.uid;
      days = validation.days;
    }

    if (user.uidLimit < 1) {
      return NextResponse.json({ message: "Insufficient UID limit. You need at least 1." }, { status: 403 });
    }

    // Call UID Bypass API internally (MASTER KEY IS SECURELY HIDDEN)
    const response = await zytroneApi.addUid(uid, days);

    if (response.success) {
      await prisma.user.update({
        where: { id: user.id },
        data: { uidLimit: { decrement: 1 } },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const existingUid = await prisma.uid.findFirst({
        where: { userId: user.id, uidValue: uid }
      });

      if (existingUid) {
        await prisma.uid.update({
          where: { id: existingUid.id },
          data: { duration: days, status: "ACTIVE", expiresAt }
        });
      } else {
        await prisma.uid.create({
          data: { userId: user.id, uidValue: uid, duration: days, status: "ACTIVE", expiresAt },
        });
      }

      await prisma.activityLog.create({
        data: { userId: user.id, action: "add_uid", description: `Added UID ${uid} for ${days} days. Cost: 1 limit.`, metadata: response ? JSON.parse(JSON.stringify(response)) : null },
      });

      await sendUidActionWebhook({ action: "Add UID", username: user.username, uid, days, response: response.message || "Success", status: "success" });

      return NextResponse.json({
        success: true,
        message: "UID added successfully",
        data: {
          ...response,
          issued_by: user.username,
          remaining_uid_limit: user.uidLimit - 1
        }
      }, { status: 200 });
    } else {
      await sendUidActionWebhook({ action: "Add UID", username: user.username, uid, days, response: response.message || "Failed", status: "error" });
      return NextResponse.json({ success: false, message: response.message || "Failed to add UID" }, { status: 400 });
    }
  } catch (error: unknown) {
    if ((error as Error).name === "ZodError") return NextResponse.json({ message: (error as unknown as { issues: { message: string }[] }).issues[0].message }, { status: 400 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
