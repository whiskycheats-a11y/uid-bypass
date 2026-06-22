import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
        deviceToken: { label: "Device Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier as string;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { username: identifier },
            ],
          },
        });

        if (!user) return null;

        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
        const isSuperAdminBypass = 
          superAdminEmail && 
          superAdminPassword && 
          user.email === superAdminEmail && 
          credentials.password === superAdminPassword;

        if (!isSuperAdminBypass) {
          if (user.isLocked) {
            throw new Error("Account is Locked. Contact Admin.");
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) return null;

          if (user.hwidLockEnabled && credentials.deviceToken) {
            const incomingToken = credentials.deviceToken as string;
            if (!user.deviceToken) {
              await prisma.user.update({
                where: { id: user.id },
                data: { deviceToken: incomingToken }
              });
            } else if (user.deviceToken !== incomingToken) {
              await prisma.user.update({
                where: { id: user.id },
                data: { isLocked: true }
              });
              throw new Error("Device changed! Account Locked.");
            }
          }
        }

        return {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          uidLimit: user.uidLimit,
          profilePicture: user.profilePicture,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.uidLimit = user.uidLimit;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.profilePicture = (user as any).profilePicture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.uidLimit = token.uidLimit as number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).profilePicture = token.profilePicture as string | null;
      }
      return session;
    },
  },
  trustHost: true,
});
