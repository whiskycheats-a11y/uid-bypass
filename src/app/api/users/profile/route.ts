import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const profileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
  profilePicture: z.string().optional().or(z.literal("")),
});

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    
    let parsed;
    try {
      parsed = profileSchema.parse(body);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ message: "Invalid input format or invalid URL for profile picture." }, { status: 400 });
      }
    }

    if (!parsed) {
       return NextResponse.json({ message: "Bad Request" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const updates: any = {};

    // 1. Update Username
    if (parsed.username && parsed.username !== user.username) {
      const existingUser = await prisma.user.findUnique({ where: { username: parsed.username } });
      if (existingUser) {
        return NextResponse.json({ message: "Username already taken." }, { status: 409 });
      }
      updates.username = parsed.username;
    }

    // 2. Update Password
    if (parsed.newPassword) {
      if (!parsed.currentPassword) {
        return NextResponse.json({ message: "Current password is required to set a new password." }, { status: 400 });
      }
      
      const isPasswordValid = await bcrypt.compare(parsed.currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ message: "Incorrect current password." }, { status: 401 });
      }
      
      updates.password = await bcrypt.hash(parsed.newPassword, 10);
    }

    // 3. Update Profile Picture
    if (parsed.profilePicture !== undefined) {
      updates.profilePicture = parsed.profilePicture;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No changes provided." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return NextResponse.json({ success: true, message: "Profile updated successfully!" });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
