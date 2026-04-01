"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import HoursChart from "@/components/dashboard/HoursChart";
import TaskInbox from "@/components/dashboard/TaskInbox";
import { DriftDonut, MiniLine } from "@/components/dashboard/ClientCharts";
import { apiFetch } from "@/lib/api";

type HoursEntry = { date: string; hours: number };
type ComplianceRule = { id: string; name: string };
type ComplianceEntry = { ruleId: string; date: string; checked: boolean };

function getDateRange(range: "7d" | "30d" | "3m"): { start: Date; end: Date; days: number } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end, days };
}

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
  const [hoursData, setHoursData] = useState<HoursEntry[]>([]);
  const [compliancePct, setCompliancePct] = useState<number | null>(null);
  const [complianceDelta, setComplianceDelta] = useState<number | null>(null);

  const fetchHours = useCallback(async (range: "7d" | "30d" | "3m") => {
    try {
      const data = await apiFetch<HoursEntry[]>("/users/hours", {
        method: "POST",
        body: JSON.stringify({ range }),
      });
      setHoursData(data);
    } catch {}
  }, []);

  const fetchCompliance = useCallback(async (range: "7d" | "30d" | "3m") => {
    try {
      const { start, end, days } = getDateRange(range);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const [rules, entries] = await Promise.all([
        apiFetch<ComplianceRule[]>("/compliance/rules"),
        apiFetch<ComplianceEntry[]>(`/compliance/entries?start=${fmt(start)}&end=${fmt(end)}`),
      ]);

      if (rules.length === 0) {
        setCompliancePct(null);
        setComplianceDelta(null);
        return;
      }

      const total = rules.length * days;
      const checked = entries.filter((e) => e.checked).length;
      const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

      // Prior period for delta
      const priorEnd = new Date(start);
      priorEnd.setDate(priorEnd.getDate() - 1);
      priorEnd.setHours(23, 59, 59, 999);
      const priorStart = new Date(priorEnd);
      priorStart.setDate(priorStart.getDate() - (days - 1));
      priorStart.setHours(0, 0, 0, 0);

      const priorEntries = await apiFetch<ComplianceEntry[]>(
        `/compliance/entries?start=${fmt(priorStart)}&end=${fmt(priorEnd)}`
      );
      const priorChecked = priorEntries.filter((e) => e.checked).length;
      const priorPct = total > 0 ? Math.round((priorChecked / total) * 100) : 0;

      setCompliancePct(pct);
      setComplianceDelta(pct - priorPct);
    } catch {
      setCompliancePct(null);
      setComplianceDelta(null);
    }
  }, []);

  const handlePeriodChange = useCallback(
    (range: "7d" | "30d" | "3m") => {
      fetchHours(range);
      fetchCompliance(range);
    },
    [fetchHours, fetchCompliance]
  );

  useEffect(() => {
    fetchHours("30d");
    fetchCompliance("30d");
  }, [fetchHours, fetchCompliance]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-15" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
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
                opacity: 0.4,
              }}
            >
              ◆
            </div>
            <div className="flex-1">
              <div
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                —
              </div>
              <div className="text-[10px] tracking-[0.02em] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                no data yet
              </div>
              <div
                className="h-px mt-2.5 rounded overflow-hidden"
                style={{ background: "var(--border)" }}
              >
                <div className="h-full rounded" style={{ width: "0%", background: "var(--accent)", opacity: 0.5 }} />
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
              {compliancePct !== null ? `${compliancePct}%` : "—"}
            </div>
            <div className="text-[11px] tracking-[0.02em] mt-1" style={{ color: complianceDelta !== null && complianceDelta < 0 ? "rgba(217,107,107,0.8)" : "var(--text-mid)" }}>
              {complianceDelta !== null
                ? `${complianceDelta >= 0 ? "+" : ""}${complianceDelta}% vs prior period`
                : "no rules set"}
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
      <HoursChart data={hoursData} onPeriodChange={handlePeriodChange} />

      {/* Task inbox */}
      <TaskInbox />
    </div>
  );
}
