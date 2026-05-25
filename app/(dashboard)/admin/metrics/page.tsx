import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { MetricsDashboard } from "@/components/dashboard/metrics-dashboard";

export default async function MetricsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();
  if (!me || me.role !== "admin") redirect("/dashboard");

  return (
    <div className="px-6 pb-6 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Metrics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          User behaviour analytics and live site performance data.
        </p>
      </div>
      <MetricsDashboard />
    </div>
  );
}
