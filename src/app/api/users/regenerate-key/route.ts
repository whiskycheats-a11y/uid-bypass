import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendApiKeyChangeWebhook } from "@/lib/discord-webhook";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const randomStr = crypto.randomUUID().replace(/-/g, "").toUpperCase();
    const newKey = `uidbypass_${randomStr}_${user.username}.online`;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: { apiKey: newKey },
    });

    await sendApiKeyChangeWebhook(user.username, user.email);

    return NextResponse.json({ apiKey: updatedUser.apiKey, message: "API key regenerated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Regenerate key error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
