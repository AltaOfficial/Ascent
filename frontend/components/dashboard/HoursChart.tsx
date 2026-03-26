"use client";

import { useState, useMemo } from "react";
import { subDays, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

type Period = "7d" | "30d" | "3m";

function genDays(n: number): string[] {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => format(subDays(today, n - 1 - i), "MMM d"));
}

function genHours(n: number, seed: number): number[] {
  // deterministic pseudorandom for SSR consistency
  return Array.from({ length: n }, (_, i) => {
    const x = Math.sin(seed + i) * 10000;
    return +((x - Math.floor(x)) * 4 + 1.5).toFixed(1);
  });
}

const DATASETS: Record<Period, { labels: string[]; data: number[] }> = {
  "7d":  { labels: genDays(7),  data: genHours(7,  1) },
  "30d": { labels: genDays(30), data: genHours(30, 2) },
  "3m":  { labels: genDays(90), data: genHours(90, 3) },
};

const PERIOD_LABELS: Record<Period, string> = {
  "7d":  "Total for the last 7 days",
  "30d": "Total for the last 30 days",
  "3m":  "Total for the last 3 months",
};

const TABS: { key: Period; label: string }[] = [
  { key: "3m",  label: "Last 3 Months" },
  { key: "30d", label: "Last 30 Days" },
  { key: "7d",  label: "Last 7 Days" },
];

export default function HoursChart() {
  const [period, setPeriod] = useState<Period>("30d");

  const chartData = useMemo(
    () => DATASETS[period].labels.map((label, i) => ({ label, hours: DATASETS[period].data[i] })),
    [period]
  );

  return (
    <div
      className="rounded-[10px] border p-5 mb-6"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <div
            className="text-sm font-semibold tracking-[-0.01em] mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Hours Worked
          </div>
          <div className="text-[10px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
            {PERIOD_LABELS[period]}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex border rounded-md overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={cn(
                "px-3 py-1.5 text-[10px] tracking-[0.04em] transition-colors font-mono",
                period === tab.key
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-mid"
              )}
              style={{
                background: period === tab.key ? "var(--surface-2)" : "transparent",
                fontFamily: "var(--font-mono)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-45">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval={period === "3m" ? 11 : period === "30d" ? 4 : 0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}h`}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-mid)",
                borderRadius: 6,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
              }}
              formatter={(v) => [`${v}h`, "Hours"]}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
            />
            <Bar dataKey="hours" fill="rgba(232,232,232,0.82)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
