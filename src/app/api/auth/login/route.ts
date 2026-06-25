import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { identifier, password, deviceToken } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Invalid username/email or password." }, { status: 400 });
    }

    // 👇 Test DB connection first – if it fails, user will see a clear message
    try {
      await prisma.$connect();
    } catch (dbError: any) {
      console.error("[LOGIN] Database connection failed:", dbError?.message || dbError);
      return NextResponse.json(
        { error: "Database connection error. Please contact support." },
        { status: 503 }
      );
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const isSuperAdminMatch =
      superAdminEmail &&
      superAdminPassword &&
      identifier === superAdminEmail &&
      password === superAdminPassword;

    if (isSuperAdminMatch) {
      if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
          data: {
            email: superAdminEmail,
            username: "admin_" + Math.random().toString(36).substring(2, 8),
            password: hashedPassword,
            role: "SUPER_ADMIN",
            uidLimit: 999999,
            freeUidLimit: 999999,
          },
        });
      } else if (user.role !== "SUPER_ADMIN") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "SUPER_ADMIN" }
        });
      }
    } else {
      if (!user) {
        return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
      }

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

    // Create session payload with profilePicture
    const payload = {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      uidLimit: user.uidLimit,
      profilePicture: user.profilePicture || null,
    };

    const token = await signToken(payload);

    // ✅ Use NextResponse to set cookies (avoids ERR_HTTP2_PROTOCOL_ERROR)
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[LOGIN] Unhandled error:", error?.message || error, error?.stack || "");
    return NextResponse.json(
      { error: `Internal Server Error. Please try again later.` },
      { status: 500 }
    );
  }
}
