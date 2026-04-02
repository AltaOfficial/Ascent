"use client";

import { subDays, format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardLabel } from "@/components/dashboard/Card";

const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-mid)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-primary)",
};

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export type SessionStats = { avgMin: number | null; longestMin: number | null; perDay: number | null };

export function SessionStatsCard({ stats, trend }: { stats: SessionStats; trend: number[] }) {
  const today = new Date();
  const trendChartData = trend.map((minutes, index) => ({
    date: format(subDays(today, trend.length - 1 - index), "MMM d"),
    minutes,
  }));

  return (
    <Card className="md:p-6">
      <CardLabel>Session Length Stats — last 30 days</CardLabel>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { value: formatMinutes(stats.avgMin), label: "Avg session length" },
          { value: formatMinutes(stats.longestMin), label: "Longest session" },
          { value: stats.perDay !== null ? `${stats.perDay}` : "—", label: "Sessions per day" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border p-4"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
          >
            <div
              className="text-[22px] font-semibold tracking-[-0.03em] mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {stat.value}
            </div>
            <div className="text-[10px] tracking-[0.06em] uppercase" style={{ color: "var(--text-secondary)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendChartData}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}m`}
              width={28}
              domain={[20, 70]}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
              formatter={(val) => [`${val} min`, "Avg session"]}
            />
            <Line
              type="monotone"
              dataKey="minutes"
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
