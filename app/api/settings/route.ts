import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAllSettings, setSetting } from "@/lib/actions";

// Allowlist prevents storing arbitrary keys that could bloat the DB
const ALLOWED_USER_SETTING_KEYS = new Set([
  "refresh_interval",
  "theme_colors",
  "font_theme",
  "preset_theme",
  "type_density",
  "chip_style",
  "btn_style",
  "zoom_scale",
  "settings_layout",
  "settings_arrangement",
  "price_badges",
  "show_refresh_wheel",
  "manual_refresh_last",
  "notif_email_enabled",
  "notif_smtp_host",
  "notif_smtp_port",
  "notif_smtp_secure",
  "notif_smtp_user",
  "notif_smtp_pass",
  "notif_email_from",
  "notif_email_to",
  "notif_discord_enabled",
  "notif_discord_webhook",
  "notif_discord_mode",
  "notif_discord_bot_token",
  "notif_discord_user_id",
  "notif_on_new_high",
  "notif_on_price_change",
]);

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [all, profileRow] = await Promise.all([
    getAllSettings(),
    db.select({ username: users.username, profilePublic: users.profilePublic })
      .from(users)
      .where(eq(users.id, session.user.id))
      .get(),
  ]);

  return NextResponse.json({
    ...all,
    _username: profileRow?.username ?? null,
    _profilePublic: profileRow?.profilePublic ?? false,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_USER_SETTING_KEYS.has(key)) continue;
    if (typeof value === "string" && value.length <= 10_000) {
      await setSetting(key, value);
    }
  }

  return NextResponse.json({ success: true });
}
