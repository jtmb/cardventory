import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { db, rawSqlite } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import authConfig from "@/auth.config";

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

        if (status === "pending") return false; // Don't sign in until approved
        user.id = newId;
      } else {
        user.id = existing.id;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) token.id = user.id;
      if (user?.role) token.role = user.role;

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

