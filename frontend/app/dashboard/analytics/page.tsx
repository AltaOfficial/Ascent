"use client";

import { useMemo, useState } from "react";
import { subDays, format } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number, from = new Date()) {
  return subDays(from, n);
}

function fmt(d: Date) {
  return format(d, "MMM d");
}

// ── layout primitives ─────────────────────────────────────────────────────────

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span
        className="text-[9px] tracking-[0.14em] uppercase"
        style={{ color: "var(--text-secondary)" }}
      >
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

function Card({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[10px] border p-5 md:p-6 ${className ?? ""}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)", ...style }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] tracking-[0.09em] uppercase mb-3.5"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </div>
  );
}

const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-mid)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-primary)",
};

// ── 1. Rolling Average Chart ──────────────────────────────────────────────────

function rollingAvg(arr: number[], n = 7): (number | null)[] {
  return arr.map((_, i) => {
    if (i < n - 1) return null;
    const slice = arr.slice(i - n + 1, i + 1);
    return parseFloat((slice.reduce((a, b) => a + b, 0) / n).toFixed(2));
  });
}

function RollingAverageCard({ rawHours }: { rawHours: number[] }) {
  const today = new Date();
  const chartData = useMemo(() => {
    const rolling = rollingAvg(rawHours);
    return rawHours.map((h, i) => ({
      date: fmt(daysAgo(rawHours.length - 1 - i, today)),
      raw: h,
      avg: rolling[i],
    }));
  }, [rawHours]);

  const rolling = rollingAvg(rawHours).filter((v) => v !== null) as number[];
  const cur7 = rolling.length >= 1 ? rolling[rolling.length - 1] : null;
  const prev7 = rolling.length >= 8 ? rolling[rolling.length - 8] : null;
  const diff = cur7 !== null && prev7 !== null ? parseFloat((cur7 - prev7).toFixed(1)) : null;

  return (
    <Card>
      <CardLabel>7-Day Rolling Average</CardLabel>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval={7}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}h`}
              width={28}
              domain={[0, 7]}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
              formatter={(v: number, name: string) => [
                `${v}h`,
                name === "raw" ? "Raw" : "7-day avg",
              ]}
            />
            <Line
              type="monotone"
              dataKey="raw"
              stroke="rgba(200,200,210,0.12)"
              strokeWidth={1}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="rgba(200,200,210,0.75)"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        className="flex gap-8 mt-5 pt-4.5 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        {[
          { label: "Current 7-day avg", val: cur7 !== null ? `${cur7}h` : "—" },
          { label: "Previous 7-day avg", val: prev7 !== null ? `${prev7}h` : "—" },
          { label: "Difference", val: diff !== null ? `${diff > 0 ? "+" : ""}${diff}h` : "—" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <span
              className="text-[10px] tracking-[0.05em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              {s.label}
            </span>
            <span
              className="text-base font-semibold tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {s.val}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 2. Volatility Card ────────────────────────────────────────────────────────

function VolatilityCard({ last14 }: { last14: number[] }) {
  const hasData = last14.length >= 2;
  const mean = hasData ? last14.reduce((a, b) => a + b, 0) / last14.length : 0;
  const variance = hasData ? last14.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / last14.length : 0;
  const stddev = parseFloat(Math.sqrt(variance).toFixed(2));
  const volPct = hasData ? Math.min(100, (stddev / 3) * 100) : 0;

  const label = !hasData
    ? "No data yet."
    : stddev < 0.8
    ? "Highly stable. Your output is consistent."
    : stddev < 1.5
    ? "Moderate variance. Minor fluctuation — acceptable."
    : stddev < 2.2
    ? "Elevated volatility. Inconsistency is showing."
    : "High volatility. Output is unpredictable right now.";

  return (
    <Card>
      <CardLabel>Stability Indicator — Volatility Score (14 days)</CardLabel>
      <div className="flex gap-10 items-start">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-semibold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {hasData ? stddev : "—"}
            </span>
            <span
              className="text-[13px]"
              style={{ color: "var(--text-secondary)" }}
            >
              σ hrs
            </span>
          </div>
          <div
            className="text-[11px] mt-2 tracking-[0.02em] max-w-[180px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {label}
          </div>
        </div>
        <div className="flex-1 pt-2">
          <div
            className="h-px rounded overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded"
              style={{
                width: `${volPct}%`,
                background: "var(--accent)",
                opacity: 0.45,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            {["Stable (0)", "Moderate (1.5)", "Volatile (3+)"].map((l) => (
              <span
                key={l}
                className="text-[10px] tracking-[0.04em]"
                style={{ color: "var(--text-secondary)" }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── 3. Heatmap Card ───────────────────────────────────────────────────────────

function heatLevel(h: number) {
  if (h === 0) return 0;
  if (h < 2) return 1;
  if (h < 3) return 2;
  if (h < 5) return 3;
  return 4;
}

const HM_COLORS = [
  "var(--surface-2)",
  "rgba(200,200,210,0.14)",
  "rgba(200,200,210,0.32)",
  "rgba(200,200,210,0.58)",
  "rgba(200,200,210,0.82)",
];

function HeatmapCard({ last30 }: { last30: number[] }) {
  const today = new Date();
  const startDate = daysAgo(29, today);

  return (
    <Card>
      <CardLabel>30-Day Heatmap</CardLabel>
      <div className="flex flex-wrap gap-1">
        {last30.map((h, i) => (
          <div
            key={i}
            title={`${fmt(daysAgo(29 - i, today))}: ${h}h`}
            className="w-4 h-4 rounded-[2px] border"
            style={{
              background: HM_COLORS[heatLevel(h)],
              borderColor: "var(--border)",
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span
          className="text-[10px] tracking-[0.03em]"
          style={{ color: "var(--text-secondary)" }}
        >
          {fmt(startDate)} – {fmt(today)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] mr-0.5" style={{ color: "var(--text-secondary)" }}>
            0h
          </span>
          {HM_COLORS.map((c, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-[2px] border"
              style={{ background: c, borderColor: "var(--border)" }}
            />
          ))}
          <span className="text-[10px] ml-0.5" style={{ color: "var(--text-secondary)" }}>
            5h+
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── 4. Consistency Card ───────────────────────────────────────────────────────

function ConsistencyCard({ last30 }: { last30: number[] }) {
  const threshold = 3;
  const hasData = last30.length > 0;
  const hitDays = last30.filter((h) => h >= threshold).length;
  const pct = hasData ? Math.round((hitDays / last30.length) * 100) : 0;

  const note = !hasData
    ? "No data yet."
    : pct >= 70
    ? "Solid floor. Focus on depth now."
    : pct >= 50
    ? "Room to improve consistency."
    : "Showing up is the bottleneck right now.";

  return (
    <Card>
      <CardLabel>Consistency Rate — threshold: 3h/day</CardLabel>
      <div className="flex items-end gap-5">
        <div className="flex flex-col gap-1">
          <span
            className="text-[28px] font-semibold tracking-[-0.03em] leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {hasData ? `${pct}%` : "—"}
          </span>
          <span
            className="text-[10px] tracking-[0.06em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Days hit threshold (last 30)
          </span>
        </div>
        <div className="flex-1 pb-1.5">
          <div
            className="h-px rounded overflow-hidden mb-1.5"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded"
              style={{ width: `${pct}%`, background: "var(--accent)", opacity: 0.5 }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
              0%
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
              100%
            </span>
          </div>
        </div>
      </div>
      <div
        className="mt-4 text-[11px] tracking-[0.02em]"
        style={{ color: "var(--text-secondary)" }}
      >
        {hitDays} of 30 days at or above {threshold}h. {note}
      </div>
    </Card>
  );
}

// ── 5. Monthly Comparison ─────────────────────────────────────────────────────

type MonthStats = { total: number; avgPerDay: number; activeDays: number } | null;

function MonthlyComparisonCard({ thisMonth, lastMonth }: { thisMonth: MonthStats; lastMonth: MonthStats }) {
  const changePct = thisMonth && lastMonth && lastMonth.total > 0
    ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100)
    : null;
  const changeConsist = thisMonth && lastMonth
    ? thisMonth.activeDays - lastMonth.activeDays
    : null;

  const panels: { label: string; data: MonthStats }[] = [
    { label: "This Month", data: thisMonth },
    { label: "Last Month", data: lastMonth },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {panels.map(({ label, data }) => (
          <div
            key={label}
            className="rounded-[10px] border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div
              className="text-[10px] tracking-[0.09em] uppercase mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {label}
            </div>
            {[
              ["Total hours", data ? `${data.total}h` : "—"],
              ["Avg per day", data ? `${data.avgPerDay}h` : "—"],
              ["Active days", data ? `${data.activeDays}` : "—"],
            ].map(([name, val]) => (
              <div
                key={name}
                className="flex justify-between py-2 border-b last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-[12px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
                  {name}
                </span>
                <span className="text-[12px] tracking-[0.02em]" style={{ color: "var(--text-primary)" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        className="rounded-[10px] border px-5 py-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex gap-6">
          {[
            { val: changePct !== null ? `${changePct > 0 ? "+" : ""}${changePct}%` : "—", label: "Total hours" },
            { val: changeConsist !== null ? `${changeConsist > 0 ? "+" : ""}${changeConsist} days` : "—", label: "Active days" },
          ].map((c) => (
            <div key={c.label} className="flex flex-col gap-1">
              <span
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {c.val}
              </span>
              <span
                className="text-[10px] tracking-[0.05em] uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 6. Drift Watch ────────────────────────────────────────────────────────────

const DRIFT_CATEGORY_META = [
  { label: "School", color: "rgba(91,141,217,0.75)" },
  { label: "Revenue", color: "rgba(107,187,138,0.75)" },
  { label: "Skills", color: "rgba(196,127,212,0.75)" },
  { label: "Maintenance", color: "rgba(200,200,210,0.35)" },
  { label: "Personal", color: "rgba(217,167,91,0.65)" },
];

type DriftWeek = { week: string } & Record<string, number>;

function DriftWatchCard({ weeks }: { weeks: DriftWeek[] }) {
  return (
    <Card>
      <CardLabel>Drift Watch — Weekly Time Allocation</CardLabel>
      <div className="flex flex-wrap gap-3 mb-4">
        {DRIFT_CATEGORY_META.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-[2px]"
              style={{ background: c.color }}
            />
            <span className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}h`}
              width={28}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
              formatter={(v: number, name: string) => [`${v}h`, name]}
            />
            {DRIFT_CATEGORY_META.map((c) => (
              <Bar
                key={c.label}
                dataKey={c.label}
                stackId="a"
                fill={c.color}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ── 7. High-Value Focus ───────────────────────────────────────────────────────

type HVEntry = { label: string; pct: number };

function HighValueCard({ breakdown }: { breakdown: HVEntry[] }) {
  const total = breakdown.filter((h) => h.label !== "Other").reduce(
    (a, b) => a + b.pct,
    0
  );

  return (
    <Card>
      <CardLabel>High-Value Focus — last 30 days</CardLabel>
      <div className="flex items-center gap-7">
        <div>
          <div
            className="text-[40px] font-semibold tracking-[-0.04em] leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {breakdown.length > 0 ? `${total}%` : "—"}
          </div>
          <div
            className="text-[11px] tracking-[0.02em] mt-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            of hours were
            <br />
            high-leverage
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {breakdown.map((h) => (
            <div key={h.label} className="flex items-center gap-2.5">
              <span
                className="text-[11px] tracking-[0.02em] w-[90px] shrink-0"
                style={{ color: "var(--text-secondary)" }}
              >
                {h.label}
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "var(--border)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${h.pct}%`,
                    background: "var(--accent)",
                    opacity: 0.45,
                  }}
                />
              </div>
              <span
                className="text-[11px] w-8 text-right"
                style={{ color: "var(--text-mid)" }}
              >
                {h.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── 8. Session Stats ──────────────────────────────────────────────────────────

type SessionStats = { avgMin: number | null; longestMin: number | null; perDay: number | null };

function fmtMin(m: number | null): string {
  if (m === null) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function SessionStatsCard({ stats, trend }: { stats: SessionStats; trend: number[] }) {
  const today = new Date();
  const trendData = trend.map((v, i) => ({
    date: fmt(daysAgo(trend.length - 1 - i, today)),
    min: v,
  }));

  return (
    <Card>
      <CardLabel>Session Length Stats — last 30 days</CardLabel>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { val: fmtMin(stats.avgMin), label: "Avg session length" },
          { val: fmtMin(stats.longestMin), label: "Longest session" },
          { val: stats.perDay !== null ? `${stats.perDay}` : "—", label: "Sessions per day" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border p-4"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
          >
            <div
              className="text-[22px] font-semibold tracking-[-0.03em] mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {s.val}
            </div>
            <div
              className="text-[10px] tracking-[0.06em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}m`}
              width={28}
              domain={[20, 70]}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
              formatter={(v: number) => [`${v} min`, "Avg session"]}
            />
            <Line
              type="monotone"
              dataKey="min"
              stroke="rgba(200,200,210,0.6)"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ── 9. Estimation Accuracy ────────────────────────────────────────────────────

type AccEntry = { month: string; err: number };

function EstimationAccuracyCard({ data }: { data: AccEntry[] }) {
  const maxErr = 35;
  const current = data.length > 0 ? data[data.length - 1].err : null;
  const improvement = data.length >= 2 ? data[0].err - data[data.length - 1].err : null;

  return (
    <Card>
      <CardLabel>Estimation Accuracy — avg % error over time</CardLabel>
      <div className="flex flex-col">
        {data.length === 0 ? (
          <div className="py-6 text-[12px] tracking-[0.02em]" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
            No estimation data yet.
          </div>
        ) : data.map((a) => (
          <div
            key={a.month}
            className="flex items-center gap-4 py-2.5 border-b last:border-b-0"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="text-[12px] tracking-[0.02em] w-[72px] shrink-0"
              style={{ color: "var(--text-secondary)" }}
            >
              {a.month}
            </span>
            <div className="flex-1 h-px relative" style={{ background: "var(--border)" }}>
              <div
                className="absolute top-0 left-0 h-full"
                style={{
                  width: `${Math.round((a.err / maxErr) * 100)}%`,
                  background: "var(--accent)",
                  opacity: 0.5,
                }}
              />
            </div>
            <span
              className="text-[12px] tracking-[0.02em] w-12 text-right shrink-0"
              style={{ color: "var(--text-primary)" }}
            >
              {a.err}% err
            </span>
          </div>
        ))}
      </div>
      <div
        className="flex gap-6 mt-4.5 pt-4 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        {[
          { val: current !== null ? `${current}%` : "—", label: "Current avg error" },
          { val: improvement !== null ? `-${improvement}%` : "—", label: "Improvement (3 months)" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <span
              className="text-[20px] font-semibold tracking-[-0.02em] leading-none"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {s.val}
            </span>
            <span
              className="text-[10px] tracking-[0.06em] uppercase mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [rawHours] = useState<number[]>([]);
  const [thisMonth] = useState<MonthStats>(null);
  const [lastMonth] = useState<MonthStats>(null);
  const [driftWeeks] = useState<DriftWeek[]>([]);
  const [hvBreakdown] = useState<HVEntry[]>([]);
  const [sessionStats] = useState<SessionStats>({ avgMin: null, longestMin: null, perDay: null });
  const [sessionTrend] = useState<number[]>([]);
  const [accData] = useState<AccEntry[]>([]);

  const last30 = rawHours.slice(-30);
  const last14 = rawHours.slice(-14);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 md:p-8 pb-16"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
    >
      {/* Page header */}
      <div className="flex items-center justify-between mb-7">
        <h1
          className="text-[18px] font-semibold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Analytics
        </h1>
        <span
          className="text-[11px] tracking-[0.03em]"
          style={{ color: "var(--text-secondary)" }}
        >
          {format(new Date(), "MMM d, yyyy")}
        </span>
      </div>

      {/* Hero */}
      <section className="mb-16">
        <SectionTag>Hero</SectionTag>
        <div className="flex flex-col gap-3">
          <RollingAverageCard rawHours={rawHours} />
          <VolatilityCard last14={last14} />
        </div>
      </section>

      {/* Consistency */}
      <section className="mb-16">
        <SectionTag>Consistency</SectionTag>
        <div className="flex flex-col gap-3">
          <HeatmapCard last30={last30} />
          <ConsistencyCard last30={last30} />
        </div>
      </section>

      {/* Growth */}
      <section className="mb-16">
        <SectionTag>Growth</SectionTag>
        <MonthlyComparisonCard thisMonth={thisMonth} lastMonth={lastMonth} />
      </section>

      {/* Strategic */}
      <section className="mb-16">
        <SectionTag>Strategic</SectionTag>
        <div className="flex flex-col gap-3">
          <DriftWatchCard weeks={driftWeeks} />
          <HighValueCard breakdown={hvBreakdown} />
        </div>
      </section>

      {/* Skill */}
      <section className="mb-16">
        <SectionTag>Skill</SectionTag>
        <div className="flex flex-col gap-3">
          <SessionStatsCard stats={sessionStats} trend={sessionTrend} />
          <EstimationAccuracyCard data={accData} />
        </div>
      </section>
    </div>
  );
}
