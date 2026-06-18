import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const authRoutes = ["/login", "/register", "/forget-password"];
const publicRoutes = ["/"];
const protectedPrefixes = ["/student", "/advisor", "/admin"];

const resolveCallbackPath = (pathname: string) => {
  if (pathname === "/student") {
    return "/student/dashboard";
  }

  if (pathname === "/advisor") {
    return "/advisor/dashboard";
  }

  if (pathname === "/admin") {
    return "/admin/dashboard";
  }

  return pathname;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 1) Auth routes: authenticated users should not access login/register pages.
  if (authRoutes.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 2) Public routes are always accessible.
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // 3) Protected routes: unauthenticated users are redirected to login.
  const needsAuth = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (needsAuth && !token) {
    const signInUrl = new URL("/login", request.url);
    signInUrl.searchParams.set("callbackUrl", resolveCallbackPath(pathname));
    return NextResponse.redirect(signInUrl);
  }

  // 4) Allow access for remaining routes.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
