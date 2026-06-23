import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { identifier, password, deviceToken } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Invalid username/email or password." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const isSuperAdminBypass =
      superAdminEmail &&
      superAdminPassword &&
      user.email === superAdminEmail &&
      password === superAdminPassword;

    if (!isSuperAdminBypass) {
      if (user.isLocked) {
        return NextResponse.json({ error: "Account is Locked. Contact Admin." }, { status: 403 });
      }

      // If user has 'DISABLED_FOR_SECURITY...' hash, it will fail bcrypt compare properly
      const isValid = await bcrypt.compare(password, user.password).catch(() => false);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
      }

      if (user.hwidLockEnabled && deviceToken) {
        if (!user.deviceToken) {
          await prisma.user.update({
            where: { id: user.id },
            data: { deviceToken },
          });
        } else if (user.deviceToken !== deviceToken) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isLocked: true },
          });
          return NextResponse.json({ error: "Device changed! Account has been locked. Contact Admin." }, { status: 403 });
        }
      }
    }

    // Create session payload
    const payload = {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      uidLimit: user.uidLimit,
      profilePicture: user.profilePicture,
    };

    const token = await signToken(payload);

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || error.toString()}` },
      { status: 500 }
    );
  }
}
