import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as zytroneApi from "@/lib/zytrone-api";
import { clientWhitelistSchema } from "@/lib/validators";
import { sendUidActionWebhook } from "@/lib/discord-webhook";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { portalToken, uid } = clientWhitelistSchema.parse(body);

    // Get the portal
    const portal = await prisma.freePortal.findUnique({
      where: { token: portalToken },
      include: { user: true },
    });

    if (!portal) {
      return NextResponse.json({ message: "Invalid portal link." }, { status: 404 });
    }

    if (portal.usedUids >= portal.maxUids) {
      return NextResponse.json({ message: "This portal has reached its maximum uses." }, { status: 403 });
    }

    const creator = portal.user;

    // Check if the creator still has free limit (Admins bypass)
    if ((creator.role as string) !== "ADMIN" && (creator.role as string) !== "SUPER_ADMIN" && creator.freeUidLimit < 1) {
      return NextResponse.json({ message: "The reseller's free limit has been exhausted." }, { status: 403 });
    }

    // Call UID Bypass API to add the UID for the portal's duration
    // const durationDays = Math.max(1, Math.ceil(portal.durationHours / 24)); // Round up to days for the API if necessary, or pass hours if API supports it.
    // Assuming zytrone takes days. Since 72h = 3 days, 24h = 1 day. 
    // If zytrone takes only days:
    const daysToAdd = Math.max(1, Math.round(portal.durationHours / 24));
    let response = await zytroneApi.addUid(uid, daysToAdd);

    if (!response.success && response.message && response.message.includes("already active under this key. Use /api/extend")) {
      response = await zytroneApi.extendUid(uid, daysToAdd);
    }

    if (response.success) {
      // Deduct from portal uses
      await prisma.freePortal.update({
        where: { id: portal.id },
        data: { usedUids: { increment: 1 } },
      });

      // Deduct from creator's free limit (unless Admin)
      if (creator.role !== "ADMIN" && creator.role !== "SUPER_ADMIN") {
        await prisma.user.update({
          where: { id: creator.id },
          data: { freeUidLimit: { decrement: 1 } },
        });
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + portal.durationHours);

      // We still store it in the DB as owned by the creator for tracking
      await prisma.uid.create({
        data: {
          userId: creator.id,
          uidValue: uid,
          duration: daysToAdd,
          status: "ACTIVE",
          expiresAt,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: creator.id,
          action: "add_uid",
          description: `Client used Free Portal (${portal.brandName}) to whitelist UID ${uid} for ${portal.durationHours}h. Cost: 1 Free Limit.`,
          metadata: response ? JSON.parse(JSON.stringify(response)) : null,
        },
      });

      await sendUidActionWebhook({
        action: "Free Portal Whitelist",
        username: creator.username,
        uid: uid,
        days: daysToAdd,
        response: response.message || "Success",
        status: "success"
      });

      return NextResponse.json({ message: "UID Whitelisted successfully!", data: response }, { status: 200 });
    } else {
      return NextResponse.json({ message: response.message || "Failed to whitelist UID." }, { status: 400 });
    }

  } catch (error: unknown) {
    if ((error as Error).name === "ZodError") {
      return NextResponse.json({ message: (error as unknown as { issues: { message: string }[] }).issues[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
