import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Check secret key matches environment variable
    const SEED_SECRET = process.env.SEED_SECRET;
    if (!SEED_SECRET || secret !== SEED_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const username = process.env.ADMIN_USERNAME || "admin";

    // Check if admin already exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existing) {
      // Update password if admin exists
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashedPassword, role: "ADMIN" }
      });
      return NextResponse.json({
        message: "Admin password updated successfully!",
        email,
        username: existing.username,
      });
    }

    // Create new admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: "ADMIN",
        uidLimit: 999999,
        freeUidLimit: 999999,
      },
      select: { id: true, email: true, username: true, role: true }
    });

    return NextResponse.json({
      message: "Admin created successfully!",
      admin: newAdmin,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 });
  }
}
