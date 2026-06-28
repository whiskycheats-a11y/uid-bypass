import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminRole = session.user.role;
    // Allow everyone to access their relevant UIDs

    let uids;
    if (adminRole === "ADMIN" || adminRole === "SUPER_ADMIN") {
      // Admin sees ALL UIDs
      uids = await prisma.uid.findMany({
        include: {
          user: {
            select: { username: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (adminRole === "MANAGER") {
      // Manager sees UIDs of users they created, plus their own UIDs
      uids = await prisma.uid.findMany({
        where: {
          OR: [
            { userId: session.user.id },
            { user: { createdBy: session.user.id } }
          ]
        },
        include: {
          user: {
            select: { username: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Reseller only sees their own UIDs
      uids = await prisma.uid.findMany({
        where: { userId: session.user.id },
        include: {
          user: {
            select: { username: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ uids }, { status: 200 });
  } catch (error) {
    console.error("Fetch UID database error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
