"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { SectionTag } from "@/components/dashboard/Card";
import { RollingAverageCard } from "@/components/dashboard/RollingAverageCard";
import { VolatilityCard } from "@/components/dashboard/VolatilityCard";
import { HeatmapCard } from "@/components/dashboard/HeatmapCard";
import { ConsistencyCard } from "@/components/dashboard/ConsistencyCard";
import { MonthlyComparisonCard, type MonthStats } from "@/components/dashboard/MonthlyComparisonCard";
import { DriftWatchCard, type DriftSeries, type DriftWeek } from "@/components/dashboard/DriftWatchCard";
import { HighValueCard, type HighValueEntry } from "@/components/dashboard/HighValueCard";
import { SessionStatsCard, type SessionStats } from "@/components/dashboard/SessionStatsCard";
import { EstimationAccuracyCard, type AccuracyEntry } from "@/components/dashboard/EstimationAccuracyCard";
import UrgeAnalyticsCard from "@/components/dashboard/UrgeAnalyticsCard";
import { RankHistoryCard, type RankSnapshot } from "@/components/dashboard/RankHistoryCard";
import type { RankResult } from "@/components/dashboard/RankCard";
import { apiFetch } from "@/lib/api";

type AnalyticsSummary = {
  dailyHours: { date: string; hours: number }[];
  thisMonth: MonthStats;
  lastMonth: MonthStats;
  drift: { series: DriftSeries[]; weeks: DriftWeek[] };
  highValue: { pct: number | null; breakdown: HighValueEntry[] };
  sessionStats: SessionStats;
  sessionTrend: number[];
  estimationAccuracy: AccuracyEntry[];
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [rank, setRank] = useState<RankResult | null>(null);
  const [rankHistory, setRankHistory] = useState<RankSnapshot[]>([]);

  useEffect(() => {
    apiFetch<AnalyticsSummary>("/analytics/summary").then(setSummary).catch(() => {});
    apiFetch<RankResult>("/ranking/me").then(setRank).catch(() => {});
    apiFetch<RankSnapshot[]>("/ranking/history").then(setRankHistory).catch(() => {});
  }, []);

  const rawHours = summary?.dailyHours.map((day) => day.hours) ?? [];
  const last90 = rawHours.slice(-90);
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

      {/* Rank */}
      <section className="mb-16">
        <SectionTag>Rank</SectionTag>
        <RankHistoryCard rank={rank} history={rankHistory} />
      </section>

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
          <HeatmapCard last90={last90} />
          <ConsistencyCard last30={last30} />
          <UrgeAnalyticsCard />
        </div>
      </section>

      {/* Growth */}
      <section className="mb-16">
        <SectionTag>Growth</SectionTag>
        <MonthlyComparisonCard
          thisMonth={summary?.thisMonth ?? null}
          lastMonth={summary?.lastMonth ?? null}
        />
      </section>

      {/* Strategic */}
      <section className="mb-16">
        <SectionTag>Strategic</SectionTag>
        <div className="flex flex-col gap-3">
          <DriftWatchCard
            weeks={summary?.drift.weeks ?? []}
            series={summary?.drift.series ?? []}
          />
          <HighValueCard breakdown={summary?.highValue.breakdown ?? []} />
        </div>
      </section>

      {/* Skill */}
      <section className="mb-16">
        <SectionTag>Skill</SectionTag>
        <div className="flex flex-col gap-3">
          <SessionStatsCard
            stats={summary?.sessionStats ?? { avgMin: null, longestMin: null, perDay: null }}
            trend={summary?.sessionTrend ?? []}
          />
          <EstimationAccuracyCard data={summary?.estimationAccuracy ?? []} />
        </div>
      </section>
    </div>
  );
}
