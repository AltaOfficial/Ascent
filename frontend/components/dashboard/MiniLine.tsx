"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function MiniLine({ data = [] }: { data?: number[] }) {
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="rgba(200,200,210,0.55)"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
