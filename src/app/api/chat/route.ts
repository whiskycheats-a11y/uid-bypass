import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Auto-delete messages older than 6 days
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    await prisma.chatMessage.deleteMany({
      where: { createdAt: { lt: sixDaysAgo } },
    });

    const messages = await prisma.chatMessage.findMany({
      take: 50,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { username: true, role: true, profilePicture: true } },
      },
    });

    return NextResponse.json({ messages });
  } catch (_error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { content } = await req.json();

    if (!content || content.trim() === "") {
      return NextResponse.json({ message: "Message cannot be empty" }, { status: 400 });
    }

    if (content.includes("@everyone") || content.includes("@here")) {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Only Admins can ping @everyone or @here" }, { status: 403 });
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        userId,
        content: content.trim(),
      },
      include: {
        user: { select: { username: true, role: true, profilePicture: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
