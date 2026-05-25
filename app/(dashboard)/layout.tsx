import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { SessionProvider } from "next-auth/react";
import { WelcomeTour } from "@/components/welcome-tour";
import { DashboardClientInit } from "@/components/dashboard-client-init";
import { ReleaseNotesModal } from "@/components/release-notes-modal";
import { MainScrollContainer } from "@/components/main-scroll-container";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import { AdminConsentInit } from "@/components/analytics/admin-consent-init";
import { rawSqlite } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let demoEnabled = false;
  let maintenanceEnabled = false;
  try {
    const row = rawSqlite
      .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'demo_mode' LIMIT 1")
      .get() as { value: string } | undefined;
    demoEnabled = row?.value === "true";
    const mRow = rawSqlite
      .prepare("SELECT value FROM settings WHERE user_id IS NULL AND key = 'maintenance_mode' LIMIT 1")
      .get() as { value: string } | undefined;
    maintenanceEnabled = mRow?.value === "true";
  } catch { /* DB not ready on first boot */ }

  return (
    <SessionProvider session={session}>
      <div className="flex h-dvh bg-background">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          <DemoModeBanner enabled={demoEnabled} />
          <MaintenanceBanner enabled={maintenanceEnabled} />
          <MainScrollContainer>
            {children}
          </MainScrollContainer>
        </main>
      </div>
      <WelcomeTour />
      <DashboardClientInit />
      <AdminConsentInit />
      <ReleaseNotesModal />
    </SessionProvider>
  );
}
