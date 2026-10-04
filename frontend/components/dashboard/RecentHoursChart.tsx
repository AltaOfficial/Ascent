"use client";

import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, Cell } from "recharts";

export type DayHours = { date: string; hours: number };

const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-mid)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-primary)",
};

function label(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[month - 1]} ${day}`;
}

/** Daily bars for the last two weeks; today is drawn brighter. */
export default function RecentHoursChart({ data }: { data: DayHours[] }) {
  const chartData = data.map((day) => ({ ...day, label: label(day.date) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} barCategoryGap={2}>
        <XAxis dataKey="label" hide />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
          formatter={(value) => [`${value}h`, "Focus"]}
        />
        <Bar dataKey="hours" radius={[2, 2, 0, 0]} minPointSize={1}>
          {chartData.map((day, index) => (
            <Cell
              key={day.date}
              fill={
                index === chartData.length - 1
                  ? "rgba(216,216,232,0.85)"
                  : "rgba(200,200,210,0.38)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
