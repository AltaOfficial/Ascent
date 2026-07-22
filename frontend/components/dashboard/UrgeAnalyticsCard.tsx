"use client";

import { useEffect, useMemo, useState } from "react";
import { subDays, format, parseISO, differenceInCalendarDays } from "date-fns";
import {
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardLabel } from "@/components/dashboard/Card";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

interface Rule {
  id: string;
  name: string;
}

interface UrgeLog {
  id: string;
  ruleId: string;
  occurredAt: string;
  intensity: number;
}

interface ComplianceEntry {
  ruleId: string;
  date: string;
  checked: boolean;
}

type Period = "7d" | "30d" | "3m" | "all";

const TABS: { key: Period; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "3m", label: "3 Months" },
  { key: "30d", label: "30 Days" },
  { key: "7d", label: "7 Days" },
];

const ROLLING_WINDOW = 7;
// How far back to look when checking for a compliance streak — long enough
// to cover any realistic streak without fetching a user's entire history.
const STREAK_LOOKBACK_DAYS = 400;

const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-mid)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-primary)",
};

const selectStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border-mid)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
};

function computeRollingAverage(values: number[], windowSize = ROLLING_WINDOW): (number | null)[] {
  return values.map((_, index) => {
    if (index < windowSize - 1) return null;
    const window = values.slice(index - windowSize + 1, index + 1);
    return parseFloat((window.reduce((sum, val) => sum + val, 0) / windowSize).toFixed(2));
  });
}

function dayCountForPeriod(period: Period, ruleId: string, logs: UrgeLog[]): number {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "3m") return 90;
  const ruleLogs = logs.filter((log) => log.ruleId === ruleId);
  if (ruleLogs.length === 0) return 1;
  const earliest = ruleLogs.reduce(
    (min, log) => (log.occurredAt < min ? log.occurredAt : min),
    ruleLogs[0].occurredAt,
  );
  return differenceInCalendarDays(new Date(), parseISO(earliest)) + 1;
}

function buildDailySeries(period: Period, ruleId: string, logs: UrgeLog[]) {
  const ruleLogs = logs.filter((log) => log.ruleId === ruleId);
  const dayCount = dayCountForPeriod(period, ruleId, logs);

  const countByDate: Record<string, number> = {};
  const intensitySumByDate: Record<string, number> = {};
  const intensityCountByDate: Record<string, number> = {};
  for (const log of ruleLogs) {
    const dateKey = format(parseISO(log.occurredAt), "yyyy-MM-dd");
    countByDate[dateKey] = (countByDate[dateKey] ?? 0) + 1;
    intensitySumByDate[dateKey] = (intensitySumByDate[dateKey] ?? 0) + log.intensity;
    intensityCountByDate[dateKey] = (intensityCountByDate[dateKey] ?? 0) + 1;
  }

  // Extend `ROLLING_WINDOW - 1` days before the visible window so the rolling
  // average line has real context from day one of the visible period, rather
  // than starting as a run of nulls.
  const lookback = ROLLING_WINDOW - 1;
  const totalDays = dayCount + lookback;
  const today = new Date();

  const extended = Array.from({ length: totalDays }, (_, i) => {
    const date = subDays(today, totalDays - 1 - i);
    const dateKey = format(date, "yyyy-MM-dd");
    const count = countByDate[dateKey] ?? 0;
    const avgIntensity = intensityCountByDate[dateKey]
      ? parseFloat((intensitySumByDate[dateKey] / intensityCountByDate[dateKey]).toFixed(1))
      : null;
    return { date: dateKey, label: format(date, "MMM d"), count, avgIntensity };
  });

  const rollingCounts = computeRollingAverage(extended.map((d) => d.count));

  return extended.slice(lookback).map((entry, i) => ({
    ...entry,
    rollingAvg: rollingCounts[i + lookback],
  }));
}

function computeStreak(entries: ComplianceEntry[], ruleId: string): number {
  const map = new Map(
    entries.filter((e) => e.ruleId === ruleId).map((e) => [e.date, e.checked]),
  );
  const todayKey = format(new Date(), "yyyy-MM-dd");
  let streak = 0;
  let date = new Date();
  while (true) {
    const key = format(date, "yyyy-MM-dd");
    const entry = map.get(key);
    if (entry === undefined) {
      // An unmarked *today* doesn't break the streak — you just haven't
      // checked in yet. An unmarked day further back means the streak ended.
      if (key === todayKey) {
        date = subDays(date, 1);
        continue;
      }
      break;
    }
    if (!entry) break;
    streak++;
    date = subDays(date, 1);
  }
  return streak;
}

export default function UrgeAnalyticsCard() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [urgeLogs, setUrgeLogs] = useState<UrgeLog[]>([]);
  const [complianceEntries, setComplianceEntries] = useState<ComplianceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleId, setRuleId] = useState("");
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => {
    async function loadData() {
      const today = new Date();
      const start = format(subDays(today, STREAK_LOOKBACK_DAYS), "yyyy-MM-dd");
      const end = format(today, "yyyy-MM-dd");
      try {
        const [fetchedRules, fetchedLogs, fetchedEntries] = await Promise.all([
          apiFetch<Rule[]>("/compliance/rules"),
          apiFetch<UrgeLog[]>("/compliance/urge-logs"),
          apiFetch<ComplianceEntry[]>(
            `/compliance/entries?start=${start}&end=${end}`,
          ),
        ]);
        setRules(fetchedRules);
        setUrgeLogs(fetchedLogs);
        setComplianceEntries(fetchedEntries);
      } catch {
        // not logged in or network error — show empty state
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!ruleId && rules.length > 0) {
      setRuleId(rules[0].id);
    }
  }, [rules, ruleId]);

  const chartData = useMemo(
    () => buildDailySeries(period, ruleId, urgeLogs),
    [period, ruleId, urgeLogs],
  );
  // A rolling average of all-zero days isn't a trend — it's the absence of
  // any data. Only draw the line once the rule has at least one logged urge.
  const hasAnyLogs = useMemo(
    () => urgeLogs.some((log) => log.ruleId === ruleId),
    [urgeLogs, ruleId],
  );
  const streak = useMemo(
    () => computeStreak(complianceEntries, ruleId),
    [complianceEntries, ruleId],
  );
  const tickInterval = period === "3m" || period === "all" ? 11 : period === "30d" ? 4 : 0;

  if (loading) {
    return (
      <Card className="md:p-6">
        <CardLabel>Urge Log</CardLabel>
        <div className="py-8 text-[12px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </div>
      </Card>
    );
  }

  if (rules.length === 0) {
    return (
      <Card className="md:p-6">
        <CardLabel>Urge Log</CardLabel>
        <div className="py-8 text-[12px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          Add a compliance rule to start tracking urges.
        </div>
      </Card>
    );
  }

  return (
    <Card className="md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <CardLabel>Urge Log</CardLabel>
        <select
          value={ruleId}
          onChange={(e) => setRuleId(e.target.value)}
          className="text-[11px] rounded-[5px] px-2 py-1.5 outline-none"
          style={selectStyle}
        >
          {rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] tracking-[0.05em] uppercase" style={{ color: "var(--text-secondary)" }}>
            Current streak
          </span>
          <span
            className="text-xl font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {streak} {streak === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="flex border rounded-md overflow-hidden" style={{ borderColor: "var(--border)" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={cn(
                "px-3 py-1.5 text-[10px] tracking-[0.04em] transition-colors font-mono",
                period === tab.key ? "text-text-primary" : "text-text-secondary hover:text-text-mid",
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

      <div
        className="text-[10px] tracking-[0.05em] uppercase mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {hasAnyLogs ? "Urges per day · 7-day average" : "Urges per day"}
      </div>
      <div className="h-45 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#3a3a42", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              width={24}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
              formatter={(value, name) => [
                value,
                name === "count" ? "Urges" : "7-day avg",
              ]}
            />
            <Bar dataKey="count" fill="rgba(232,232,232,0.82)" radius={[3, 3, 0, 0]} />
            {hasAnyLogs && (
              <Line
                type="monotone"
                dataKey="rollingAvg"
                stroke="rgba(200,200,210,0.9)"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div
        className="text-[10px] tracking-[0.05em] uppercase mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        Average intensity
      </div>
      <div className="h-30">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              width={24}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
              formatter={(value) => [value ?? "—", "Avg intensity"]}
            />
            <Line
              type="monotone"
              dataKey="avgIntensity"
              stroke="rgba(200,200,210,0.75)"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
