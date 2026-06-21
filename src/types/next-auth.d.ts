import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: string;
    uidLimit: number;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      role: string;
      uidLimit: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    uidLimit: number;
  }
}
