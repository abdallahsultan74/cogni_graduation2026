import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    user: DefaultSession["user"] & {
      role: "student" | "advisor" | "admin";
      firstName?: string;
      lastName?: string;
    };
  }

  interface User {
    token: string;
    role: "student" | "advisor" | "admin";
    firstName?: string;
    lastName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    role?: "student" | "advisor" | "admin";
    name?: string;
    firstName?: string;
    lastName?: string;
  }
}
