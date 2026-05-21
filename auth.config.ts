import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no Node.js imports)
// Used by middleware to validate JWT tokens without DB access
export default {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
} satisfies NextAuthConfig;
