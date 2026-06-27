import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllSystemSettings, updateSystemSettings } from "@/lib/system-settings";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const settings = await getAllSystemSettings();
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const success = await updateSystemSettings(body);
    
    if (success) {
      return NextResponse.json({ message: "Settings updated successfully" }, { status: 200 });
    } else {
      return NextResponse.json({ message: "Failed to update settings" }, { status: 500 });
    }
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
