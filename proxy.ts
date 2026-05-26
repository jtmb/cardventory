import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Allow static uploads to be served without auth and handle Next image optimizer
  // requests that reference local `/uploads/*` by rewriting them to the raw file.
  if (pathname.startsWith("/uploads")) {
    return NextResponse.next();
  }

  if (pathname === "/_next/image") {
    const rawUrl = req.nextUrl.searchParams.get("url") || "";
    if (rawUrl.startsWith("/uploads/")) {
      const target = new URL(rawUrl, req.url);
      return NextResponse.rewrite(target);
    }
  }

  // Keep this explicit so "/" does not accidentally match every route.
  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Match most app routes (proxy handles auth) but keep static API and assets
  matcher: ["/((?!api|_next/static|favicon.ico).*)"],
};
