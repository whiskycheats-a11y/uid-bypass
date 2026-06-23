import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const response = NextResponse.redirect(new URL("/login", baseUrl));
  response.cookies.delete("auth_token");
  return response;
}
