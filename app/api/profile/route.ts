import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    action: "update_profile" | "change_password" | "update_public_profile";
    name?: string;
    currentPassword?: string;
    newPassword?: string;
    username?: string | null;
    profilePublic?: boolean;
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
  if (body.action === "update_public_profile") {
    const profileUpdates: Record<string, unknown> = {};

    if ("username" in body) {
      const u = body.username;
      if (u === null || u === "") {
        profileUpdates.username = null;
      } else {
        if (typeof u !== "string" || !USERNAME_RE.test(u)) {
          return NextResponse.json(
            { error: "Username must be 3–30 characters: letters, numbers, _ or -" },
            { status: 400 }
          );
        }
        const conflict = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.username, u), ne(users.id, user.id)))
          .get();
        if (conflict) {
          return NextResponse.json({ error: "Username already taken" }, { status: 409 });
        }
        profileUpdates.username = u;
      }
    }

    if ("profilePublic" in body) {
      profileUpdates.profilePublic = Boolean(body.profilePublic);
    }

    if (Object.keys(profileUpdates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(profileUpdates)
      .where(eq(users.id, user.id))
      .returning({ username: users.username, profilePublic: users.profilePublic });

    return NextResponse.json({ success: true, ...updated });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db
    .select({ username: users.username, profilePublic: users.profilePublic })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();

  return NextResponse.json(user ?? { username: null, profilePublic: false });
}
