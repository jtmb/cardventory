import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    action: "update_profile" | "change_password";
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const user = await db.select().from(users).where(eq(users.id, session.user.id)).get();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.action === "update_profile") {
    const name = body.name?.trim();
    if (!name || name.length < 1) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    await db.update(users).set({ name }).where(eq(users.id, user.id));
    return NextResponse.json({ success: true, name });
  }

  if (body.action === "change_password") {
    if (!user.passwordHash) {
      return NextResponse.json({ error: "OAuth accounts cannot set a password" }, { status: 400 });
    }
    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
