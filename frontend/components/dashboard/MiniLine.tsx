"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

const DATA = [3.1, 4.2, 2.8, 5.0, 4.6, 3.9, 4.3, 3.7, 4.8, 5.1, 4.0, 3.5].map((v, i) => ({
  i,
  v,
}));

export default function MiniLine() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={DATA}>
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
