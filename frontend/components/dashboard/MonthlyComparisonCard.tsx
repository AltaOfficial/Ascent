"use client";

export type MonthStats = { total: number; avgPerDay: number; activeDays: number } | null;

export function MonthlyComparisonCard({
  thisMonth,
  lastMonth,
}: {
  thisMonth: MonthStats;
  lastMonth: MonthStats;
}) {
  const totalHoursChangePct =
    thisMonth && lastMonth && lastMonth.total > 0
      ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100)
      : null;
  const activeDaysChange =
    thisMonth && lastMonth ? thisMonth.activeDays - lastMonth.activeDays : null;

  const panels: { label: string; data: MonthStats }[] = [
    { label: "This Month", data: thisMonth },
    { label: "Last Month", data: lastMonth },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {panels.map(({ label, data }) => (
          <div
            key={label}
            className="rounded-[10px] border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div
              className="text-[10px] tracking-[0.09em] uppercase mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {label}
            </div>
            {[
              ["Total hours", data ? `${data.total}h` : "—"],
              ["Avg per day", data ? `${data.avgPerDay}h` : "—"],
              ["Active days", data ? `${data.activeDays}` : "—"],
            ].map(([statName, statValue]) => (
              <div
                key={statName}
                className="flex justify-between py-2 border-b last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-[12px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
                  {statName}
                </span>
                <span className="text-[12px] tracking-[0.02em]" style={{ color: "var(--text-primary)" }}>
                  {statValue}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        className="rounded-[10px] border px-5 py-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex gap-6">
          {[
            {
              value: totalHoursChangePct !== null ? `${totalHoursChangePct > 0 ? "+" : ""}${totalHoursChangePct}%` : "—",
              label: "Total hours",
            },
            {
              value: activeDaysChange !== null ? `${activeDaysChange > 0 ? "+" : ""}${activeDaysChange} days` : "—",
              label: "Active days",
            },
          ].map((change) => (
            <div key={change.label} className="flex flex-col gap-1">
              <span
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {change.value}
              </span>
              <span
                className="text-[10px] tracking-[0.05em] uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {change.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
