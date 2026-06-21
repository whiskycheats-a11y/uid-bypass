import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Check if CRON_SECRET is configured and matches
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: "Unauthorized or missing CRON_SECRET in environment" }, { status: 401 });
    }

    // Reset freeUidLimit to 50 for all non-ADMIN users
    // Admins usually have unlimited/99999 limits, so we don't reset theirs.
    const result = await prisma.user.updateMany({
      where: {
        role: { not: "ADMIN" }
      },
      data: {
        freeUidLimit: 50
      }
    });

    return NextResponse.json({ 
      success: true,
      message: `Successfully reset free UID limits to 50 for ${result.count} users.` 
    }, { status: 200 });
  } catch (error) {
    console.error("Cron reset error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
