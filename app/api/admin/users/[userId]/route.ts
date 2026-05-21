import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, userLoginLogs, bannedUsers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.select().from(users).where(eq(users.id, session.user.id)).get();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const body = await req.json() as {
    action: "set_password" | "toggle_lock" | "set_role" | "approve" | "deny";
    password?: string;
    role?: "admin" | "user";
  };

  const target = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.action === "approve") {
    await db.update(users).set({ status: "active" }).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  }

  if (body.action === "deny") {
    // Get last known IP before deleting
    const lastLog = await db
      .select({ ipAddress: userLoginLogs.ipAddress })
      .from(userLoginLogs)
      .where(eq(userLoginLogs.userId, userId))
      .orderBy(desc(userLoginLogs.loginAt))
      .limit(1)
      .get();

    // Write to ban list
    await db.insert(bannedUsers).values({
      email: target.email,
      ipAddress: lastLog?.ipAddress ?? null,
      bannedByUserId: admin.id,
      reason: "Denied during registration",
    });

    // Delete the user record
    await db.delete(users).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  }

  if (body.action === "set_password") {
    if (!body.password || body.password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  }

  if (body.action === "toggle_lock") {
    // Prevent admins from locking themselves out
    if (userId === admin.id) {
      return NextResponse.json({ error: "Cannot lock your own account" }, { status: 400 });
    }
    const newLockedAt = target.lockedAt ? null : new Date();
    await db.update(users).set({ lockedAt: newLockedAt }).where(eq(users.id, userId));
    return NextResponse.json({ success: true, locked: newLockedAt !== null });
  }

  if (body.action === "set_role") {
    if (!body.role || !["admin", "user"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    // Prevent admins from demoting themselves
    if (userId === admin.id && body.role !== "admin") {
      return NextResponse.json({ error: "Cannot demote your own account" }, { status: 400 });
    }
    await db.update(users).set({ role: body.role }).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  if (userId === admin.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, userId));
  return NextResponse.json({ success: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;

  const loginHistory = await db
    .select()
    .from(userLoginLogs)
    .where(eq(userLoginLogs.userId, userId))
    .orderBy(desc(userLoginLogs.loginAt))
    .limit(10)
    .all();

  return NextResponse.json(loginHistory);
}
