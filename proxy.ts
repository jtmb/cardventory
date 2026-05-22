import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const publicPaths = ["/", "/login", "/register"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // Only redirect logged-in users away from auth-only pages (not the landing page)
  const authOnlyPaths = ["/login", "/register"];
  const isAuthOnlyPath = authOnlyPaths.some((p) => pathname.startsWith(p));

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthOnlyPath) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
