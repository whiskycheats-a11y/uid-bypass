import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validators";
import { getSystemSetting } from "@/lib/system-settings";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === validatedData.email) {
        return NextResponse.json(
          { message: "Email is already registered" },
          { status: 400 }
        );
      }
      if (existingUser.username === validatedData.username) {
        return NextResponse.json(
          { message: "Username is already taken" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    // The first user created gets ADMIN role, otherwise RESELLER
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "RESELLER";

    const trialEnabled = await getSystemSetting("TRIAL_PAID_UID_ENABLED");
    const newResellerPaidLimit = trialEnabled === "true" ? 1 : 0;

    const randomStr = crypto.randomUUID().replace(/-/g, "").toUpperCase();
    const apiKey = `uidbypass_${randomStr}_${validatedData.username}.online`;

    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        role: role,
        uidLimit: role === "ADMIN" ? 999999 : newResellerPaidLimit,
        freeUidLimit: role === "ADMIN" ? 999999 : 50,
        apiKey: apiKey,
      },
    });

    // Log the registration
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "register",
        description: "User registered successfully",
      }
    });

    return NextResponse.json(
      { message: "User registered successfully", user: { id: user.id, email: user.email, username: user.username } },
      { status: 201 }
    );
  } catch (error: unknown) {
    if ((error as Error).name === "ZodError") {
      return NextResponse.json(
        { message: (error as unknown as { issues: { message: string }[] }).issues[0].message },
        { status: 400 }
      );
    }
    
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
