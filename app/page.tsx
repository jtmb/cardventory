import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";

export default async function Home() {
  // Validate the session via auth() so stale/invalid tokens don't
  // cause a redirect loop (/ → /dashboard → /login → back).
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return <LandingPage isLoggedIn={false} />;
}
