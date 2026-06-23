import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secretKey = process.env.AUTH_SECRET || "fallback-secret-key-do-not-use-in-prod";
const key = new TextEncoder().encode(secretKey);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (_error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect /dashboard and all its subroutes
  const isDashboardPath = path.startsWith("/dashboard");
  const isAuthPath = path === "/login" || path === "/register";

  if (isDashboardPath || isAuthPath) {
    const token = request.cookies.get("auth_token")?.value;
    const verified = token ? await verifyToken(token) : null;

    if (isDashboardPath && !verified) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      // Delete invalid token cookie if present
      response.cookies.delete("auth_token");
      return response;
    }

    if (isAuthPath && verified) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
