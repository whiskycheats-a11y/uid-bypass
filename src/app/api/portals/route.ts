import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFreePortalSchema } from "@/lib/validators";
import { z } from "zod";
import { sendFreePortalWebhook } from "@/lib/discord-webhook";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { brandName, durationHours, maxUids, expiryDays } = createFreePortalSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    // Resellers can only create free portals if they have at least 25 paid UIDs
    if (user.role === "RESELLER" && user.uidLimit < 25) {
      return NextResponse.json({ 
        message: `You must have at least 25 paid UIDs available to create a free portal.` 
      }, { status: 403 });
    }

    // Validate if the user has enough free UIDs to cover maxUids
    // (Admins bypass the free limit entirely)
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.freeUidLimit < maxUids) {
      return NextResponse.json({ 
        message: `Insufficient free limit. You only have ${user.freeUidLimit} free UIDs remaining.` 
      }, { status: 400 });
    }

    // Generate a random 10-character alphanumeric token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let expiresAt: Date | null = null;
    if (expiryDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
    }

    // Create the portal
    const portal = await prisma.freePortal.create({
      data: {
        userId,
        brandName,
        durationHours,
        maxUids,
        usedUids: 0,
        token,
        expiresAt,
      }
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: "create_portal",
        description: `Created free portal for ${brandName} (max ${maxUids} uses, ${durationHours}h each).`,
      }
    });

    await sendFreePortalWebhook(user.username, brandName, durationHours, maxUids);

    return NextResponse.json({ message: "Portal created successfully", portal }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
