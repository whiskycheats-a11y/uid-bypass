import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendUidActionWebhook } from "@/lib/discord-webhook";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden. Only SUPER_ADMIN can wipe UIDs." }, { status: 403 });
    }

    let deletedCount = 0;

    // Find all expired UIDs globally
    const expiredUids = await prisma.uid.findMany({
      where: { expiresAt: { lt: new Date() } }
    });
    
    if (expiredUids.length > 0) {
      const result = await prisma.uid.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      });
      deletedCount = result.count;
    }

    if (deletedCount > 0) {
      await prisma.activityLog.create({
        data: { userId, action: "wipe_expired", description: `Wiped ${deletedCount} expired UIDs from database to free up space.` },
      });
      
      await sendUidActionWebhook({ 
        action: "Wipe Expired UIDs", 
        username: session.user.username, 
        uid: `${deletedCount} UIDs`, 
        days: 0, 
        response: `Successfully wiped ${deletedCount} expired UIDs permanently.`, 
        status: "success" 
      });
      
      return NextResponse.json({ success: true, message: `Successfully permanently deleted ${deletedCount} expired UIDs.` }, { status: 200 });
    } else {
      return NextResponse.json({ success: true, message: "No expired UIDs found to wipe." }, { status: 200 });
    }

  } catch (error) {
    console.error("Wipe expired UIDs error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
