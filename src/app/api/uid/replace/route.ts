import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as zytroneApi from "@/lib/zytrone-api";
import { replaceUidSchema } from "@/lib/validators";
import { sendUidActionWebhook } from "@/lib/discord-webhook";

async function authenticateRequest(req: Request) {
  const session = await auth();
  if (session?.user?.id) {
    return await prisma.user.findUnique({ where: { id: session.user.id } });
  }
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

export async function GET(req: Request) { return handleReplaceUid(req, true); }
export async function POST(req: Request) { return handleReplaceUid(req, false); }

async function handleReplaceUid(req: Request, isGet: boolean) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    let oldUid: string;
    let newUid: string;

    if (isGet) {
      const url = new URL(req.url);
      oldUid = url.searchParams.get("old_uid") || "";
      newUid = url.searchParams.get("new_uid") || "";
      const validation = replaceUidSchema.safeParse({ oldUid, newUid });
      if (!validation.success) return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
    } else {
      const body = await req.json();
      const validation = replaceUidSchema.parse(body);
      oldUid = validation.oldUid;
      newUid = validation.newUid;
    }

    // Ownership check
    let targetUserId = user.id;
    let existingUid = await prisma.uid.findFirst({ where: { uidValue: oldUid, userId: user.id } });
    
    if (!existingUid) {
      if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        existingUid = await prisma.uid.findFirst({ where: { uidValue: oldUid } });
        if (existingUid) {
          targetUserId = existingUid.userId;
        } else {
          return NextResponse.json({ message: "UID not found in local database." }, { status: 404 });
        }
      } else {
        return NextResponse.json({ message: "Forbidden. You do not own this UID." }, { status: 403 });
      }
    }

    // Call UID Bypass API internally (No limit deduction for Replace)
    const response = await zytroneApi.replaceUid(oldUid, newUid);
    
    if (response.success) {
      // Update local database record if exists
      if (existingUid) {
        await prisma.uid.update({
          where: { id: existingUid.id },
          data: { uidValue: newUid },
        });
      }

      await prisma.activityLog.create({
        data: { userId: user.id, action: "replace_uid", description: `Replaced UID ${oldUid} with ${newUid}. Free.`, metadata: response ? JSON.parse(JSON.stringify(response)) : null },
      });

      await sendUidActionWebhook({ action: "Replace UID", username: user.username, uid: `${oldUid} -> ${newUid}`, days: 0, response: response.message || "Success", status: "success" });
      
      return NextResponse.json({ 
        success: true, 
        message: "UID replaced successfully", 
        data: {
          ...response,
          issued_by: user.username
        } 
      }, { status: 200 });
    } else {
      await sendUidActionWebhook({ action: "Replace UID", username: user.username, uid: `${oldUid} -> ${newUid}`, days: 0, response: response.message || "Failed", status: "error" });
      return NextResponse.json({ success: false, message: response.message || "Failed to replace UID" }, { status: 400 });
    }
  } catch (error: unknown) {
    if ((error as Error).name === "ZodError") return NextResponse.json({ message: (error as unknown as { issues: { message: string }[] }).issues[0].message }, { status: 400 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
