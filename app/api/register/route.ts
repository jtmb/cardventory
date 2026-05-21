import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, settings } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function getSystemSetting(key: string): Promise<string | null> {
  const row = await db
    .select()
    .from(settings)
    .where(and(isNull(settings.userId), eq(settings.key, key)))
    .get();
  return row?.value ?? null;
}

export async function POST(req: NextRequest) {
  try {
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

    await db.insert(users).values({ name, email, passwordHash, role, status });

    if (status === "pending") {
      return NextResponse.json({ pending: true }, { status: 201 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
