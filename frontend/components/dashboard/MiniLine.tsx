"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

type DataPoint = { index: number; value: number };

export default function MiniLine({ data = [] }: { data?: number[] }) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-[11px] tracking-[0.04em]"
        style={{ color: "var(--text-secondary)" }}
      >
        No data available
      </div>
    );
  }

  const chartData: DataPoint[] = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="rgba(200,200,210,0.55)"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
