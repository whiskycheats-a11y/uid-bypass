import { NextResponse } from "next/server";

export async function GET() {
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

  const baseUrl = "https://uid-bypass-beryl.vercel.app";
  const response = NextResponse.redirect(new URL("/login", baseUrl));

  for (const name of cookieNames) {
    response.cookies.delete(name);
  }

  return response;
}
