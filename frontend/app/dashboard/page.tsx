"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subDays, startOfDay, endOfDay, startOfWeek, addDays } from "date-fns";
import HoursChart from "@/components/dashboard/HoursChart";
import TaskInbox from "@/components/dashboard/TaskInbox";
import { DriftDonut, MiniLine } from "@/components/dashboard/ClientCharts";
import { Card, CardLabel } from "@/components/dashboard/Card";
import { apiFetch } from "@/lib/api";
import { RANKS } from "@/lib/constants";

type HoursEntry = { date: string; hours: number };
type ComplianceRule = { id: string; name: string };
type ComplianceEntry = { ruleId: string; date: string; checked: boolean };

type DateRange = "7d" | "30d" | "3m";

function buildDateRange(range: DateRange): { start: Date; end: Date; days: number } {
  const end = endOfDay(new Date());
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = startOfDay(subDays(new Date(), days - 1));
  return { start, end, days };
}

function formatDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const UNRANKED = RANKS[0];

export default function DashboardPage() {
  const todayLabel = format(new Date(), "EEEE, MMMM d, yyyy");
  const [hoursData, setHoursData] = useState<HoursEntry[]>([]);
  const [compliancePct, setCompliancePct] = useState<number | null>(null);
  const [complianceDelta, setComplianceDelta] = useState<number | null>(null);

  const fetchHours = useCallback(async (range: DateRange) => {
    try {
      const data = await apiFetch<HoursEntry[]>("/users/hours", {
        method: "POST",
        body: JSON.stringify({ range }),
      });
      setHoursData(data);
    } catch {}
  }, []);

  const fetchCompliance = useCallback(async (range: DateRange) => {
    try {
      const rules = await apiFetch<ComplianceRule[]>("/compliance/rules");

      if (rules.length === 0) {
        setCompliancePct(null);
        setComplianceDelta(null);
        return;
      }

      let currentPct: number;
      let priorPct: number;

      if (range === "7d") {
        // Match the compliance page: calendar week (Mon–today), denominator = days elapsed
        const today = new Date();
        const monday = startOfWeek(today, { weekStartsOn: 1 });
        const dayOfWeek = today.getDay();
        const daysElapsed = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 1;
        const weekStart = formatDateParam(monday);
        const weekEnd = formatDateParam(addDays(monday, 6));

        const entries = await apiFetch<ComplianceEntry[]>(
          `/compliance/entries?start=${weekStart}&end=${weekEnd}`
        );
        const activeDates = Array.from({ length: daysElapsed }, (_, i) =>
          formatDateParam(addDays(monday, i))
        );
        const totalPossible = rules.length * daysElapsed;
        const checkedCount = entries.filter((e) => e.checked && activeDates.includes(e.date)).length;
        currentPct = totalPossible > 0 ? Math.round((checkedCount / totalPossible) * 100) : 0;

        // Prior week: same number of elapsed days
        const priorMonday = subDays(monday, 7);
        const priorWeekStart = formatDateParam(priorMonday);
        const priorWeekEnd = formatDateParam(addDays(priorMonday, 6));
        const priorActiveDates = Array.from({ length: daysElapsed }, (_, i) =>
          formatDateParam(addDays(priorMonday, i))
        );
        const priorEntries = await apiFetch<ComplianceEntry[]>(
          `/compliance/entries?start=${priorWeekStart}&end=${priorWeekEnd}`
        );
        const priorChecked = priorEntries.filter((e) => e.checked && priorActiveDates.includes(e.date)).length;
        priorPct = totalPossible > 0 ? Math.round((priorChecked / totalPossible) * 100) : 0;
      } else {
        const { start, end, days } = buildDateRange(range);
        const totalPossible = rules.length * days;

        const entries = await apiFetch<ComplianceEntry[]>(
          `/compliance/entries?start=${formatDateParam(start)}&end=${formatDateParam(end)}`
        );
        const checkedCount = entries.filter((e) => e.checked).length;
        currentPct = totalPossible > 0 ? Math.round((checkedCount / totalPossible) * 100) : 0;

        const priorEnd = endOfDay(subDays(start, 1));
        const priorStart = startOfDay(subDays(priorEnd, days - 1));
        const priorEntries = await apiFetch<ComplianceEntry[]>(
          `/compliance/entries?start=${formatDateParam(priorStart)}&end=${formatDateParam(priorEnd)}`
        );
        const priorChecked = priorEntries.filter((e) => e.checked).length;
        priorPct = totalPossible > 0 ? Math.round((priorChecked / totalPossible) * 100) : 0;
      }

      setCompliancePct(currentPct);
      setComplianceDelta(currentPct - priorPct);
    } catch {
      setCompliancePct(null);
      setComplianceDelta(null);
    }
  }, []);

  const handlePeriodChange = useCallback(
    (range: DateRange) => {
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
          {todayLabel}
        </span>
      </div>

      {/* Hero grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">

        {/* Rank — defaults to lowest rank when no data */}
        <Card style={{ justifyContent: "flex-start", gap: 0, minHeight: undefined }}>
          <CardLabel>Ascent Rank</CardLabel>
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 text-xl"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border-mid)",
                color: UNRANKED.color,
                opacity: 0.5,
              }}
            >
              {UNRANKED.icon}
            </div>
            <div className="flex-1">
              <div
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {UNRANKED.name}
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
        <Card style={{ minHeight: undefined }}>
          <CardLabel>Compliance %</CardLabel>
          <div>
            <div
              className="text-[26px] font-semibold tracking-[-0.03em] leading-none"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {compliancePct !== null ? `${compliancePct}%` : "—"}
            </div>
            <div
              className="text-[11px] tracking-[0.02em] mt-1"
              style={{ color: complianceDelta !== null && complianceDelta < 0 ? "rgba(217,107,107,0.8)" : "var(--text-mid)" }}
            >
              {complianceDelta !== null
                ? `${complianceDelta >= 0 ? "+" : ""}${complianceDelta}% vs prior period`
                : "no rules set"}
            </div>
          </div>
        </Card>

        {/* Drift Allocation */}
        <Card style={{ justifyContent: "flex-start", minHeight: undefined }}>
          <CardLabel>Drift Allocation</CardLabel>
          <DriftDonut />
        </Card>

        {/* Rolling Average */}
        <Card style={{ justifyContent: "flex-start", minHeight: undefined }}>
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
