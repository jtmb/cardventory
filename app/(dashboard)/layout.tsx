import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { SessionProvider } from "next-auth/react";
import { Suspense } from "react";
import { WelcomeTour } from "@/components/welcome-tour";
import { DashboardClientInit } from "@/components/dashboard-client-init";
import { ReleaseNotesModal } from "@/components/release-notes-modal";
import { MainScrollContainer } from "@/components/main-scroll-container";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex h-dvh bg-background">
        <Suspense fallback={<div className="hidden md:block w-60 shrink-0 bg-sidebar border-r border-sidebar-border min-h-screen" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-hidden flex flex-col">
          <MainScrollContainer>
            {children}
          </MainScrollContainer>
        </main>
      </div>
      <WelcomeTour />
      <DashboardClientInit />
      <ReleaseNotesModal />
    </SessionProvider>
  );
}
