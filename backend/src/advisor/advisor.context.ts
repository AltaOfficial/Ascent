import type { AnalyticsSummary } from '../analytics/analytics.compute';
import type { RankResult } from '../ranking/ranking.compute';

export type AdvisorMemory = {
  stage: string;
  priority: string;
  projects: string;
  bottleneck: string;
  constraints: string;
};

export type AdvisorLiveData = {
  today: string;
  analytics: AnalyticsSummary;
  rank: RankResult;
  compliance: {
    rules: string[];
    last7Pct: number | null;
    last30Pct: number | null;
  };
  openTasks: {
    title: string;
    project: string | null;
    priority: string | null;
    due: string | null;
    estimatedMinutes: number | null;
  }[];
  upcomingMilestones: { name: string; project: string; targetDate: string }[];
};

const PERSONA = `You are a private strategic advisor inside a personal operating system called Ascent. You analyze a user's real data — time allocation, task completion, session patterns, compliance — and give precise, direct guidance.

PERSONA:
- Direct. Analytical. Context-aware. Slightly challenging.
- Never motivational. Never friendly. Never verbose.
- Short. Surgical. Evidence-based.
- You do not give lists of 5+ items. Identify the most important 1–3 signals.
- You never rewrite strategy aggressively. You nudge, not control.
- You never overreact to 2 bad days.

RESPONSE FORMAT:
- Short paragraphs or 2–3 line observations. No headers. No bullet overload.
- If you list priorities, max 3.
- If you ask a follow-up, ask only one.
- Never pad. Never reassure. Never celebrate.

When evaluating a task for leverage, check: Is the product pre-revenue? Are core features done? Does this move the needle on the declared bottleneck?
When checking allocation, compare the live time data against the declared priority order. Flag misalignment without drama.
Ground every claim in the numbers below. If the data doesn't support a conclusion, say so instead of guessing.`;

function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : '—';
}

function hours(value: number): string {
  return `${Math.round(value * 10) / 10}h`;
}

export function buildLiveDataBlock(data: AdvisorLiveData): string {
  const { analytics, rank, compliance } = data;
  const last14 = analytics.dailyHours
    .slice(-14)
    .map((d) => `${d.date.slice(5)}: ${d.hours}h`)
    .join(', ');
  const driftTotals = analytics.drift.series
    .map((series) => {
      const total = analytics.drift.weeks.reduce(
        (sum, week) => sum + Number(week[series.key] ?? 0),
        0,
      );
      return `${series.label} ${hours(total)}`;
    })
    .join(', ');
  const lastWeek = analytics.drift.weeks.at(-1);
  const thisWeekSplit = analytics.drift.series
    .map(
      (series) =>
        `${series.label} ${hours(Number(lastWeek?.[series.key] ?? 0))}`,
    )
    .join(', ');

  const lines = [
    `Today: ${data.today}`,
    `Rank: ${rank.rank} (score ${Math.round(rank.score * 100)}/100${
      rank.nextRank
        ? `, ${Math.round(rank.progressToNext * 100)}% of the way to ${rank.nextRank}`
        : ''
    })${
      rank.cycle
        ? `; cycle day ${rank.cycle.day} of 90, consistency ${Math.round((rank.consistency?.rate ?? 0) * 100)}% of the last 30 days at ≥2h${
            rank.consistency?.gateApplied ? ' (consistency penalty active)' : ''
          }`
        : '; no active cycle'
    }`,
    `Deep work: last 7 days ${hours(analytics.totals.last7)} (avg ${hours(analytics.totals.last7 / 7)}/day), last 14 days ${hours(analytics.totals.last14)}, last 30 days ${hours(analytics.totals.last30)}`,
    `Daily hours, last 14 days: ${last14}`,
    analytics.thisMonth
      ? `This month: ${hours(analytics.thisMonth.total)} over ${analytics.thisMonth.activeDays} active days`
      : 'This month: no hours logged yet',
    analytics.lastMonth
      ? `Last month: ${hours(analytics.lastMonth.total)} over ${analytics.lastMonth.activeDays} active days`
      : 'Last month: no hours logged',
    `Allocation by project, last 8 weeks: ${driftTotals || 'no data'}`,
    `Allocation this week: ${thisWeekSplit || 'no data'}`,
    `High-priority share of hours, last 30 days: ${
      analytics.highValue.pct === null
        ? 'no data'
        : `${analytics.highValue.pct}%`
    }`,
    `Sessions, last 30 days: avg ${analytics.sessionStats.avgMin ?? '—'} min, longest ${analytics.sessionStats.longestMin ?? '—'} min, ${analytics.sessionStats.perDay ?? '—'} per active day`,
    `Estimation error by month: ${
      analytics.estimationAccuracy
        .map((m) => `${m.month} ${m.err}%`)
        .join(', ') || 'no data'
    }`,
    `Compliance rules: ${compliance.rules.join(', ') || 'none'}; compliance last 7 days ${
      compliance.last7Pct ?? '—'
    }%, last 30 days ${compliance.last30Pct ?? '—'}%`,
    `Open tasks (top ${data.openTasks.length} by priority/due date):`,
    ...data.openTasks.map(
      (t) =>
        `  - ${t.title}${t.project ? ` [${t.project}]` : ''}${
          t.priority ? ` priority ${t.priority}` : ''
        }${t.due ? `, due ${t.due}` : ''}${
          t.estimatedMinutes ? `, est ${t.estimatedMinutes}m` : ''
        }`,
    ),
    `Upcoming milestones: ${
      data.upcomingMilestones
        .map((m) => `${m.name} [${m.project}] by ${m.targetDate}`)
        .join('; ') || 'none'
    }`,
  ];
  return lines.join('\n');
}

export function buildSystemPrompt(
  memory: AdvisorMemory,
  threadName: string,
  liveData: string,
): string {
  return `${PERSONA}

USER CONTEXT (persistent memory, written by the user):
- Stage: ${orDash(memory.stage)}
- Priority order: ${orDash(memory.priority)}
- Projects: ${orDash(memory.projects)}
- Current bottleneck: ${orDash(memory.bottleneck)}
- Constraints: ${orDash(memory.constraints)}

LIVE DATA (computed from the user's Ascent account just now):
${liveData}

ACTIVE THREAD: ${threadName}`;
}
