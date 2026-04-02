"use client";

import { useMemo } from "react";
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

function computeRollingAverage(values: number[], windowSize = 7): (number | null)[] {
  return values.map((_, index) => {
    if (index < windowSize - 1) return null;
    const window = values.slice(index - windowSize + 1, index + 1);
    return parseFloat((window.reduce((sum, val) => sum + val, 0) / windowSize).toFixed(2));
  });
}

export function RollingAverageCard({ rawHours }: { rawHours: number[] }) {
  const today = new Date();

  const chartData = useMemo(() => {
    const rollingValues = computeRollingAverage(rawHours);
    return rawHours.map((hours, index) => ({
      date: format(subDays(today, rawHours.length - 1 - index), "MMM d"),
      raw: hours,
      avg: rollingValues[index],
    }));
  }, [rawHours]);

  const rollingValues = computeRollingAverage(rawHours).filter((val) => val !== null) as number[];
  const currentAvg = rollingValues.length >= 1 ? rollingValues[rollingValues.length - 1] : null;
  const previousAvg = rollingValues.length >= 8 ? rollingValues[rollingValues.length - 8] : null;
  const avgDiff =
    currentAvg !== null && previousAvg !== null
      ? parseFloat((currentAvg - previousAvg).toFixed(1))
      : null;

  if (rawHours.length === 0) {
    return (
      <Card className="md:p-6">
        <CardLabel>7-Day Rolling Average</CardLabel>
        <div className="py-8 text-[12px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          No data available yet.
        </div>
      </Card>
    );
  }

  return (
    <Card className="md:p-6">
      <CardLabel>7-Day Rolling Average</CardLabel>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval={7}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}h`}
              width={28}
              domain={[0, 7]}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
              formatter={(val, name) => [`${val}h`, name === "raw" ? "Raw" : "7-day avg"]}
            />
            <Line type="monotone" dataKey="raw" stroke="rgba(200,200,210,0.12)" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="avg" stroke="rgba(200,200,210,0.75)" strokeWidth={1.5} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-8 mt-5 pt-4.5 border-t" style={{ borderColor: "var(--border)" }}>
        {[
          { label: "Current 7-day avg", value: currentAvg !== null ? `${currentAvg}h` : "—" },
          { label: "Previous 7-day avg", value: previousAvg !== null ? `${previousAvg}h` : "—" },
          { label: "Difference", value: avgDiff !== null ? `${avgDiff > 0 ? "+" : ""}${avgDiff}h` : "—" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <span className="text-[10px] tracking-[0.05em] uppercase" style={{ color: "var(--text-secondary)" }}>
              {stat.label}
            </span>
            <span
              className="text-base font-semibold tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
