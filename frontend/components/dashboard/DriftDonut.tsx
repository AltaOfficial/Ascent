"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const DATA = [
  { label: "School",      pct: 28, color: "rgba(91,141,217,0.75)" },
  { label: "Programming", pct: 34, color: "rgba(107,187,138,0.75)" },
  { label: "Leet Code",   pct: 20, color: "rgba(200,200,210,0.4)" },
  { label: "ReachAI",     pct: 18, color: "rgba(217,167,91,0.7)" },
];

export default function DriftDonut() {
  return (
    <div className="flex items-center gap-4">
      <div style={{ width: 64, height: 64, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={DATA}
              dataKey="pct"
              innerRadius="68%"
              outerRadius="100%"
              strokeWidth={0}
              paddingAngle={2}
            >
              {DATA.map((d, i) => (
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
              formatter={(v, _, entry) => [`${v}%`, (entry as { payload: { label: string } }).payload.label]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-1.5">
        {DATA.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 text-[10px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.color }} />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
