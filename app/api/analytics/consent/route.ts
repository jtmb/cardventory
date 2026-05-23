import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rawSqlite } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/analytics/server";
import { cookies } from "next/headers";

const CONSENT_VERSION = "1.0";
const COOKIE_NAME = "cv_consent";

export async function POST(request: Request) {
  let body: { sessionId: string; analyticsConsent: boolean; performanceConsent: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, analyticsConsent, performanceConsent } = body;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const ip = getClientIp(request);
  const ipHash = ip !== "unknown" ? hashIp(ip) : null;
  const now = Date.now();

  // Write GDPR audit log
  rawSqlite
    .prepare(`
      INSERT INTO analytics_consent
        (id, user_id, session_id, analytics_consent, performance_consent, created_at, ip_hash, consent_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      crypto.randomUUID(),
      userId,
      sessionId,
      analyticsConsent ? 1 : 0,
      performanceConsent ? 1 : 0,
      now,
      ipHash,
      CONSENT_VERSION
    );

  // Update session consent flag
  rawSqlite
    .prepare(`
      UPDATE analytics_sessions SET has_consent = ? WHERE id = ?
    `)
    .run(analyticsConsent ? 1 : 0, sessionId);

  // Set first-party consent cookie (1 year)
  const jar = await cookies();
  jar.set(COOKIE_NAME, JSON.stringify({
    analytics: analyticsConsent,
    performance: performanceConsent,
    version: CONSENT_VERSION,
    ts: now,
  }), {
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "strict",
    httpOnly: false, // must be readable by JS to avoid double-banner
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
