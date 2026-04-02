"use client";

import {
  BarChart, Bar, XAxis, YAxis,
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

const DRIFT_CATEGORY_META = [
  { label: "School", color: "rgba(91,141,217,0.75)" },
  { label: "Revenue", color: "rgba(107,187,138,0.75)" },
  { label: "Skills", color: "rgba(196,127,212,0.75)" },
  { label: "Maintenance", color: "rgba(200,200,210,0.35)" },
  { label: "Personal", color: "rgba(217,167,91,0.65)" },
];

export type DriftWeek = { week: string } & Record<string, number>;

export function DriftWatchCard({ weeks }: { weeks: DriftWeek[] }) {
  return (
    <Card className="md:p-6">
      <CardLabel>Drift Watch — Weekly Time Allocation</CardLabel>
      <div className="flex flex-wrap gap-3 mb-4">
        {DRIFT_CATEGORY_META.map((category) => (
          <div key={category.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-xs" style={{ background: category.color }} />
            <span className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
              {category.label}
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
              tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b6b7a", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}h`}
              width={28}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-secondary)", marginBottom: 2 }}
              formatter={(val, name) => [`${val}h`, name]}
            />
            {DRIFT_CATEGORY_META.map((category) => (
              <Bar
                key={category.label}
                dataKey={category.label}
                stackId="stack"
                fill={category.color}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
