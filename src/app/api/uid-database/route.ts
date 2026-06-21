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
    if (adminRole !== "ADMIN" && adminRole !== "MANAGER") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    let uids;
    if (adminRole === "ADMIN") {
      // Admin sees ALL UIDs
      uids = await prisma.uid.findMany({
        include: {
          user: {
            select: { username: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Manager sees UIDs of users they created, plus their own UIDs
      uids = await prisma.uid.findMany({
        where: {
          OR: [
            { userId: parseInt(session.user.id) },
            { user: { createdBy: parseInt(session.user.id) } }
          ]
        },
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
