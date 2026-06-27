import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createAlertSchema = z.object({
  type: z.enum(["INFO", "SUCCESS", "WARNING", "DANGER", "ANNOUNCEMENT"]),
  message: z.string().min(3, "Message must be at least 3 characters").max(500),
  startsAt: z.string().optional(),
  endsAt: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { type, message, startsAt, endsAt } = createAlertSchema.parse(body);

    const alert = await prisma.systemAlert.create({
      data: {
        type,
        message,
        active: true,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    return NextResponse.json({ message: "Alert broadcasted successfully", alert }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";

    if (!id) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

    await prisma.systemAlert.delete({ where: { id } });

    return NextResponse.json({ message: "Alert removed successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
