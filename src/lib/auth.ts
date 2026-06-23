import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.AUTH_SECRET || "fallback-secret-key-do-not-use-in-prod";
const key = new TextEncoder().encode(secretKey);

export async function signToken(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (_error) {
    return null;
  }
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  uidLimit: number;
  profilePicture?: string | null;
}

export interface AuthSession {
  user: AuthUser;
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  return { 
    user: {
      id: payload.id as string,
      username: payload.username as string,
      email: payload.email as string,
      role: payload.role as string,
      uidLimit: Number(payload.uidLimit),
      profilePicture: payload.profilePicture as string | undefined | null,
    }
  };
}

export const auth = getSession;
