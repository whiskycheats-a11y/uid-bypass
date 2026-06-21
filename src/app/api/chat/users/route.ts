import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        username: true,
        role: true,
        profilePicture: true,
      },
      orderBy: { username: "asc" }
    });

    return NextResponse.json({ users });
  } catch (_error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
