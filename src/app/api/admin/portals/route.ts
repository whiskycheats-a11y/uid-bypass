import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const portals = await prisma.freePortal.findMany({
      include: {
        user: { select: { username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ portals }, { status: 200 });
  } catch (error) {
    console.error("Admin fetch portals error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Portal ID required" }, { status: 400 });
    }

    await prisma.freePortal.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true, message: "Portal deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Admin delete portal error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
