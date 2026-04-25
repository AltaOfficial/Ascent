"use client";

import { subDays, format } from "date-fns";
import { Card, CardLabel } from "@/components/dashboard/Card";

const HEATMAP_COLORS = [
  "var(--surface-2)",
  "rgba(200,200,210,0.14)",
  "rgba(200,200,210,0.32)",
  "rgba(200,200,210,0.58)",
  "rgba(200,200,210,0.82)",
];

function getHeatLevel(hours: number): number {
  if (hours === 0) return 0;
  if (hours < 2) return 1;
  if (hours < 3) return 2;
  if (hours < 5) return 3;
  return 4;
}

export function HeatmapCard({ last90 }: { last90: number[] }) {
  const today = new Date();
  const startDate = subDays(today, 89);

  return (
    <Card className="md:p-6">
      <CardLabel>90-Day Heatmap</CardLabel>
      <div className="flex flex-wrap gap-1">
        {last90.map((hours, index) => (
          <div
            key={index}
            title={`${format(subDays(today, 89 - index), "MMM d")}: ${hours}h`}
            className="w-4 h-4 rounded-[2px] border"
            style={{
              background: HEATMAP_COLORS[getHeatLevel(hours)],
              borderColor: "var(--border)",
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[10px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
          {format(startDate, "MMM d")} – {format(today, "MMM d")}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] mr-0.5" style={{ color: "var(--text-secondary)" }}>0h</span>
          {HEATMAP_COLORS.map((color, index) => (
            <div
              key={index}
              className="w-2.5 h-2.5 rounded-[2px] border"
              style={{ background: color, borderColor: "var(--border)" }}
            />
          ))}
          <span className="text-[10px] ml-0.5" style={{ color: "var(--text-secondary)" }}>5h+</span>
        </div>
      </div>
    </Card>
  );
}
