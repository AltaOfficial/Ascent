"use client";

import { Card, CardLabel } from "@/components/dashboard/Card";

export function ConsistencyCard({ last30 }: { last30: number[] }) {
  const DAILY_THRESHOLD_HOURS = 3;
  const hasData = last30.length > 0;
  const daysAboveThreshold = last30.filter((hours) => hours >= DAILY_THRESHOLD_HOURS).length;
  const consistencyPct = hasData ? Math.round((daysAboveThreshold / last30.length) * 100) : 0;

  const consistencyNote = !hasData
    ? "No data yet."
    : consistencyPct >= 70
    ? "Solid floor. Focus on depth now."
    : consistencyPct >= 50
    ? "Room to improve consistency."
    : "Showing up is the bottleneck right now.";

  return (
    <Card className="md:p-6">
      <CardLabel>Consistency Rate — threshold: 3h/day</CardLabel>
      <div className="flex items-end gap-5">
        <div className="flex flex-col gap-1">
          <span
            className="text-[28px] font-semibold tracking-[-0.03em] leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {hasData ? `${consistencyPct}%` : "—"}
          </span>
          <span
            className="text-[10px] tracking-[0.06em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Days hit threshold (last 30)
          </span>
        </div>
        <div className="flex-1 pb-1.5">
          <div className="h-px rounded overflow-hidden mb-1.5" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded"
              style={{ width: `${consistencyPct}%`, background: "var(--accent)", opacity: 0.5 }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>0%</span>
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>100%</span>
          </div>
        </div>
      </div>
      <div className="mt-4 text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
        {daysAboveThreshold} of 30 days at or above {DAILY_THRESHOLD_HOURS}h. {consistencyNote}
      </div>
    </Card>
  );
}
