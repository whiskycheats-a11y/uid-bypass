import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateFreePortalSchema } from "@/lib/validators";
import { z } from "zod";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const portalId = parseInt(id, 10);
    if (isNaN(portalId)) return NextResponse.json({ message: "Invalid portal ID" }, { status: 400 });

    const userId = parseInt(session.user.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const portal = await prisma.freePortal.findUnique({ where: { id: portalId } });
    if (!portal) return NextResponse.json({ message: "Portal not found" }, { status: 404 });

    if (portal.userId !== userId && user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    // Validate request body
    const data = updateFreePortalSchema.parse({ ...body, portalId });

    let expiresAt = portal.expiresAt;
    if (data.expiryDays !== undefined) {
      if (data.expiryDays === null || data.expiryDays === 0) {
        expiresAt = null; // Remove expiry
      } else {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + data.expiryDays);
      }
    }

    const updatedPortal = await prisma.freePortal.update({
      where: { id: portalId },
      data: {
        brandName: data.brandName !== undefined ? data.brandName : undefined,
        durationHours: data.durationHours !== undefined ? data.durationHours : undefined,
        maxUids: data.maxUids !== undefined ? data.maxUids : undefined,
        expiresAt: expiresAt,
      }
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: "edit_portal",
        description: `Updated free portal settings for ${updatedPortal.brandName}.`,
      }
    });

    return NextResponse.json({ message: "Portal updated successfully", portal: updatedPortal }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const portalId = parseInt(id, 10);
    if (isNaN(portalId)) return NextResponse.json({ message: "Invalid portal ID" }, { status: 400 });

    const userId = parseInt(session.user.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const portal = await prisma.freePortal.findUnique({ where: { id: portalId } });
    if (!portal) return NextResponse.json({ message: "Portal not found" }, { status: 404 });

    if (portal.userId !== userId && user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.freePortal.delete({ where: { id: portalId } });

    await prisma.activityLog.create({
      data: {
        userId,
        action: "delete_portal",
        description: `Deleted free portal: ${portal.brandName}.`,
      }
    });

    return NextResponse.json({ message: "Portal deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
