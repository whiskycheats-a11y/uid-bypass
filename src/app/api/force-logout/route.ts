import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  
  // Delete ALL possible session cookies including custom auth_token
  const cookieNames = [
    "auth_token",
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "authjs.csrf-token",
    "__Secure-authjs.csrf-token",
    // Legacy NextAuth v4 cookie names just in case
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Secure-next-auth.csrf-token",
  ];

  for (const name of cookieNames) {
    try {
      cookieStore.delete(name);
    } catch {
      // ignore if cookie doesn't exist
    }
  }

  // Redirect to login page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return NextResponse.redirect(new URL("/login", baseUrl));
}
