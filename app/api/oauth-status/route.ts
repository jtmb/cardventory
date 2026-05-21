import { NextResponse } from "next/server";
import { rawSqlite } from "@/lib/db";

function sysVar(key: string, envKey: string): string {
  try {
    const row = rawSqlite
      .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = ? LIMIT 1")
      .get(key) as { value: string } | undefined;
    const dbVal = row?.value?.trim();
    if (dbVal) return dbVal;
  } catch {}
  return process.env[envKey]?.trim() ?? "";
}

export function GET() {
  const googleEnabled = !!(
    sysVar("oauth_google_client_id", "AUTH_GOOGLE_ID") &&
    sysVar("oauth_google_client_secret", "AUTH_GOOGLE_SECRET")
  );
  const githubEnabled = !!(
    sysVar("oauth_github_client_id", "AUTH_GITHUB_ID") &&
    sysVar("oauth_github_client_secret", "AUTH_GITHUB_SECRET")
  );

  return NextResponse.json({ google: googleEnabled, github: githubEnabled });
}
