"use client";

import { Card, CardLabel } from "@/components/dashboard/Card";

export type HighValueEntry = { label: string; pct: number };

export function HighValueCard({ breakdown }: { breakdown: HighValueEntry[] }) {
  const highLeveragePct = breakdown
    .filter((entry) => entry.label !== "Other")
    .reduce((sum, entry) => sum + entry.pct, 0);

  return (
    <Card className="md:p-6">
      <CardLabel>High-Value Focus — last 30 days</CardLabel>
      <div className="flex items-center gap-7">
        <div>
          <div
            className="text-[40px] font-semibold tracking-[-0.04em] leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {breakdown.length > 0 ? `${highLeveragePct}%` : "—"}
          </div>
          <div className="text-[11px] tracking-[0.02em] mt-1.5" style={{ color: "var(--text-secondary)" }}>
            of hours were
            <br />
            high-leverage
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {breakdown.map((entry) => (
            <div key={entry.label} className="flex items-center gap-2.5">
              <span
                className="text-[11px] tracking-[0.02em] w-[90px] shrink-0"
                style={{ color: "var(--text-secondary)" }}
              >
                {entry.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }}>
                <div
                  className="h-full"
                  style={{ width: `${entry.pct}%`, background: "var(--accent)", opacity: 0.45 }}
                />
              </div>
              <span className="text-[11px] w-8 text-right" style={{ color: "var(--text-mid)" }}>
                {entry.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
