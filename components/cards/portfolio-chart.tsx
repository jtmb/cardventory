"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = { date: string; totalValue: number };

const PERIOD_OPTIONS = [
  { label: "30d",  days: 30 },
  { label: "90d",  days: 90 },
  { label: "180d", days: 180 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PortfolioChart({ data }: { data: DataPoint[] }) {
  const [activeDays, setActiveDays] = useState(90);

  const cutoff = new Date(Date.now() - activeDays * 24 * 60 * 60 * 1000);
  const filtered = data.filter((d) => new Date(d.date + "T12:00:00Z") >= cutoff);

  if (!filtered.length) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Not enough price history yet
      </div>
    );
  }

  const chartData = filtered.map((d) => ({
    date: fmtDate(d.date),
    value: d.totalValue,
  }));

  const minVal = Math.min(...chartData.map((d) => d.value));
  const maxVal = Math.max(...chartData.map((d) => d.value));
  const trend = filtered.length >= 2 ? filtered[filtered.length - 1].totalValue - filtered[0].totalValue : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{fmt(filtered[filtered.length - 1]?.totalValue ?? 0)}</p>
          <p className={`text-xs mt-0.5 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? "+" : ""}{fmt(trend)} over period
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {PERIOD_OPTIONS.map(({ label, days }) => (
            <button
              key={days}
              onClick={() => setActiveDays(days)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                activeDays === days
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              domain={[minVal * 0.95, maxVal * 1.05]}
              width={40}
            />
            <Tooltip
              formatter={(value) => [fmt(Number(value)), "Portfolio Value"]}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
