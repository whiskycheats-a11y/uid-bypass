import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { sendUserManagementWebhook, sendLimitManagementWebhook } from "@/lib/discord-webhook";

const createUserSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"]),
  uidLimit: z.number().int().min(0),
  freeUidLimit: z.number().int().min(0),
  profilePicture: z.string().url().optional().or(z.literal("")),
});

const editUserSchema = z.object({
  id: z.string(),
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"]).optional(),
  uidLimit: z.number().int().min(0).optional(),
  freeUidLimit: z.number().int().min(0).optional(),
  profilePicture: z.string().url().optional().or(z.literal("")),
  isLocked: z.boolean().optional(),
  hwidLockEnabled: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole === "RESELLER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const whereClause = userRole === "ADMIN" ? {} : { createdBy: userId };

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        uidLimit: true,
        freeUidLimit: true,
        profilePicture: true,
        isLocked: true,
        hwidLockEnabled: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { id: "desc" }
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const creatorId = session.user.id;
    const creatorRole = session.user.role;

    if (creatorRole === "RESELLER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const data = createUserSchema.parse(body);

    if (creatorRole === "MANAGER" && (data.role === "ADMIN" || data.role === "SUPER_ADMIN")) {
      return NextResponse.json({ message: "Managers cannot create ADMIN or SUPER_ADMIN users" }, { status: 403 });
    }

    if (creatorRole === "ADMIN" && data.role === "SUPER_ADMIN") {
      return NextResponse.json({ message: "Only SUPER_ADMIN can create SUPER_ADMIN users" }, { status: 403 });
    }
    
    if (creatorRole === "ADMIN" && data.role === "ADMIN") {
        return NextResponse.json({ message: "Only SUPER_ADMIN can create ADMIN users" }, { status: 403 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] }
    });

    if (existingUser) return NextResponse.json({ message: "Username or Email already exists" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const randomStr = crypto.randomUUID().replace(/-/g, "").toUpperCase();
    const apiKey = `uidbypass_${randomStr}_${data.username}.online`;

    const newUser = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        apiKey,
        createdBy: creatorId
      },
      select: { id: true, username: true, email: true, role: true }
    });

    await sendUserManagementWebhook(
      "add", 
      session.user.email || "Unknown", 
      newUser.email, 
      newUser.role, 
      `Username: ${newUser.username}`
    );

    return NextResponse.json({ message: "User created successfully", user: newUser }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const adminId = session.user.id;
    const adminRole = session.user.role;

    if (adminRole === "RESELLER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const data = editUserSchema.parse(body);

    const targetUser = await prisma.user.findUnique({ where: { id: data.id } });
    if (!targetUser) return NextResponse.json({ message: "User not found" }, { status: 404 });

    if (adminRole === "MANAGER" && targetUser.createdBy !== adminId) {
      return NextResponse.json({ message: "Forbidden. You can only edit users you created." }, { status: 403 });
    }

    if (adminRole === "MANAGER" && (data.role === "ADMIN" || data.role === "SUPER_ADMIN")) {
      return NextResponse.json({ message: "Managers cannot promote users to ADMIN or SUPER_ADMIN" }, { status: 403 });
    }

    if (adminRole === "ADMIN" && (data.role === "ADMIN" || data.role === "SUPER_ADMIN")) {
      return NextResponse.json({ message: "Only SUPER_ADMIN can promote users to ADMIN or SUPER_ADMIN" }, { status: 403 });
    }
    
    if (adminRole !== "SUPER_ADMIN" && targetUser.role === "SUPER_ADMIN") {
        return NextResponse.json({ message: "Forbidden. You cannot edit a SUPER_ADMIN." }, { status: 403 });
    }

    // Explicitly define update object to avoid typescript/prisma warnings
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.id;

    // If we are unlocking, clear the deviceToken as well
    if (data.isLocked === false) {
      updateData.deviceToken = null;
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    } else {
      delete updateData.password;
    }

    await prisma.user.update({
      where: { id: data.id },
      data: updateData
    });

    await sendUserManagementWebhook(
      "edit",
      session.user.email || "Unknown",
      (updateData.email as string) || targetUser.email,
      (updateData.role as string) || targetUser.role,
      `Edited fields: ${Object.keys(updateData).join(", ")}`
    );

    if (updateData.uidLimit !== undefined) {
      await sendLimitManagementWebhook(
        session.user.email || "Unknown",
        targetUser.email,
        updateData.uidLimit as number,
        "Paid UID Limit",
        "Updated"
      );
    }

    if (updateData.freeUidLimit !== undefined) {
      await sendLimitManagementWebhook(
        session.user.email || "Unknown",
        targetUser.email,
        updateData.freeUidLimit as number,
        "Free UID Limit",
        "Updated"
      );
    }

    return NextResponse.json({ message: "User updated successfully" }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const adminId = session.user.id;
    const adminRole = session.user.role;

    if (adminRole === "RESELLER") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const targetId = (url.searchParams.get("id") || "");

    if (!targetId) return NextResponse.json({ message: "User ID required" }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) return NextResponse.json({ message: "User not found" }, { status: 404 });

    if (adminRole === "MANAGER" && targetUser.createdBy !== adminId) {
      return NextResponse.json({ message: "Forbidden. You can only delete users you created." }, { status: 403 });
    }

    if (adminRole !== "SUPER_ADMIN" && targetUser.role === "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden. You cannot delete a SUPER_ADMIN." }, { status: 403 });
    }

    await prisma.user.delete({ where: { id: targetId } });

    await sendUserManagementWebhook(
      "delete",
      session.user.email || "Unknown",
      targetUser.email,
      targetUser.role,
      `User ID: ${targetUser.id}`
    );

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
