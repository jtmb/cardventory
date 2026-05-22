import { cookies } from "next/headers";
import { LandingPage } from "@/components/landing/landing-page";

export default async function Home() {
  // Check session cookie directly — avoids NextAuth redirect logic
  // that can fire when auth() is called for unauthenticated requests.
  const jar = await cookies();
  const isLoggedIn =
    jar.has("authjs.session-token") ||
    jar.has("__Secure-authjs.session-token");

  return <LandingPage isLoggedIn={isLoggedIn} />;
}
