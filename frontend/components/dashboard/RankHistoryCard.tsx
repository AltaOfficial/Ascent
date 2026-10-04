"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { Card, CardLabel } from "@/components/dashboard/Card";
import { RANKS } from "@/lib/constants";
import type { RankResult } from "@/components/dashboard/RankCard";

export type RankSnapshot = { date: string; score: number; rank: string };

const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-mid)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-primary)",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function RankHistoryCard({
  rank,
  history,
}: {
  rank: RankResult | null;
  history: RankSnapshot[];
}) {
  const tier = RANKS.find((r) => r.name === rank?.rank) ?? RANKS[0];
  const chartData = history.map((snapshot) => ({
    ...snapshot,
    label: shortDate(snapshot.date),
    pct: Math.round(snapshot.score * 1000) / 10,
  }));
  const maxPct = Math.max(40, ...chartData.map((d) => d.pct));
  const visibleTiers = RANKS.filter((r) => r.min > 0 && r.min * 100 <= maxPct + 10);

  const stats = [
    { label: "Rank score", value: rank ? `${Math.round(rank.score * 100)}` : "—" },
    {
      label: "Cycle",
      value: rank?.cycle ? `Day ${rank.cycle.day} / 90` : "Not started",
    },
    {
      label: "Consistency (30d)",
      value: rank?.consistency ? `${Math.round(rank.consistency.rate * 100)}%` : "—",
      warn: rank?.consistency?.gateApplied,
    },
    {
      label: "Apex gate (14d)",
      value: rank?.apex
        ? `${rank.apex.avgHours}h · ${Math.round(rank.apex.avgCompliance * 100)}%`
        : "—",
    },
  ];

  return (
    <Card className="md:p-6">
      <CardLabel>Rank — current cycle</CardLabel>
      <div className="flex items-center gap-3.5 mb-5">
        <div
          className="w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 text-xl"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-mid)", color: tier.color }}
        >
          {tier.icon}
        </div>
        <div>
          <div
            className="text-[18px] font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {tier.name}
          </div>
          <div className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
            {rank?.nextRank
              ? `${Math.round((rank.progressToNext ?? 0) * 100)}% of the way to ${rank.nextRank}`
              : rank
                ? "Top rank"
                : "No data yet"}
            {rank?.consistency?.gateApplied
              ? " · score halved: fewer than 70% of the last 30 days had 2h+"
              : ""}
          </div>
        </div>
      </div>

      <div style={{ height: 180 }}>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                width={28}
                domain={[0, Math.min(100, Math.ceil((maxPct + 5) / 10) * 10)]}
              />
              {visibleTiers.map((r) => (
                <ReferenceLine
                  key={r.name}
                  y={r.min * 100}
                  stroke={r.color}
                  strokeDasharray="2 4"
                  label={{
                    value: r.name,
                    position: "insideTopRight",
                    fontSize: 9,
                    fill: "#6b6b7a",
                  }}
                />
              ))}
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
                formatter={(value, _name, item) => [
                  `${value} (${(item.payload as { rank: string }).rank})`,
                  "Score",
                ]}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke="rgba(216,216,232,0.8)"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="h-full flex items-center justify-center text-[12px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Rank history appears after your first scored day.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4.5 border-t" style={{ borderColor: "var(--border)" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <span className="text-[10px] tracking-[0.05em] uppercase" style={{ color: "var(--text-secondary)" }}>
              {stat.label}
            </span>
            <span
              className="text-base font-semibold tracking-[-0.02em]"
              style={{
                fontFamily: "var(--font-display)",
                color: stat.warn ? "rgba(217,107,107,0.85)" : "var(--text-primary)",
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
