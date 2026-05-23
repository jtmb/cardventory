"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  UsersIcon, ActivityIcon, RefreshCwIcon, GlobeIcon,
  MonitorIcon, TrendingUpIcon, FunnelIcon, BarChart3Icon,
  ZapIcon, InfoIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d";

type OverviewData = {
  sessions: number; pageviews: number; visitors: number;
  avgDuration: number; bounceRate: number;
  dailyTrend: { day: string; sessions: number; pageviews: number }[];
  topPages: { path: string; views: number }[];
};

type AcquisitionData = {
  referrers: { source: string; sessions: number }[];
  utmSources: { source: string; sessions: number }[];
  utmMediums: { medium: string; sessions: number }[];
  newVsReturning: { type: string; sessions: number }[];
};

type DevicesData = {
  devices: { device: string; sessions: number }[];
  browsers: { browser: string; sessions: number }[];
  oses: { os: string; sessions: number }[];
  viewports: { viewport: string; sessions: number }[];
};

type GeoData = {
  countries: { country: string; sessions: number }[];
  cities: { city: string; country: string; sessions: number }[];
};

type EngagementData = {
  scrollDepth: { path: string; avgDepth: number; events: number }[];
  topClicks: { path: string; element: string; text: string; clicks: number }[];
  durationBuckets: { bucket: string; sessions: number }[];
  pagesPerSession: { bucket: string; sessions: number }[];
  heatmapClicks: { path: string; x: number; y: number; count: number }[];
};

type RetentionData = {
  cohorts: { week: string; size: number; retention: (number | null)[] }[];
};

type FunnelData = {
  steps: { label: string; count: number; pct: number }[];
};

type UserMetrics = {
  retention: { d1: number; d7: number; d14: number; d30: number };
  byHour: { hour: number; label: string; count: number }[];
  byDow: { dow: number; label: string; count: number }[];
  topUsers: { userId: string; name: string | null; email: string | null; loginCount: number; lastLogin: string | null }[];
  monthlyRegs: { month: string; count: number }[];
  cardDistribution: { range: string; count: number }[];
};

type PerfMetrics = {
  totalRequests: number; windowCount: number; errorRate: number;
  avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number;
  requestsPerMinute: { minute: string; count: number }[];
  latencyByRoute: { route: string; count: number; p50: number; p95: number; p99: number; avg: number }[];
  statusDistribution: { status: number; count: number }[];
  slowest: { path: string; method: string; status: number; durationMs: number; timestamp: string }[];
};

type PortfolioStats = {
  totalValue: number;
  usersWithCards: number;
  totalCards: number;
  avgCardValue: number;
  avgCards: number;
  avgPortfolio: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, stub }: { label: string; value: string | number; sub?: string; stub?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 relative">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${stub ? "text-muted-foreground/40" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      {stub && (
        <span className="absolute top-3 right-3 text-[10px] text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded">
          requires integration
        </span>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground/80 mb-3">{children}</h3>;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? "inherit" }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}

function fmtSec(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusGroup(code: number) {
  if (code < 300) return "2xx";
  if (code < 400) return "3xx";
  if (code < 500) return "4xx";
  return "5xx";
}

const STATUS_COLOR: Record<string, string> = {
  "2xx": "#22c55e", "3xx": "#3b82f6", "4xx": "#f59e0b", "5xx": "#ef4444",
};

function LatencyBadge({ ms }: { ms: number }) {
  const cls = ms >= 1000 ? "text-red-500" : ms >= 300 ? "text-amber-500" : "text-emerald-500";
  return <span className={`font-mono tabular-nums ${cls}`}>{ms}ms</span>;
}

const PIE_COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444", "#ec4899", "#06b6d4"];

function retentionColor(pct: number | null) {
  if (pct === null) return "bg-muted/20 text-muted-foreground/30";
  if (pct >= 80) return "bg-emerald-500/80 text-white";
  if (pct >= 60) return "bg-emerald-400/60 text-emerald-900 dark:text-emerald-100";
  if (pct >= 40) return "bg-amber-400/60 text-amber-900 dark:text-amber-100";
  if (pct >= 20) return "bg-orange-400/50 text-orange-900 dark:text-orange-100";
  return "bg-red-400/40 text-red-900 dark:text-red-100";
}

// Export helper
function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = filename;
  a.click();
}

// ── KPI Row ───────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
}

function KpiRow({ user, perf, portfolio }: { user: UserMetrics | null; perf: PerfMetrics | null; portfolio: PortfolioStats | null }) {
  const dau = user?.retention?.d1 ?? "—";
  const wau = user?.retention?.d7 ?? "—";
  const mau = user?.retention?.d30 ?? "—";

  // Churn: mau - wau / mau (rough approximation)
  const churn = user?.retention?.d30 && user.retention.d30 > 0
    ? `${Math.round(((user.retention.d30 - (user.retention?.d7 ?? 0)) / user.retention.d30) * 100)}%`
    : "—";

  const avgPortfolio = portfolio ? fmt$(portfolio.avgPortfolio) : "—";
  const totalAUM     = portfolio ? fmt$(portfolio.totalValue)   : "—";
  const cardsPerUser = portfolio ? `${portfolio.avgCards}` : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      <StatCard label="DAU"         value={dau}         sub="Last 24h" />
      <StatCard label="WAU"         value={wau}         sub="Last 7d" />
      <StatCard label="MAU"         value={mau}         sub="Last 30d" />
      <StatCard label="Churn"       value={churn}       sub="30d approx" />
      <StatCard label="Avg Portfolio" value={avgPortfolio} sub="purchase cost/user" />
      <StatCard label="Total AUM"   value={totalAUM}    sub="all portfolios" />
      <StatCard label="Cards/User"  value={cardsPerUser} sub="owned avg" />
      <StatCard label="Conv." value={perf ? `${(100 - perf.errorRate).toFixed(1)}%` : "—"} sub="non-error rate" />
    </div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ data, onExport }: { data: OverviewData; onExport: () => void }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Sessions"     value={data.sessions.toLocaleString()}  sub="Consented" />
        <StatCard label="Pageviews"    value={data.pageviews.toLocaleString()} sub="Total" />
        <StatCard label="Visitors"     value={data.visitors.toLocaleString()}  sub="Unique users" />
        <StatCard label="Bounce rate"  value={`${data.bounceRate}%`}           sub={`Avg ${fmtSec(data.avgDuration)}`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Sessions & Pageviews Over Time</SectionTitle>
          <button onClick={onExport} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            ↓ CSV
          </button>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.dailyTrend} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <defs>
                <linearGradient id="grad-sessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-pv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area dataKey="sessions"  name="Sessions"  stroke="hsl(var(--primary))" fill="url(#grad-sessions)" strokeWidth={2} dot={false} />
              <Area dataKey="pageviews" name="Pageviews" stroke="#22c55e"              fill="url(#grad-pv)"       strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <SectionTitle>Top Pages</SectionTitle>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Path</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Views</th>
              </tr>
            </thead>
            <tbody>
              {data.topPages.map((p) => (
                <tr key={p.path} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[12px]">{p.path}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[12px]">{p.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Acquisition ──────────────────────────────────────────────────────────

function AcquisitionTab({ data }: { data: AcquisitionData }) {
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionTitle>Traffic Sources</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.referrers} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <SectionTitle>New vs Returning</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.newVsReturning} dataKey="sessions" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.newVsReturning.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {data.utmSources.length > 0 && (
        <div>
          <SectionTitle>UTM Sources</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.utmSources} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="source" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary) / 0.7)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Devices ──────────────────────────────────────────────────────────────

function DevicesTab({ data }: { data: DevicesData }) {
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: "Device Type", rows: data.devices,   keyField: "device" },
          { title: "Browser",     rows: data.browsers,  keyField: "browser" },
          { title: "OS",          rows: data.oses,       keyField: "os" },
        ].map(({ title, rows, keyField }) => (
          <div key={title}>
            <SectionTitle>{title}</SectionTitle>
            <div className="rounded-xl border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey={keyField} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary) / 0.8)" radius={[0, 3, 3, 0]}>
                    {rows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div>
        <SectionTitle>Viewport Sizes</SectionTitle>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Viewport</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {data.viewports.map((v) => (
                <tr key={v.viewport} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[12px]">{v.viewport}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[12px]">{v.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Geography ────────────────────────────────────────────────────────────

function GeographyTab({ data }: { data: GeoData }) {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Sessions by Country (top 20)</SectionTitle>
        <div className="rounded-xl border border-border bg-card p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.countries} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary) / 0.75)" radius={[0, 3, 3, 0]}>
                {data.countries.map((_, i) => <Cell key={i} fill={`hsl(var(--primary) / ${0.9 - i * 0.03})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <SectionTitle>Top Cities</SectionTitle>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">City</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Country</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {data.cities.map((c, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-[13px]">{c.city}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{c.country}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[12px]">{c.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Engagement ───────────────────────────────────────────────────────────

function EngagementTab({ data }: { data: EngagementData }) {
  const [heatPage, setHeatPage] = useState<string>("(all)");
  const pages = ["(all)", ...Array.from(new Set(data.heatmapClicks.map((c) => c.path)))];
  const filtered = heatPage === "(all)" ? data.heatmapClicks : data.heatmapClicks.filter((c) => c.path === heatPage);

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionTitle>Session Duration</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.durationBuckets} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <SectionTitle>Pages Per Session</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.pagesPerSession} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary) / 0.7)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Avg Scroll Depth by Page</SectionTitle>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Page</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Avg Depth</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Events</th>
              </tr>
            </thead>
            <tbody>
              {data.scrollDepth.map((r) => (
                <tr key={r.path} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[12px]">{r.path}</td>
                  <td className="px-4 py-2.5 text-right text-[12px] font-semibold">{Math.round(r.avgDepth)}%</td>
                  <td className="px-4 py-2.5 text-right text-[12px] text-muted-foreground">{r.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionTitle>Click Frequency</SectionTitle>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Page</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Element</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Text</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {data.topClicks.map((r, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 font-mono text-[11px] max-w-[120px] truncate">{r.path}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{r.element}</td>
                  <td className="px-4 py-2 text-[12px] max-w-[160px] truncate">{r.text}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[12px]">{r.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Click Heatmap</SectionTitle>
          <select
            value={heatPage}
            onChange={(e) => setHeatPage(e.target.value)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-background"
          >
            {pages.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No click data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="x" name="X%" domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                <YAxis type="number" dataKey="y" name="Y%" domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="%" reversed />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                      <p>x: {d.x}% y: {d.y}% — {d.count} clicks</p>
                    </div>
                  );
                }} />
                <Scatter data={filtered} fill="hsl(var(--primary))" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Retention ────────────────────────────────────────────────────────────

function RetentionTab({ data }: { data: RetentionData }) {
  if (data.cohorts.length === 0) {
    return <EmptyState msg="No retention data yet. Check back once users have been active for multiple weeks." />;
  }

  const maxWeeks = Math.max(...data.cohorts.map((c) => c.retention.length));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Weekly cohorts showing % of users who returned each week after sign-up. Cohort size shown in parentheses.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cohort</th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">Size</th>
              {Array.from({ length: maxWeeks }).map((_, i) => (
                <th key={i} className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">
                  Week {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cohorts.map((c) => (
              <tr key={c.week} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{c.week}</td>
                <td className="px-3 py-2 text-center font-semibold">{c.size}</td>
                {c.retention.map((pct, i) => (
                  <td key={i} className={`px-3 py-2 text-center font-semibold rounded-sm ${retentionColor(pct)}`}>
                    {pct === null ? "" : `${pct}%`}
                  </td>
                ))}
                {Array.from({ length: maxWeeks - c.retention.length }).map((_, i) => (
                  <td key={`empty-${i}`} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Funnels ──────────────────────────────────────────────────────────────

function FunnelsTab({ data }: { data: FunnelData }) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Conversion funnel from registration to power user. Percentages are relative to the first step.
      </p>
      <div className="rounded-xl border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.steps} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
              {data.steps.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {data.steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length], color: "white" }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{step.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{step.count.toLocaleString()} users ({step.pct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${step.pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: User Metrics (legacy) ────────────────────────────────────────────────

function UserMetricsTab({ data }: { data: UserMetrics }) {
  const byHour         = data.byHour         ?? [];
  const byDow          = data.byDow          ?? [];
  const topUsers       = data.topUsers        ?? [];
  const monthlyRegs    = data.monthlyRegs     ?? [];
  const cardDistribution = data.cardDistribution ?? [];
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionTitle>Logins by Hour</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byHour} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Logins" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <SectionTitle>Logins by Day of Week</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byDow} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Logins" fill="hsl(var(--primary) / 0.8)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Monthly Registrations</SectionTitle>
        <div className="rounded-xl border border-border bg-card p-4">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={monthlyRegs} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="New users" fill="hsl(var(--primary) / 0.6)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <SectionTitle>Top Active Users (last 30d)</SectionTitle>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-8">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">User</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Logins</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={u.userId} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-[13px] leading-tight">{u.name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{u.email ?? u.userId}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[13px]">{u.loginCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Performance ──────────────────────────────────────────────────────────

function PerfTab({ data }: { data: PerfMetrics }) {
  const statusChartData = (() => {
    const grouped = new Map<string, number>();
    for (const { status, count } of data.statusDistribution) {
      const g = statusGroup(status);
      grouped.set(g, (grouped.get(g) ?? 0) + count);
    }
    return Array.from(grouped.entries()).map(([group, count]) => ({ group, count }));
  })();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={data.totalRequests.toLocaleString()} sub="Since restart" />
        <StatCard label="Avg Response"   value={`${data.avgMs}ms`}                   sub={`p50: ${data.p50Ms}ms`} />
        <StatCard label="Error Rate"     value={`${data.errorRate}%`}                sub="4xx + 5xx" />
        <StatCard label="P95 Latency"    value={`${data.p95Ms}ms`}                   sub={`p99: ${data.p99Ms}ms`} />
      </div>

      <div>
        <SectionTitle>Requests / Minute (last 60 min)</SectionTitle>
        <div className="rounded-xl border border-border bg-card p-4">
          {data.requestsPerMinute.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.requestsPerMinute} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <defs>
                  <linearGradient id="rpmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="minute" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area dataKey="count" name="Requests" stroke="hsl(var(--primary))" fill="url(#rpmGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <SectionTitle>HTTP Status Distribution</SectionTitle>
        <div className="rounded-xl border border-border bg-card p-4">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={statusChartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="group" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]}>
                {statusChartData.map((entry) => <Cell key={entry.group} fill={STATUS_COLOR[entry.group] ?? "hsl(var(--primary))"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <SectionTitle>Latency by Route (sorted by P95)</SectionTitle>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Route</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Reqs</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Avg</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">P95</th>
              </tr>
            </thead>
            <tbody>
              {data.latencyByRoute.map((r) => (
                <tr key={r.route} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 font-mono text-[11px] max-w-[200px] truncate">{r.route}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[12px] text-muted-foreground">{r.count}</td>
                  <td className="px-4 py-2 text-right"><LatencyBadge ms={r.avg} /></td>
                  <td className="px-4 py-2 text-right"><LatencyBadge ms={r.p95} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type TabId = "overview" | "acquisition" | "devices" | "geography" | "engagement" | "retention" | "funnels" | "users" | "performance";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview",    label: "Overview",    icon: <BarChart3Icon className="h-3.5 w-3.5" /> },
  { id: "acquisition", label: "Acquisition", icon: <TrendingUpIcon className="h-3.5 w-3.5" /> },
  { id: "devices",     label: "Devices",     icon: <MonitorIcon    className="h-3.5 w-3.5" /> },
  { id: "geography",   label: "Geography",   icon: <GlobeIcon      className="h-3.5 w-3.5" /> },
  { id: "engagement",  label: "Engagement",  icon: <ZapIcon        className="h-3.5 w-3.5" /> },
  { id: "retention",   label: "Retention",   icon: <UsersIcon      className="h-3.5 w-3.5" /> },
  { id: "funnels",     label: "Funnels",     icon: <FunnelIcon     className="h-3.5 w-3.5" /> },
  { id: "users",       label: "Users",       icon: <InfoIcon       className="h-3.5 w-3.5" /> },
  { id: "performance", label: "Performance", icon: <ActivityIcon   className="h-3.5 w-3.5" /> },
];

export function MetricsDashboard() {
  const [tab, setTab]       = useState<TabId>("overview");
  const [range, setRange]   = useState<Range>("30d");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [overview,    setOverview]    = useState<OverviewData | null>(null);
  const [acquisition, setAcquisition] = useState<AcquisitionData | null>(null);
  const [devices,     setDevices]     = useState<DevicesData | null>(null);
  const [geography,   setGeography]   = useState<GeoData | null>(null);
  const [engagement,  setEngagement]  = useState<EngagementData | null>(null);
  const [retention,   setRetention]   = useState<RetentionData | null>(null);
  const [funnels,     setFunnels]     = useState<FunnelData | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [perfMetrics, setPerfMetrics] = useState<PerfMetrics | null>(null);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);

  const fetchAll = useCallback(async (r: Range) => {
    setLoading(true);
    async function safeFetch<T>(url: string): Promise<T | null> {
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (!text || !res.ok) return null;
        const data = JSON.parse(text);
        if (typeof data === "object" && data !== null && "error" in data) return null;
        return data as T;
      } catch {
        return null;
      }
    }
    try {
      const [ov, ac, dv, ge, en, re, fn, um, pm, ps] = await Promise.all([
        safeFetch<OverviewData>(`/api/admin/analytics/overview?range=${r}`),
        safeFetch<AcquisitionData>(`/api/admin/analytics/acquisition?range=${r}`),
        safeFetch<DevicesData>(`/api/admin/analytics/devices?range=${r}`),
        safeFetch<GeoData>(`/api/admin/analytics/geography?range=${r}`),
        safeFetch<EngagementData>(`/api/admin/analytics/engagement?range=${r}`),
        safeFetch<RetentionData>(`/api/admin/analytics/retention`),
        safeFetch<FunnelData>(`/api/admin/analytics/funnels`),
        safeFetch<UserMetrics>(`/api/admin/user-metrics`),
        safeFetch<PerfMetrics>(`/api/admin/performance-metrics`),
        safeFetch<PortfolioStats>(`/api/admin/analytics/portfolio-stats`),
      ]);
      setOverview(ov); setAcquisition(ac); setDevices(dv); setGeography(ge);
      setEngagement(en); setRetention(re); setFunnels(fn);
      setUserMetrics(um); setPerfMetrics(pm); setPortfolioStats(ps);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(range);
    const id = setInterval(() => fetchAll(range), 30_000);
    return () => clearInterval(id);
  }, [range, fetchAll]);

  function renderTab() {
    switch (tab) {
      case "overview":    return overview    ? <OverviewTab    data={overview}    onExport={() => overview && exportCSV("overview.csv", overview.topPages)} /> : <EmptyState msg="Loading…" />;
      case "acquisition": return acquisition ? <AcquisitionTab data={acquisition} />  : <EmptyState msg="Loading…" />;
      case "devices":     return devices     ? <DevicesTab     data={devices} />       : <EmptyState msg="Loading…" />;
      case "geography":   return geography   ? <GeographyTab   data={geography} />     : <EmptyState msg="Loading…" />;
      case "engagement":  return engagement  ? <EngagementTab  data={engagement} />    : <EmptyState msg="Loading…" />;
      case "retention":   return retention   ? <RetentionTab   data={retention} />     : <EmptyState msg="Loading…" />;
      case "funnels":     return funnels     ? <FunnelsTab     data={funnels} />       : <EmptyState msg="Loading…" />;
      case "users":       return userMetrics ? <UserMetricsTab data={userMetrics} />   : <EmptyState msg="Loading…" />;
      case "performance": return perfMetrics ? <PerfTab        data={perfMetrics} />   : <EmptyState msg="Loading…" />;
    }
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <KpiRow user={userMetrics} perf={perfMetrics} portfolio={portfolioStats} />

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tab bar (scrollable on small screens) */}
        <div className="flex gap-1 overflow-x-auto p-1 rounded-lg bg-muted/50 border border-border no-scrollbar">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Range picker */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border text-xs">
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {lastUpdated && <span className="text-xs text-muted-foreground hidden sm:block">Updated {lastUpdated}</span>}
          <button
            onClick={() => fetchAll(range)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab content */}
      {renderTab()}
    </div>
  );
}
