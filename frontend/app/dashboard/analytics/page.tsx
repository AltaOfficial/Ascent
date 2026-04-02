"use client";

import { useState } from "react";
import { format } from "date-fns";
import { SectionTag } from "@/components/dashboard/Card";
import { RollingAverageCard } from "@/components/dashboard/RollingAverageCard";
import { VolatilityCard } from "@/components/dashboard/VolatilityCard";
import { HeatmapCard } from "@/components/dashboard/HeatmapCard";
import { ConsistencyCard } from "@/components/dashboard/ConsistencyCard";
import { MonthlyComparisonCard, type MonthStats } from "@/components/dashboard/MonthlyComparisonCard";
import { DriftWatchCard, type DriftWeek } from "@/components/dashboard/DriftWatchCard";
import { HighValueCard, type HighValueEntry } from "@/components/dashboard/HighValueCard";
import { SessionStatsCard, type SessionStats } from "@/components/dashboard/SessionStatsCard";
import { EstimationAccuracyCard, type AccuracyEntry } from "@/components/dashboard/EstimationAccuracyCard";

export default function AnalyticsPage() {
  const [rawHours] = useState<number[]>([]);
  const [thisMonth] = useState<MonthStats>(null);
  const [lastMonth] = useState<MonthStats>(null);
  const [driftWeeks] = useState<DriftWeek[]>([]);
  const [highValueBreakdown] = useState<HighValueEntry[]>([]);
  const [sessionStats] = useState<SessionStats>({ avgMin: null, longestMin: null, perDay: null });
  const [sessionTrend] = useState<number[]>([]);
  const [accuracyData] = useState<AccuracyEntry[]>([]);

  const last30 = rawHours.slice(-30);
  const last14 = rawHours.slice(-14);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 md:p-8 pb-16"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
    >
      {/* Page header */}
      <div className="flex items-center justify-between mb-7">
        <h1
          className="text-[18px] font-semibold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Analytics
        </h1>
        <span className="text-[11px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
          {format(new Date(), "MMM d, yyyy")}
        </span>
      </div>

      {/* Hero */}
      <section className="mb-16">
        <SectionTag>Hero</SectionTag>
        <div className="flex flex-col gap-3">
          <RollingAverageCard rawHours={rawHours} />
          <VolatilityCard last14={last14} />
        </div>
      </section>

      {/* Consistency */}
      <section className="mb-16">
        <SectionTag>Consistency</SectionTag>
        <div className="flex flex-col gap-3">
          <HeatmapCard last30={last30} />
          <ConsistencyCard last30={last30} />
        </div>
      </section>

      {/* Growth */}
      <section className="mb-16">
        <SectionTag>Growth</SectionTag>
        <MonthlyComparisonCard thisMonth={thisMonth} lastMonth={lastMonth} />
      </section>

      {/* Strategic */}
      <section className="mb-16">
        <SectionTag>Strategic</SectionTag>
        <div className="flex flex-col gap-3">
          <DriftWatchCard weeks={driftWeeks} />
          <HighValueCard breakdown={highValueBreakdown} />
        </div>
      </section>

      {/* Skill */}
      <section className="mb-16">
        <SectionTag>Skill</SectionTag>
        <div className="flex flex-col gap-3">
          <SessionStatsCard stats={sessionStats} trend={sessionTrend} />
          <EstimationAccuracyCard data={accuracyData} />
        </div>
      </section>
    </div>
  );
}
