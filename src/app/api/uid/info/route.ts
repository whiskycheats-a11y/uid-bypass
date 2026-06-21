import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as zytroneApi from "@/lib/zytrone-api";
import { infoUidSchema } from "@/lib/validators";
import { z } from "zod";

async function authenticateRequest(req: Request) {
  const session = await auth();
  if (session?.user?.id) return await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } });
  
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key) return await prisma.user.findUnique({ where: { apiKey: key } });
  return null;
}

export async function GET(req: Request) { return handleInfoUid(req, true); }
export async function POST(req: Request) { return handleInfoUid(req, false); }

async function handleInfoUid(req: Request, isGet: boolean) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    let uid: string;
    if (isGet) {
      uid = new URL(req.url).searchParams.get("uid") || "";
      const validation = infoUidSchema.safeParse({ uid });
      if (!validation.success) return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
    } else {
      const body = await req.json();
      uid = infoUidSchema.parse(body).uid;
    }

    const response = await zytroneApi.getUidInfo(uid);
    
    if (response.success) {
      await prisma.activityLog.create({
        data: { userId: user.id, action: "info_uid", description: `Checked info for UID ${uid}.`, metadata: response ? JSON.parse(JSON.stringify(response)) : null },
      });
      return NextResponse.json({ 
        success: true, 
        message: "Info retrieved successfully", 
        data: {
          ...response,
          issued_by: user.username
        } 
      }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: response.message || "Failed to retrieve UID info" }, { status: 400 });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
