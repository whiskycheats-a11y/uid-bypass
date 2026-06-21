import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ hasUnread: false }, { status: 401 });
    }

    const url = new URL(req.url);
    const lastRead = url.searchParams.get("lastRead");
    const username = session.user.username;

    if (!lastRead || !username) {
      return NextResponse.json({ hasUnread: false });
    }

    const unreadMessages = await prisma.chatMessage.count({
      where: {
        createdAt: {
          gt: new Date(lastRead)
        },
        OR: [
          { content: { contains: `@${username}` } },
          { content: { contains: "@everyone" } },
          { content: { contains: "@here" } }
        ]
      }
    });

    return NextResponse.json({ hasUnread: unreadMessages > 0 });
  } catch (_error) {
    return NextResponse.json({ hasUnread: false });
  }
}
