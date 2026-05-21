import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function fetchAnalytics() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/admin/analytics`, {
    cache: "no-store",
    headers: { Cookie: "" }, // will be replaced by fetch in RSC context
  });
  if (!res.ok) return null;
  return res.json();
}

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball", baseball: "Baseball", football: "Football",
  soccer: "Soccer", hockey: "Hockey", pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!", magic: "MTG", other: "Other",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).get();
  if (!me || me.role !== "admin") redirect("/dashboard");

  // Fetch analytics data directly from DB (avoids HTTP loopback)
  const { users: allUsers, cards, priceHistory, byGenre, perUser, cardsPerDay } = await getAnalyticsData(session.user.id);

  const lastRefreshStr = priceHistory.lastRefresh
    ? new Date(priceHistory.lastRefresh).toLocaleString()
    : "Never";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Instance-wide metrics and usage overview.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={allUsers.total} sub={`${allUsers.active} active · ${allUsers.pending} pending`} />
        <StatCard label="Locked Accounts" value={allUsers.locked} sub="manually locked" />
        <StatCard label="Total Cards" value={cards.owned} sub={`+ ${cards.wanted} on watchlist`} />
        <StatCard label="Price History Entries" value={priceHistory.total.toLocaleString()} sub={`Last refresh: ${lastRefreshStr}`} />
      </div>

      {/* Genre breakdown */}
      {byGenre.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Cards by Genre</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Genre</span>
              <span className="text-right">Cards</span>
            </div>
            {byGenre.map((g: { genre: string; count: number }) => (
              <div key={g.genre} className="grid grid-cols-[1fr_auto] items-center px-4 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                <span className="text-sm">{GENRE_LABELS[g.genre] ?? g.genre}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (g.count / Math.max(...byGenre.map((x: { count: number }) => x.count))) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-right min-w-[2rem]">{g.count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cards added per day */}
      {cardsPerDay.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Cards Added (Last 30 Days)</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-end gap-1 h-24">
              {cardsPerDay.map((d: { day: string; count: number }) => {
                const maxCount = Math.max(...cardsPerDay.map((x: { count: number }) => x.count), 1);
                const pct = (d.count / maxCount) * 100;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${d.day}: ${d.count}`}>
                    <div
                      className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors min-h-[2px]"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>{cardsPerDay[0]?.day}</span>
              <span>{cardsPerDay[cardsPerDay.length - 1]?.day}</span>
            </div>
          </div>
        </section>
      )}

      {/* Per-user table */}
      <section>
        <h2 className="text-base font-semibold mb-3">Users</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Name</span>
            <span>Email</span>
            <span>Status</span>
            <span className="text-right">Cards</span>
          </div>
          {perUser.map((u: { id: string; name: string; email: string; role: string; status: string; createdAt: Date | null; cardCount: number }) => (
            <div key={u.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.role}</p>
              </div>
              <p className="text-sm text-muted-foreground truncate">{u.email}</p>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                u.status === "pending"
                  ? "bg-amber-400/15 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-600"
              }`}>
                {u.status}
              </span>
              <span className="text-sm font-semibold tabular-nums text-right">{u.cardCount}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// Direct DB queries instead of HTTP loopback
async function getAnalyticsData(_adminId: string) {
  const { users: usersTable, cards: cardsTable, priceHistory: phTable } = await import("@/lib/db/schema");
  const { sql, desc, and, eq: eqFn } = await import("drizzle-orm");

  const userStats = await db
    .select({ status: usersTable.status, count: sql<number>`count(*)` })
    .from(usersTable)
    .groupBy(usersTable.status)
    .all();

  const lockedCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(sql`locked_at IS NOT NULL`)
    .get();

  const cardStats = await db
    .select({ status: cardsTable.status, count: sql<number>`count(*)` })
    .from(cardsTable)
    .groupBy(cardsTable.status)
    .all();

  const byGenre = await db
    .select({ genre: cardsTable.sportGenre, count: sql<number>`count(*)` })
    .from(cardsTable)
    .where(eqFn(cardsTable.status, "owned"))
    .groupBy(cardsTable.sportGenre)
    .orderBy(desc(sql`count(*)`))
    .all();

  const priceHistoryCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(phTable)
    .get();

  const lastRefresh = await db
    .select({ fetchedAt: phTable.fetchedAt })
    .from(phTable)
    .orderBy(desc(phTable.fetchedAt))
    .limit(1)
    .get();

  const perUser = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      status: usersTable.status,
      createdAt: usersTable.createdAt,
      cardCount: sql<number>`count(${cardsTable.id})`,
    })
    .from(usersTable)
    .leftJoin(cardsTable, and(eqFn(cardsTable.userId, usersTable.id), eqFn(cardsTable.status, "owned")))
    .groupBy(usersTable.id)
    .orderBy(desc(sql`count(${cardsTable.id})`))
    .all();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const cardsPerDay = await db
    .select({
      day: sql<string>`date(created_at / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(cardsTable)
    .where(sql`created_at >= ${thirtyDaysAgo.getTime()}`)
    .groupBy(sql`date(created_at / 1000, 'unixepoch')`)
    .orderBy(sql`date(created_at / 1000, 'unixepoch')`)
    .all();

  const totalUsers = userStats.reduce((s, r) => s + r.count, 0);

  return {
    users: {
      total: totalUsers,
      active: userStats.find((r) => r.status === "active")?.count ?? 0,
      pending: userStats.find((r) => r.status === "pending")?.count ?? 0,
      locked: lockedCount?.count ?? 0,
    },
    cards: {
      total: cardStats.reduce((s, r) => s + r.count, 0),
      owned: cardStats.find((r) => r.status === "owned")?.count ?? 0,
      wanted: cardStats.find((r) => r.status === "wanted")?.count ?? 0,
    },
    byGenre,
    priceHistory: {
      total: priceHistoryCount?.count ?? 0,
      lastRefresh: lastRefresh?.fetchedAt ?? null,
    },
    perUser,
    cardsPerDay,
  };
}
