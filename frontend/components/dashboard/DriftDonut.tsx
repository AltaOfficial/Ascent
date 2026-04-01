"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type DriftEntry = { label: string; pct: number; color: string };

export default function DriftDonut({ data = [] }: { data?: DriftEntry[] }) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-16"
        style={{ color: "var(--text-secondary)", fontSize: 12 }}
      >
        —
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div style={{ width: 64, height: 64, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="pct"
              innerRadius="68%"
              outerRadius="100%"
              strokeWidth={0}
              paddingAngle={2}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-mid)",
                borderRadius: 6,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
              }}
              formatter={(v, _, entry) => [
                `${v}%`,
                (entry as { payload: { label: string } }).payload.label,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex items-center gap-1.5 text-[10px] tracking-[0.02em]"
            style={{ color: "var(--text-secondary)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: d.color }}
            />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
