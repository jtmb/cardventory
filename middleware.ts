import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  try {
    if (req.nextUrl.pathname === "/_next/image") {
      const rawUrl = req.nextUrl.searchParams.get("url") || "";
      if (rawUrl.startsWith("/uploads/")) {
        // Rewrite optimizer requests for local uploads to serve the file directly
        const target = new URL(rawUrl, req.url);
        return NextResponse.rewrite(target);
      }
    }
  } catch (e) {
    // Non-fatal — fall through to default handling
    console.error("middleware error:", e);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/_next/image"],
};
