"use client";

import { Card, CardLabel } from "@/components/dashboard/Card";

export function VolatilityCard({ last14 }: { last14: number[] }) {
  const hasData = last14.length >= 2;
  const mean = hasData ? last14.reduce((sum, val) => sum + val, 0) / last14.length : 0;
  const variance = hasData
    ? last14.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / last14.length
    : 0;
  const stddev = parseFloat(Math.sqrt(variance).toFixed(2));
  const volatilityPct = hasData ? Math.min(100, (stddev / 3) * 100) : 0;

  const volatilityLabel = !hasData
    ? "No data yet."
    : stddev < 0.8
    ? "Highly stable. Your output is consistent."
    : stddev < 1.5
    ? "Moderate variance. Minor fluctuation — acceptable."
    : stddev < 2.2
    ? "Elevated volatility. Inconsistency is showing."
    : "High volatility. Output is unpredictable right now.";

  return (
    <Card className="md:p-6">
      <CardLabel>Stability Indicator — Volatility Score (14 days)</CardLabel>
      <div className="flex gap-10 items-start">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-semibold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {hasData ? stddev : "—"}
            </span>
            <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              σ hrs
            </span>
          </div>
          <div
            className="text-[11px] mt-2 tracking-[0.02em] max-w-[180px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {volatilityLabel}
          </div>
        </div>
        <div className="flex-1 pt-2">
          <div className="h-px rounded overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded"
              style={{ width: `${volatilityPct}%`, background: "var(--accent)", opacity: 0.45 }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            {["Stable (0)", "Moderate (1.5)", "Volatile (3+)"].map((rangeLabel) => (
              <span
                key={rangeLabel}
                className="text-[10px] tracking-[0.04em]"
                style={{ color: "var(--text-secondary)" }}
              >
                {rangeLabel}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
