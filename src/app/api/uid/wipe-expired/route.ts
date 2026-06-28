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
    
    let deletedCount = 0;

    // Find all expired UIDs based on user role
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      // Admins can wipe ALL expired UIDs globally
      const expiredUids = await prisma.uid.findMany({
        where: { expiresAt: { lt: new Date() } }
      });
      
      if (expiredUids.length > 0) {
        const result = await prisma.uid.deleteMany({
          where: { expiresAt: { lt: new Date() } }
        });
        deletedCount = result.count;
      }
    } else if (userRole === "MANAGER") {
      // Managers wipe their own and their created users' expired UIDs
      const expiredUids = await prisma.uid.findMany({
        where: {
          expiresAt: { lt: new Date() },
          OR: [
            { userId: userId },
            { user: { createdBy: userId } }
          ]
        }
      });

      if (expiredUids.length > 0) {
        const result = await prisma.uid.deleteMany({
          where: {
            expiresAt: { lt: new Date() },
            OR: [
              { userId: userId },
              { user: { createdBy: userId } }
            ]
          }
        });
        deletedCount = result.count;
      }
    } else {
      // Resellers wipe only their own expired UIDs
      const expiredUids = await prisma.uid.findMany({
        where: {
          expiresAt: { lt: new Date() },
          userId: userId
        }
      });

      if (expiredUids.length > 0) {
        const result = await prisma.uid.deleteMany({
          where: {
            expiresAt: { lt: new Date() },
            userId: userId
          }
        });
        deletedCount = result.count;
      }
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
