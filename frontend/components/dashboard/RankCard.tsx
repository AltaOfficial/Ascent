"use client";

import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Card, CardLabel } from "@/components/dashboard/Card";
import { RANKS } from "@/lib/constants";

export type RankResult = {
  rank: string;
  score: number;
  nextRank: string | null;
  progressToNext: number;
  cycle: { start: string; end: string; day: number; daysRemaining: number } | null;
  consistency: { rate: number; gateApplied: boolean } | null;
  apex: { eligible: boolean; avgHours: number; avgCompliance: number } | null;
};

export function RankCard({ rank }: { rank: RankResult | null }) {
  const tier = RANKS.find((r) => r.name === rank?.rank) ?? RANKS[0];
  const unranked = !rank || rank.rank === "Unranked";

  let detail = "No data yet";
  if (rank?.cycle) {
    detail = `Score ${Math.round(rank.score * 100)} · day ${rank.cycle.day} of 90`;
  } else if (rank) {
    detail = "Log a session to start a cycle";
  }

  const progressPct = Math.round((rank?.progressToNext ?? 0) * 100);

  return (
    <Card style={{ minHeight: undefined }}>
      <div className="flex items-start justify-between">
        <CardLabel>Ascent Rank</CardLabel>
        <Link
          href="/ranking"
          className="-mt-0.5 transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="How ranking works"
          aria-label="How ranking works"
        >
          <CircleHelp size={13} />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 text-lg"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border-mid)",
            color: tier.color,
            opacity: unranked ? 0.6 : 1,
          }}
        >
          {tier.icon}
        </div>
        <div className="min-w-0">
          <div
            className="text-[17px] font-semibold tracking-[-0.02em] leading-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {tier.name}
          </div>
          <div className="text-[10px] tracking-[0.02em] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
            {detail}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-0.75 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(progressPct, rank?.cycle ? 2 : 0)}%`, background: tier.color }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          <span className="truncate">
            {rank?.nextRank && rank.cycle ? `${progressPct}% to ${rank.nextRank}` : rank?.cycle ? "Top rank" : "\u00a0"}
          </span>
          {rank?.consistency?.gateApplied && (
            <span
              className="shrink-0 ml-2"
              style={{ color: "rgba(217,107,107,0.8)" }}
              title="Fewer than 70% of the last 30 days had 2h+, so the score is halved"
            >
              ×0.5 penalty
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
