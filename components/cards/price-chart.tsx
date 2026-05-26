"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistory } from "@/lib/db/schema";

const PERIOD_OPTIONS = [
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "180 Days", days: 180 },
  { label: "365 Days", days: 365 },
  { label: "All", days: Infinity },
];

const SOURCE_COLORS: Record<string, string> = {
  pricecharting: "#3b82f6",
  sportscardinvestor: "#10b981",
  cardladder: "#f59e0b",
  sportscardspro: "#ef4444",
};

const SOURCE_LABELS: Record<string, string> = {
  pricecharting: "PriceCharting",
  sportscardinvestor: "SCI",
  cardladder: "CardLadder",
  sportscardspro: "SCPro",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function PriceChart({ history }: { history: PriceHistory[] }) {
  const [activePeriod, setActivePeriod] = useState(30);

  const cutoff = activePeriod === Infinity
    ? new Date(0)
    : new Date(Date.now() - activePeriod * 24 * 60 * 60 * 1000);

  const filtered = history.filter((h) => {
    const date = h.fetchedAt instanceof Date ? h.fetchedAt : new Date(h.fetchedAt);
    return date >= cutoff;
  });

  // Group by date (day) and source
  const byDay = new Map<string, Record<string, number | null>>();

  for (const entry of filtered) {
    const date = entry.fetchedAt instanceof Date ? entry.fetchedAt : new Date(entry.fetchedAt);
    const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const existing = byDay.get(day) ?? {};
    if (entry.price !== null) {
      existing[entry.source] = entry.price;
    }
    byDay.set(day, existing);
  }

  const chartData = Array.from(byDay.entries()).map(([date, prices]) => ({
    date,
    ...prices,
  }));

  const sources = [...new Set(filtered.map((h) => h.source))];

  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">No price data for this period</p>;
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1.5 flex-wrap">
        {PERIOD_OPTIONS.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => setActivePeriod(days)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activePeriod === days
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
            labelStyle={{ color: "#e4e4e7", fontSize: 12 }}
            formatter={(value) => [
              typeof value === 'number' ? fmt(value) : String(value ?? ''),
              "",
            ]}
          />
          <Legend
            formatter={(value) => SOURCE_LABELS[value] ?? value}
            wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
          />
          {sources.map((source) => (
            <Line
              key={source}
              type="monotone"
              dataKey={source}
              stroke={SOURCE_COLORS[source] ?? "#6366f1"}
              strokeWidth={2}
              dot={false}
              connectNulls
              name={source}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
