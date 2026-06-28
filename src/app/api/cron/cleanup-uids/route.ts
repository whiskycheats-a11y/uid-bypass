import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendUidActionWebhook } from "@/lib/discord-webhook";

export async function GET(req: Request) {
  try {
    // Vercel Cron jobs send a secure header to verify it's really them calling the route
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Find all expired UIDs globally
    const expiredUids = await prisma.uid.findMany({
      where: { expiresAt: { lt: new Date() } }
    });
    
    if (expiredUids.length > 0) {
      const result = await prisma.uid.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      });
      
      const deletedCount = result.count;
      
      const adminUser = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
      
      if (adminUser) {
        await prisma.activityLog.create({
          data: { 
            userId: adminUser.id,
            action: "cron_wipe_expired", 
            description: `Vercel Cron automatically wiped ${deletedCount} expired UIDs from database to free up space.` 
          },
        });
      }

      await sendUidActionWebhook({ 
        action: "AUTO-CLEANUP (Cron)", 
        username: "SYSTEM", 
        uid: `${deletedCount} Expired UIDs`, 
        days: 0, 
        response: `Successfully automatically wiped ${deletedCount} expired UIDs permanently.`, 
        status: "success" 
      });

      return NextResponse.json({ success: true, message: `Successfully auto-deleted ${deletedCount} expired UIDs.` }, { status: 200 });
    } else {
      return NextResponse.json({ success: true, message: "No expired UIDs found to auto-delete." }, { status: 200 });
    }

  } catch (error) {
    console.error("Cron wipe expired UIDs error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
