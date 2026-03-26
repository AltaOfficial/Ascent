import { format } from "date-fns";
import HoursChart from "@/components/dashboard/HoursChart";
import TaskInbox from "@/components/dashboard/TaskInbox";
import { DriftDonut, MiniLine } from "@/components/dashboard/ClientCharts";

function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[10px] border p-5 flex flex-col justify-between min-h-27.5 ${className ?? ""}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)", ...style }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] tracking-[0.08em] uppercase mb-3" style={{ color: "var(--text-secondary)" }}>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="p-4 md:p-8 pb-15">
      {/* Page header */}
      <div className="flex items-center justify-between mb-7">
        <h1
          className="text-[18px] font-semibold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Dashboard
        </h1>
        <span className="text-[11px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
          {today}
        </span>
      </div>

      {/* Hero grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">

        {/* Rank */}
        <Card style={{ justifyContent: "flex-start", gap: 0 }}>
          <CardLabel>Ascent Rank</CardLabel>
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 text-xl"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border-mid)",
                opacity: 0.7,
              }}
            >
              ◆
            </div>
            <div className="flex-1">
              <div
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                Diamond
              </div>
              <div className="text-[10px] tracking-[0.02em] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                7h+ / day · resets in 43d
              </div>
              <div
                className="h-px mt-2.5 rounded overflow-hidden"
                style={{ background: "var(--border)" }}
              >
                <div className="h-full rounded" style={{ width: "72%", background: "var(--accent)", opacity: 0.5 }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Compliance */}
        <Card>
          <CardLabel>Compliance %</CardLabel>
          <div>
            <div
              className="text-[26px] font-semibold tracking-[-0.03em] leading-none"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              92%
            </div>
            <div className="text-[11px] tracking-[0.02em] mt-1" style={{ color: "var(--text-mid)" }}>
              +4% vs prior period
            </div>
          </div>
        </Card>

        {/* Drift Allocation */}
        <Card style={{ justifyContent: "flex-start" }}>
          <CardLabel>Drift Allocation</CardLabel>
          <DriftDonut />
        </Card>

        {/* Rolling Average */}
        <Card style={{ justifyContent: "flex-start" }}>
          <div className="flex items-start justify-between mb-1">
            <CardLabel>Rolling Average</CardLabel>
            <span className="text-[10px]" style={{ color: "rgba(217,107,107,0.7)" }}>-4% vs prior</span>
          </div>
          <div className="text-[10px] tracking-[0.02em] mb-2" style={{ color: "var(--text-secondary)" }}>
            Daily focus hours
          </div>
          <div className="h-13">
            <MiniLine />
          </div>
        </Card>
      </div>

      {/* Hours chart */}
      <HoursChart />

      {/* Task inbox */}
      <TaskInbox />
    </div>
  );
}
