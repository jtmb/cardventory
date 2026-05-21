import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { SessionProvider } from "next-auth/react";
import { Suspense } from "react";
import { WelcomeTour } from "@/components/welcome-tour";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-background">
        <Suspense fallback={<div className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border min-h-screen" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <WelcomeTour />
    </SessionProvider>
  );
}
