"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVerticalIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  UserPlusIcon,
  BanIcon,
  NetworkIcon,
  CpuIcon,
  RefreshCwIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayCount = { day: string; count: number };
type IpRow = { ip: string; total: number; uniqueUsers: number };
type BanRow = {
  id: string;
  email: string;
  ipAddress: string | null;
  reason: string | null;
  bannedAt: string | null;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  cardCount: number;
};
type GenreRow = { genre: string; count: number };

export type AnalyticsData = {
  users: { total: number; active: number; pending: number; locked: number };
  cards: { owned: number; wanted: number };
  byGenre: GenreRow[];
  priceHistory: { total: number; lastRefreshStr: string };
  perUser: UserRow[];
  cardsPerDay: DayCount[];
  security: {
    logsPerDay: DayCount[];
    topIps: IpRow[];
    recentBans: BanRow[];
    registrationsPerDay: DayCount[];
  };
};

type SectionId =
  | "overview"
  | "genre"
  | "cards-activity"
  | "users"
  | "security-logins"
  | "security-ips"
  | "security-registrations"
  | "security-bans"
  | "system-health";

const DEFAULT_ORDER: SectionId[] = [
  "overview",
  "system-health",
  "security-logins",
  "security-registrations",
  "security-ips",
  "security-bans",
  "genre",
  "cards-activity",
  "users",
];

const LS_KEY = "cv_analytics_order";

const GENRE_LABELS: Record<string, string> = {
  basketball: "Basketball",
  baseball: "Baseball",
  football: "Football",
  soccer: "Soccer",
  hockey: "Hockey",
  pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!",
  magic: "MTG",
  other: "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterDays(data: DayCount[], days: number): DayCount[] {
  if (data.length === 0) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.filter((d) => d.day >= cutoffStr);
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({ data, height = 80 }: { data: DayCount[]; height?: number }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No data in this window
      </p>
    );
  }
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ height }}>
        {data.map((d) => (
          <div
            key={d.day}
            className="flex-1 flex flex-col items-center justify-end"
            title={`${d.day}: ${d.count}`}
          >
            <div
              className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors min-h-[2px]"
              style={{ height: `${(d.count / maxVal) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span>{data[0].day.slice(5)}</span>
        <span>{data[data.length - 1].day.slice(5)}</span>
      </div>
    </div>
  );
}

function TimeFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {([7, 14, 30] as const).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
            value === d
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

// ─── Drag scaffold ────────────────────────────────────────────────────────────

function SortableSection({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="group/section relative">
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-0 pointer-events-none group-hover/section:opacity-100 group-hover/section:pointer-events-auto transition-opacity cursor-grab active:cursor-grabbing bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5"
        style={{ touchAction: "none" }}
        title="Drag to reorder"
        aria-label="Drag to reorder section"
      >
        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium select-none">
          drag to reorder
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function OverviewSection({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard
        label="Total Users"
        value={data.users.total}
        sub={`${data.users.active} active · ${data.users.pending} pending`}
      />
      <StatCard label="Locked Accounts" value={data.users.locked} sub="manually locked" />
      <StatCard
        label="Total Cards"
        value={data.cards.owned}
        sub={`+ ${data.cards.wanted} on watchlist`}
      />
      <StatCard
        label="Price History Entries"
        value={data.priceHistory.total.toLocaleString()}
        sub={`Last refresh: ${data.priceHistory.lastRefreshStr}`}
      />
    </div>
  );
}

function GenreSection({ byGenre }: { byGenre: GenreRow[] }) {
  if (byGenre.length === 0) return null;
  const maxCount = Math.max(...byGenre.map((g) => g.count));
  return (
    <section>
      <h2 className="text-base font-semibold mb-3">Cards by Genre</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Genre</span>
          <span className="text-right">Cards</span>
        </div>
        {byGenre.map((g) => (
          <div
            key={g.genre}
            className="grid grid-cols-[1fr_auto] items-center px-4 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
          >
            <span className="text-sm">{GENRE_LABELS[g.genre] ?? g.genre}</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, (g.count / maxCount) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums text-right min-w-[2rem]">
                {g.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CardsActivitySection({ cardsPerDay }: { cardsPerDay: DayCount[] }) {
  if (cardsPerDay.length === 0) return null;
  return (
    <section>
      <h2 className="text-base font-semibold mb-3">Cards Added (Last 30 Days)</h2>
      <div className="rounded-xl border border-border bg-card p-4">
        <BarChart data={cardsPerDay} height={96} />
      </div>
    </section>
  );
}

function UsersSection({ perUser }: { perUser: UserRow[] }) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-3">Users</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Name</span>
          <span>Email</span>
          <span>Status</span>
          <span className="text-right">Cards</span>
        </div>
        {perUser.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
          >
            <div>
              <p className="text-sm font-medium truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.role}</p>
            </div>
            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                u.status === "pending"
                  ? "bg-amber-400/15 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {u.status}
            </span>
            <span className="text-sm font-semibold tabular-nums text-right">
              {u.cardCount}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Security: Login Activity ──────────────────────────────────────────────────

function SecurityLoginsSection({
  logsPerDay,
  timeWindow,
  onTimeChange,
}: {
  logsPerDay: DayCount[];
  timeWindow: number;
  onTimeChange: (v: number) => void;
}) {
  const filtered = filterDays(logsPerDay, timeWindow);
  const total = filtered.reduce((s, d) => s + d.count, 0);
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ShieldAlertIcon className="h-4 w-4 text-amber-500" />
          Login Activity
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total} events</span>
          <TimeFilter value={timeWindow} onChange={onTimeChange} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <BarChart data={filtered} height={80} />
      </div>
    </section>
  );
}

// ── Security: New Registrations ───────────────────────────────────────────────

function SecurityRegistrationsSection({
  registrationsPerDay,
  timeWindow,
  onTimeChange,
}: {
  registrationsPerDay: DayCount[];
  timeWindow: number;
  onTimeChange: (v: number) => void;
}) {
  const filtered = filterDays(registrationsPerDay, timeWindow);
  const total = filtered.reduce((s, d) => s + d.count, 0);
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <UserPlusIcon className="h-4 w-4 text-blue-500" />
          New Registrations
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total} signups</span>
          <TimeFilter value={timeWindow} onChange={onTimeChange} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <BarChart data={filtered} height={80} />
      </div>
    </section>
  );
}

// ── Security: Top Login IPs ───────────────────────────────────────────────────

function SecurityIpsSection({ topIps }: { topIps: IpRow[] }) {
  const [ipFilter, setIpFilter] = useState("");
  const visible = ipFilter.trim()
    ? topIps.filter((r) => r.ip.includes(ipFilter.trim()))
    : topIps;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <NetworkIcon className="h-4 w-4 text-violet-500" />
          Top Login IPs
        </h2>
        <input
          type="text"
          placeholder="Filter by IP…"
          value={ipFilter}
          onChange={(e) => setIpFilter(e.target.value)}
          className="text-xs px-2.5 py-1 rounded-md border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-36"
        />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>IP Address</span>
          <span className="text-right">Logins</span>
          <span className="text-right">Unique Users</span>
          <span>Flag</span>
        </div>
        {visible.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No login data recorded yet.
          </p>
        )}
        {visible.map((r) => (
          <div
            key={r.ip}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors ${
              r.uniqueUsers > 1 ? "bg-amber-400/5" : ""
            }`}
          >
            <span className="text-sm font-mono">{r.ip}</span>
            <span className="text-sm tabular-nums text-right">{r.total}</span>
            <span className="text-sm tabular-nums text-right">{r.uniqueUsers}</span>
            <span>
              {r.uniqueUsers > 1 && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-500">
                  multi-user
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Security: Recent Bans ─────────────────────────────────────────────────────

function SecurityBansSection({ recentBans }: { recentBans: BanRow[] }) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        <BanIcon className="h-4 w-4 text-red-500" />
        Recent Bans
      </h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Email</span>
          <span>IP</span>
          <span>Reason</span>
          <span className="text-right">Date</span>
        </div>
        {recentBans.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">No bans recorded.</p>
        )}
        {recentBans.map((b) => (
          <div
            key={b.id}
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center px-4 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
          >
            <span className="text-sm truncate">{b.email}</span>
            <span className="text-sm font-mono text-muted-foreground truncate">
              {b.ipAddress ?? "—"}
            </span>
            <span className="text-sm text-muted-foreground truncate">{b.reason ?? "—"}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {b.bannedAt ? new Date(b.bannedAt).toLocaleDateString() : "—"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── System Health ─────────────────────────────────────────────────────────────

type SystemMetrics = {
  cpu: { cores: number; loadAvg1: number; loadAvg5: number; loadAvg15: number; usagePct: number };
  memory: { totalMb: number; usedMb: number; freeMb: number; usagePct: number; heapUsedMb: number; heapTotalMb: number; rssMb: number };
  uptime: { processSec: number; systemSec: number };
  security: { uploadBlocked: number; scanBlocked: number; registrationBlocked: number };
};

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function MeterBar({ pct, danger = 80, warn = 55 }: { pct: number; danger?: number; warn?: number }) {
  const color =
    pct >= danger ? "bg-red-500" : pct >= warn ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function SystemHealthSection() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function fetchMetrics() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/system-metrics");
      if (!res.ok) throw new Error();
      setMetrics(await res.json());
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <CpuIcon className="h-4 w-4 text-emerald-500" />
          System Health
        </h2>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">Updated {lastUpdated}</span>
          )}
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-muted-foreground px-1">Failed to load system metrics.</p>
      )}

      {!metrics && !error && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* CPU */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CPU Load</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold tabular-nums">{metrics.cpu.usagePct}%</span>
              <span className="text-xs text-muted-foreground mb-0.5">{metrics.cpu.cores} cores</span>
            </div>
            <MeterBar pct={metrics.cpu.usagePct} />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              1m: {metrics.cpu.loadAvg1} · 5m: {metrics.cpu.loadAvg5} · 15m: {metrics.cpu.loadAvg15}
            </p>
          </div>

          {/* Memory */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System Memory</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold tabular-nums">{metrics.memory.usagePct}%</span>
              <span className="text-xs text-muted-foreground mb-0.5">{metrics.memory.usedMb} / {metrics.memory.totalMb} MB</span>
            </div>
            <MeterBar pct={metrics.memory.usagePct} />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Process heap: {metrics.memory.heapUsedMb} / {metrics.memory.heapTotalMb} MB &middot; RSS: {metrics.memory.rssMb} MB
            </p>
          </div>

          {/* Uptime */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Uptime</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{formatUptime(metrics.uptime.processSec)}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Process &middot; System: {formatUptime(metrics.uptime.systemSec)}
            </p>
          </div>

          {/* Rate-limit counters */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Blocked Requests</p>
            <div className="space-y-2">
              {[
                { label: "Upload spam", value: metrics.security.uploadBlocked },
                { label: "Scan abuse", value: metrics.security.scanBlocked },
                { label: "Signup spam", value: metrics.security.registrationBlocked },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${
                    value > 0 ? "text-amber-500" : "text-muted-foreground"
                  }`}>{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Since last server restart</p>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const [order, setOrder] = useState<SectionId[]>(DEFAULT_ORDER);
  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const [mounted, setMounted] = useState(false);
  // Shared time window used by both security chart sections
  const [timeWindow, setTimeWindow] = useState<number>(30);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SectionId[];
        const merged = [
          ...parsed.filter((id) => DEFAULT_ORDER.includes(id)),
          ...DEFAULT_ORDER.filter((id) => !parsed.includes(id)),
        ];
        setOrder(merged);
      }
    } catch {}
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as SectionId);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const next = arrayMove(
        prev,
        prev.indexOf(active.id as SectionId),
        prev.indexOf(over.id as SectionId)
      );
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function resetOrder() {
    setOrder(DEFAULT_ORDER);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  }

  const SECTION_MAP: Record<SectionId, React.ReactNode> = {
    overview: <OverviewSection data={data} />,
    genre: <GenreSection byGenre={data.byGenre} />,
    "cards-activity": <CardsActivitySection cardsPerDay={data.cardsPerDay} />,
    users: <UsersSection perUser={data.perUser} />,
    "security-logins": (
      <SecurityLoginsSection
        logsPerDay={data.security.logsPerDay}
        timeWindow={timeWindow}
        onTimeChange={setTimeWindow}
      />
    ),
    "security-registrations": (
      <SecurityRegistrationsSection
        registrationsPerDay={data.security.registrationsPerDay}
        timeWindow={timeWindow}
        onTimeChange={setTimeWindow}
      />
    ),
    "security-ips": <SecurityIpsSection topIps={data.security.topIps} />,
    "security-bans": <SecurityBansSection recentBans={data.security.recentBans} />,
    "system-health": <SystemHealthSection />,
  };

  // Pre-hydration: render without DnD to avoid SSR mismatch
  if (!mounted) {
    return (
      <div className="space-y-8">
        {DEFAULT_ORDER.map((id) => (
          <div key={id}>{SECTION_MAP[id]}</div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={resetOrder}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcwIcon className="h-3.5 w-3.5" />
          Reset layout
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-8">
            {order.map((id) => (
              <SortableSection key={id} id={id}>
                {SECTION_MAP[id]}
              </SortableSection>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && (
            <div className="opacity-80 rotate-1 shadow-xl">
              {SECTION_MAP[activeId]}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
