import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import os from "os";
import { securityMetrics } from "@/lib/security-metrics";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;
  const memUsage = process.memoryUsage();

  return NextResponse.json({
    cpu: {
      cores: cpuCount,
      loadAvg1: parseFloat(loadAvg[0].toFixed(2)),
      loadAvg5: parseFloat(loadAvg[1].toFixed(2)),
      loadAvg15: parseFloat(loadAvg[2].toFixed(2)),
      // Normalised to % of available cores, capped at 100
      usagePct: Math.min(100, Math.round((loadAvg[0] / cpuCount) * 100)),
    },
    memory: {
      totalMb: Math.round(totalMem / 1024 / 1024),
      usedMb: Math.round((totalMem - freeMem) / 1024 / 1024),
      freeMb: Math.round(freeMem / 1024 / 1024),
      usagePct: Math.round(((totalMem - freeMem) / totalMem) * 100),
      heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
    },
    uptime: {
      processSec: Math.round(process.uptime()),
      systemSec: Math.round(os.uptime()),
    },
    security: securityMetrics.snapshot(),
  });
}
