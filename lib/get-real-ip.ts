import { type NextRequest } from "next/server";

/**
 * Extract the real client IP address from request headers.
 *
 * Priority order (Cloudflare Tunnel + Traefik stack):
 *   1. CF-Connecting-IP  — set by Cloudflare to the actual visitor IP
 *   2. X-Forwarded-For   — leftmost entry is the client IP as Cloudflare saw it
 *   3. X-Real-IP         — set by some reverse proxies (Nginx, etc.)
 *   4. "unknown"         — fallback when no header is present
 */
export function getRealIp(req: NextRequest): string {
  // Cloudflare sets this to the real visitor IP before Traefik ever sees the request
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  // X-Forwarded-For: <client>, <proxy1>, <proxy2>
  // The leftmost entry is the original client IP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}
