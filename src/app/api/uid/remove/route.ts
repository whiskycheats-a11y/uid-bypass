import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as zytroneApi from "@/lib/zytrone-api";
import { removeUidSchema } from "@/lib/validators";
import { sendUidActionWebhook } from "@/lib/discord-webhook";

async function authenticateRequest(req: Request) {
  const session = await auth();
  if (session?.user?.id) return await prisma.user.findUnique({ where: { id: session.user.id } });
  
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key) {
    // @ts-ignore
    const user = await prisma.user.findUnique({ where: { apiKey: key } });
    if (user && user.apiAccessEnabled === false) return null;
    return user;
  }
  return null;
}

export async function GET(req: Request) { return handleRemoveUid(req, true); }
export async function POST(req: Request) { return handleRemoveUid(req, false); }

async function handleRemoveUid(req: Request, isGet: boolean) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    let uid: string;
    if (isGet) {
      uid = new URL(req.url).searchParams.get("uid") || "";
      const validation = removeUidSchema.safeParse({ uid });
      if (!validation.success) return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
    } else {
      const body = await req.json();
      uid = removeUidSchema.parse(body).uid;
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

    const response = await zytroneApi.removeUid(uid);
    
    if (response.success) {
      if (existingUid) {
        await prisma.uid.delete({
          where: { id: existingUid.id },
        });
      }

      await prisma.activityLog.create({
        data: { userId: user.id, action: "remove_uid", description: `Removed UID ${uid}. Free.`, metadata: response ? JSON.parse(JSON.stringify(response)) : null },
      });

      await sendUidActionWebhook({ action: "Remove UID", username: user.username, uid, days: 0, response: response.message || "Success", status: "success" });
      return NextResponse.json({ 
        success: true, 
        message: "UID removed successfully", 
        data: {
          ...response,
          issued_by: user.username
        } 
      }, { status: 200 });
    } else {
      await sendUidActionWebhook({ action: "Remove UID", username: user.username, uid, days: 0, response: response.message || "Failed", status: "error" });
      return NextResponse.json({ success: false, message: response.message || "Failed to remove UID" }, { status: 400 });
    }
  } catch (error: unknown) {
    if ((error as Error).name === "ZodError") return NextResponse.json({ message: (error as unknown as { issues: { message: string }[] }).issues[0].message }, { status: 400 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
