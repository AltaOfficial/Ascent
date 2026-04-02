"use client";

import { Card, CardLabel } from "@/components/dashboard/Card";

export type AccuracyEntry = { month: string; err: number };

export function EstimationAccuracyCard({ data }: { data: AccuracyEntry[] }) {
  const MAX_ERROR_PCT = 35;
  const currentError = data.length > 0 ? data[data.length - 1].err : null;
  const improvement = data.length >= 2 ? data[0].err - data[data.length - 1].err : null;

  return (
    <Card className="md:p-6">
      <CardLabel>Estimation Accuracy — avg % error over time</CardLabel>
      <div className="flex flex-col">
        {data.length === 0 ? (
          <div
            className="py-6 text-[12px] tracking-[0.02em]"
            style={{ color: "var(--text-secondary)", opacity: 0.5 }}
          >
            No estimation data yet.
          </div>
        ) : (
          data.map((entry) => (
            <div
              key={entry.month}
              className="flex items-center gap-4 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-[12px] tracking-[0.02em] w-18 shrink-0"
                style={{ color: "var(--text-secondary)" }}
              >
                {entry.month}
              </span>
              <div className="flex-1 h-px relative" style={{ background: "var(--border)" }}>
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${Math.round((entry.err / MAX_ERROR_PCT) * 100)}%`,
                    background: "var(--accent)",
                    opacity: 0.5,
                  }}
                />
              </div>
              <span
                className="text-[12px] tracking-[0.02em] w-12 text-right shrink-0"
                style={{ color: "var(--text-primary)" }}
              >
                {entry.err}% err
              </span>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-6 mt-4.5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        {[
          { value: currentError !== null ? `${currentError}%` : "—", label: "Current avg error" },
          { value: improvement !== null ? `-${improvement}%` : "—", label: "Improvement (3 months)" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <span
              className="text-[20px] font-semibold tracking-[-0.02em] leading-none"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {stat.value}
            </span>
            <span
              className="text-[10px] tracking-[0.06em] uppercase mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
