import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden. Only Super Admins can access audit logs." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { action: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { user: { username: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ]
      },
      include: {
        user: { select: { username: true, role: true, email: true, profilePicture: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (_error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
