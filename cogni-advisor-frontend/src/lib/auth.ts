import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_BASE_URL = process.env.COGNI_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error("Missing COGNI_API_BASE_URL environment variable.");
}
const JSON_HEADER = { "Content-Type": "application/json" };

type LoginRole = "student" | "advisor" | "admin";

type BackendLoginResponse = {
  token: string;
  email?: string;
  user?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  message?: string;
};

type AuthorizedUser = {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: LoginRole;
  token: string;
};

const resolveEndpointByRole = (role: LoginRole) => {
  if (role === "admin") {
    return `${API_BASE_URL}/api/auth/login/admin`;
  }

  return role === "advisor"
    ? `${API_BASE_URL}/api/auth/login/advisor`
    : `${API_BASE_URL}/api/auth/login/student`;
};

const parseRole = (rawRole?: string): LoginRole | null => {
  const normalized = rawRole?.toLowerCase();
  if (normalized === "student" || normalized === "advisor" || normalized === "admin") {
    return normalized;
  }
  return null;
};

const authorizeWithBackend = async (params: {
  email: string;
  password: string;
  role: LoginRole;
}): Promise<AuthorizedUser> => {
  const endpoint = resolveEndpointByRole(params.role);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ email: params.email, password: params.password }),
      headers: JSON_HEADER,
    });
  } catch {
    throw new Error(
      "Cannot reach the API server. Make sure the backend is running on port 5000."
    );
  }

  let payload: BackendLoginResponse & { error?: string } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  // Fallback to Vercel upstream if Supabase Edge Function rejects due to missing JWT
  if (
    !response.ok &&
    (payload?.message === "Missing authorization header" ||
      payload?.error === "Missing authorization header" ||
      response.status === 401) &&
    endpoint.includes("supabase.co")
  ) {
    const fallbackEndpoint = endpoint.replace(
      API_BASE_URL,
      "https://cogni-advisor-backend.vercel.app"
    );
    response = await fetch(fallbackEndpoint, {
      method: "POST",
      body: JSON.stringify({ email: params.email, password: params.password }),
      headers: JSON_HEADER,
    });

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ?? "Login failed. Please check your credentials."
    );
  }

  if (!payload?.token) {
    throw new Error("Login succeeded but no token was returned.");
  }

  return {
    id: `${params.role}-${params.email}`,
    email: payload.email ?? payload.user?.email ?? params.email,
    name:
      [payload.user?.first_name ?? "", payload.user?.last_name ?? ""]
        .join(" ")
        .trim() || undefined,
    firstName: payload.user?.first_name ?? undefined,
    lastName: payload.user?.last_name ?? undefined,
    role: params.role,
    token: payload.token,
  };
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;
        const role = parseRole(credentials?.role);

        if (!email || !password || !role) {
          throw new Error("Email, password, and role are required.");
        }

        return authorizeWithBackend({ email, password, role });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.token;
        // Normalize role to lowercase — backend returns ADMIN/STUDENT/ADVISOR
        token.role = (user.role?.toLowerCase() ?? user.role) as typeof user.role;
        token.email = user.email;
        token.name = user.name ?? undefined;
        token.firstName = user.firstName ?? undefined;
        token.lastName = user.lastName ?? undefined;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        email: token.email as string,
        name: (token.name as string | undefined) ?? session.user?.name,
        firstName:
          (token.firstName as string | undefined) ?? session.user?.firstName,
        lastName: (token.lastName as string | undefined) ?? session.user?.lastName,
        role: token.role as LoginRole,
      };
      session.accessToken = token.accessToken as string;

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
