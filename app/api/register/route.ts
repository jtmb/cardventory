import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rawSqlite } from "@/lib/db";
import { users, settings, userLoginLogs } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sendDiscordNotification } from "@/lib/notifications";
import { getRealIp } from "@/lib/get-real-ip";
import { securityMetrics } from "@/lib/security-metrics";

async function getSystemSetting(key: string): Promise<string | null> {
  const row = await db
    .select()
    .from(settings)
    .where(and(isNull(settings.userId), eq(settings.key, key)))
    .get();
  return row?.value ?? null;
}

// In-memory rate limiter: max 5 registrations per IP per hour
const regAttempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  if (ip === "unknown") return false; // Can't rate-limit unknown IPs
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxPerWindow = 5;
  const attempts = (regAttempts.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (attempts.length >= maxPerWindow) return true;
  attempts.push(now);
  regAttempts.set(ip, attempts);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRealIp(req);
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // First user is always allowed to register (bootstraps the admin account)
    const allUsers = await db.select().from(users).all();
    const isFirstUser = allUsers.length === 0;

    if (!isFirstUser) {
      const allowReg = await getSystemSetting("allow_registration");
      if (allowReg === "false") {
        return NextResponse.json({ error: "Registration is currently disabled." }, { status: 403 });
      }

      // Rate limit: max 5 attempts per IP per hour (skip for first user)
      if (isRateLimited(ip)) {
        securityMetrics.increment("registrationBlocked");
        return NextResponse.json(
          { error: "Too many registration attempts. Please try again later." },
          { status: 429 }
        );
      }
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const role = isFirstUser ? "admin" : "user";

    let status: "active" | "pending" = "active";
    if (!isFirstUser) {
      const requireApproval = await getSystemSetting("require_approval");
      if (requireApproval === "true") status = "pending";
    }

    const newUser = await db
      .insert(users)
      .values({ name, email, passwordHash, role, status })
      .returning({ id: users.id })
      .get();

    // Log the registration IP (shows up in login history for pending accounts)
    if (newUser?.id) {
      await db.insert(userLoginLogs).values({ userId: newUser.id, ipAddress: ip });
    }

    // Discord signup notification (fire and forget)
    try {
      const discordEnabled = rawSqlite
        .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'signup_discord_enabled' LIMIT 1")
        .get() as { value: string } | undefined;
      if (discordEnabled?.value === "true") {
        const webhookRow = rawSqlite
          .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'signup_discord_webhook' LIMIT 1")
          .get() as { value: string } | undefined;
        const webhookUrl = webhookRow?.value?.trim();
        if (webhookUrl) {
          if (status === "pending") {
            const notifyPending = rawSqlite
              .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'signup_notify_pending' LIMIT 1")
              .get() as { value: string } | undefined;
            if (notifyPending?.value !== "false") {
              sendDiscordNotification(webhookUrl, `⏳ **New pending registration** — ${name} (${email}) is waiting for admin approval.`).catch(() => {});
            }
          } else {
            const notifyRegister = rawSqlite
              .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'signup_notify_register' LIMIT 1")
              .get() as { value: string } | undefined;
            if (notifyRegister?.value !== "false") {
              sendDiscordNotification(webhookUrl, `✅ **New registration** — ${name} (${email}) has joined Cardventory.`).catch(() => {});
            }
          }
        }
      }
    } catch {
      // Never block registration on Discord errors
    }

    if (status === "pending") {
      return NextResponse.json({ pending: true }, { status: 201 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
