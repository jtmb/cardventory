"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLogo } from "@/components/app-logo";
import { LandingNav } from "@/components/landing-nav";
import { EyeIcon, EyeOffIcon } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<{ google: boolean; github: boolean } | null>(null);
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/oauth-status")
      .then((r) => {
        if (!r.ok) throw new Error("not ok");
        return r.json();
      })
      .then(setOauthStatus)
      .catch(() => setOauthStatus({ google: false, github: false }));

    fetch("/api/sign-out-message")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { message?: string } | null) => {
        if (data?.message) setSignOutMessage(data.message);
      })
      .catch(() => {});
  }, []);

  function handleOAuthClick(provider: "google" | "github") {
    if (!oauthStatus?.[provider]) {
      setError(`${provider === "google" ? "Google" : "GitHub"} sign-in is not enabled for this instance.`);
      return;
    }
    signIn(provider, { callbackUrl: "/" });
  }

  async function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const email = e.target.value.trim();
    if (!email) { setEmailError(null); return; }
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: { exists: boolean } = await res.json();
      setEmailError(data.exists ? null : "This email address does not appear to be valid.");
    } catch {
      // network error — don't block the user
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <>
      <LandingNav isLoggedIn={false} hideSignIn />
      <main className="flex items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-lg">
          {signOutMessage && (
            <div className="mb-4 rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
              {signOutMessage}
            </div>
          )}
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <AppLogo size="lg" />
        </div>
        <CardTitle className="text-2xl">Cardventory</CardTitle>
        <CardDescription>Sign in to your collection</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              onBlur={handleEmailBlur}
              onChange={() => setEmailError(null)}
            />
            {emailError && <p className="text-destructive text-sm">{emailError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPwd ? "text" : "password"}
                required
                placeholder="••••••••"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        {/* OAuth divider */}
        <div className="mt-4 flex items-center gap-3">
          <span className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or continue with</span>
          <span className="flex-1 h-px bg-border" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => handleOAuthClick("google")}
          >
            {/* Google "G" icon */}
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => handleOAuthClick("github")}
          >
            {/* GitHub icon */}
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </Button>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
        </div>
      </main>
    </>
  );
}
