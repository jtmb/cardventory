import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { db, rawSqlite } from "@/lib/db";
import { users, bannedUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import authConfig from "@/auth.config";
import { sendDiscordNotification } from "@/lib/notifications";

/** Read a system setting (userId=NULL) synchronously at module init time. */
function sysVar(settingKey: string, envFallback: string): string {
  try {
    const row = rawSqlite
      .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = ? LIMIT 1")
      .get(settingKey) as { value: string } | undefined;
    const dbVal = row?.value?.trim();
    if (dbVal) return dbVal;
  } catch {
    // DB may not be initialized yet (first run) — fall through to env var
  }
  return process.env[envFallback] ?? "";
}

const googleClientId = sysVar("oauth_google_client_id", "AUTH_GOOGLE_ID");
const googleClientSecret = sysVar("oauth_google_client_secret", "AUTH_GOOGLE_SECRET");
const githubClientId = sysVar("oauth_github_client_id", "AUTH_GITHUB_ID");
const githubClientSecret = sysVar("oauth_github_client_secret", "AUTH_GITHUB_SECRET");

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .get();

        if (!user) return null;

        // Reject locked accounts
        if (user.lockedAt) return null;

        // Reject pending accounts
        if (user.status === "pending") return null;

        // Reject banned emails
        const ban = rawSqlite
          .prepare("SELECT id FROM banned_users WHERE email = ? LIMIT 1")
          .get(credentials.email as string) as { id: string } | undefined;
        if (ban) return null;

        // OAuth users have empty passwordHash — cannot sign in with credentials
        if (!user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Only process OAuth sign-ins
      if (account?.type !== "oauth") return true;

      if (!user.email) return false;

      const existing = await db
        .select({ id: users.id, lockedAt: users.lockedAt, status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .get();

      if (existing?.lockedAt) return false;
      if (existing?.status === "pending") return false;

      // Reject banned emails
      const ban = rawSqlite
        .prepare("SELECT id FROM banned_users WHERE email = ? LIMIT 1")
        .get(user.email) as { id: string } | undefined;
      if (ban) return false;

      if (!existing) {
        // Check if registration is allowed
        const allowReg = rawSqlite
          .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = ? LIMIT 1")
          .get("allow_registration") as { value: string } | undefined;
        if (allowReg?.value === "false") return false;

        const requireApproval = rawSqlite
          .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = ? LIMIT 1")
          .get("require_approval") as { value: string } | undefined;
        const status: "active" | "pending" = requireApproval?.value === "true" ? "pending" : "active";

        // Create a new user for first-time OAuth sign-in
        const newId = crypto.randomUUID();
        await db.insert(users).values({
          id: newId,
          name: user.name ?? user.email.split("@")[0],
          email: user.email,
          passwordHash: "", // OAuth users cannot use credentials login
          role: "user",
          status,
        });

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
              const displayName = user.name ?? user.email.split("@")[0];
              if (status === "pending") {
                const notifyPending = rawSqlite
                  .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'signup_notify_pending' LIMIT 1")
                  .get() as { value: string } | undefined;
                if (notifyPending?.value !== "false") {
                  sendDiscordNotification(webhookUrl, `⏳ **New pending registration** (OAuth) — ${displayName} (${user.email}) is waiting for admin approval.`).catch(() => {});
                }
              } else {
                const notifyRegister = rawSqlite
                  .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'signup_notify_register' LIMIT 1")
                  .get() as { value: string } | undefined;
                if (notifyRegister?.value !== "false") {
                  sendDiscordNotification(webhookUrl, `✅ **New registration** (OAuth) — ${displayName} (${user.email}) has joined Cardventory.`).catch(() => {});
                }
              }
            }
          }
        } catch {
          // Never block sign-in on Discord errors
        }

        if (status === "pending") return false; // Don't sign in until approved
        user.id = newId;
      } else {
        user.id = existing.id;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id;
        // Increment session version to invalidate all previous active sessions
        rawSqlite
          .prepare("UPDATE users SET session_version = session_version + 1 WHERE id = ?")
          .run(user.id);
        // Load the new session version
        const dbUser = rawSqlite
          .prepare("SELECT role, session_version FROM users WHERE id = ? LIMIT 1")
          .get(user.id) as { role: string; session_version: number } | undefined;
        if (dbUser) {
          if (!token.role) token.role = dbUser.role;
          token.sessionVersion = dbUser.session_version;
        }
      }

      // Validate session version on every token refresh
      if (token.id && token.sessionVersion !== undefined) {
        const versionRow = rawSqlite
          .prepare("SELECT session_version FROM users WHERE id = ? LIMIT 1")
          .get(token.id as string) as { session_version: number } | undefined;
        if (!versionRow || versionRow.session_version !== token.sessionVersion) {
          return null; // Invalidate token → user is signed out
        }
      }

      // For OAuth users whose role isn't in the provider payload, fetch from DB
      if (account?.type === "oauth" && token.id && !token.role) {
        const dbUser = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.id as string))
          .get();
        if (dbUser) token.role = dbUser.role;
      }

      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as string;
      return session;
    },
  },
});

