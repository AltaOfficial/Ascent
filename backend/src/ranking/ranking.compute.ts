import {
  addDaysToKey,
  dateKeyInTz,
  diffDaysBetweenKeys,
  keysBetween,
} from '../common/dates';

// Mirrors frontend/lib/constants.ts (RANKING_CONFIG / RANKS) and the public
// /ranking page. Keep the two in sync.
export const RANKING_CONFIG = {
  CYCLE_DAYS: 90,
  MAX_DAILY_HOURS: 8,
  HOUR_EXPONENT: 1.5,
  HALF_LIFE: 30,
  CONSISTENCY_WINDOW_DAYS: 30,
  CONSISTENCY_THRESHOLD: 0.7,
  CONSISTENCY_MIN_HOURS: 2,
  CONSISTENCY_PENALTY: 0.5,
  APEX_WINDOW_DAYS: 14,
  APEX_HOURS: 6,
  APEX_COMPLIANCE: 0.9,
} as const;

export const RANK_TIERS = [
  { name: 'Unranked', min: 0 },
  { name: 'Builder', min: 0.15 },
  { name: 'Operator', min: 0.35 },
  { name: 'Executor', min: 0.55 },
  { name: 'Performer', min: 0.7 },
  { name: 'Elite', min: 0.82 },
  { name: 'Apex', min: 0.92 },
] as const;

export type RankName = (typeof RANK_TIERS)[number]['name'];

export type RankInput = {
  timezone: string;
  now: Date;
  sessions: { startedAt: Date; endedAt: Date }[];
  rules: { id: string; createdAt: Date }[];
  complianceEntries: { ruleId: string; date: string; checked: boolean }[];
};

export type DailyScore = {
  date: string;
  hours: number;
  compliance: number;
  score: number;
};

export type RankResult = {
  rank: RankName;
  /** Final score after the consistency gate, 0–1 */
  score: number;
  /** Weighted average before the consistency gate */
  weightedScore: number;
  nextRank: RankName | null;
  /** 0–1 progress from the current tier's threshold to the next */
  progressToNext: number;
  cycle: {
    start: string;
    end: string;
    day: number;
    daysRemaining: number;
    ruleCount: number;
  } | null;
  evaluatedThrough: string | null;
  consistency: { rate: number; gateApplied: boolean } | null;
  apex: {
    eligible: boolean;
    avgHours: number;
    avgCompliance: number;
  } | null;
  days: DailyScore[];
};

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function hoursByDay(
  sessions: RankInput['sessions'],
  timezone: string,
): Map<string, number> {
  const hours = new Map<string, number>();
  for (const session of sessions) {
    if (!session.endedAt) continue;
    const duration =
      (session.endedAt.getTime() - session.startedAt.getTime()) / 3_600_000;
    if (duration <= 0) continue;
    // Sessions are attributed to the day they started, matching /users/hours.
    const key = dateKeyInTz(session.startedAt, timezone);
    hours.set(key, (hours.get(key) ?? 0) + duration);
  }
  return hours;
}

/**
 * The cycle starts on the first logged session. Every CYCLE_DAYS days it
 * expires, and the next cycle begins on the first session after that.
 * Returns null when there has been no activity since the last cycle ended.
 */
export function findCycleStart(
  activeDays: string[],
  today: string,
): string | null {
  if (!activeDays.length) return null;
  let cycleStart = activeDays[0];
  while (diffDaysBetweenKeys(cycleStart, today) >= RANKING_CONFIG.CYCLE_DAYS) {
    const cycleEnd = addDaysToKey(cycleStart, RANKING_CONFIG.CYCLE_DAYS);
    const next = activeDays.find((day) => day >= cycleEnd);
    if (!next || next > today) return null;
    cycleStart = next;
  }
  return cycleStart;
}

export function tierForScore(score: number): RankName {
  let tier: RankName = 'Unranked';
  for (const candidate of RANK_TIERS) {
    if (score >= candidate.min) tier = candidate.name;
  }
  return tier;
}

function unranked(): RankResult {
  return {
    rank: 'Unranked',
    score: 0,
    weightedScore: 0,
    nextRank: 'Builder',
    progressToNext: 0,
    cycle: null,
    evaluatedThrough: null,
    consistency: null,
    apex: null,
    days: [],
  };
}

export function computeRank(input: RankInput): RankResult {
  const { timezone } = input;
  const today = dateKeyInTz(input.now, timezone);
  const hours = hoursByDay(input.sessions, timezone);
  const activeDays = [...hours.keys()].filter((day) => day <= today).sort();

  const cycleStart = findCycleStart(activeDays, today);
  if (!cycleStart) return unranked();

  // Today is still in progress, so score through yesterday — unless the cycle
  // started today, in which case today is all there is.
  const evaluatedThrough =
    cycleStart === today ? today : addDaysToKey(today, -1);
  const days = keysBetween(cycleStart, evaluatedThrough);

  // Compliance rules are locked at cycle start: rules created later only count
  // from the next cycle on.
  const cycleRuleIds = new Set(
    input.rules
      .filter((rule) => dateKeyInTz(rule.createdAt, timezone) <= cycleStart)
      .map((rule) => rule.id),
  );
  const checkedByDay = new Map<string, number>();
  for (const entry of input.complianceEntries) {
    if (!entry.checked || !cycleRuleIds.has(entry.ruleId)) continue;
    checkedByDay.set(entry.date, (checkedByDay.get(entry.date) ?? 0) + 1);
  }
  const complianceFor = (day: string) =>
    cycleRuleIds.size === 0
      ? 1
      : Math.min(1, (checkedByDay.get(day) ?? 0) / cycleRuleIds.size);

  const dailyScores: DailyScore[] = days.map((day) => {
    const dayHours = hours.get(day) ?? 0;
    const effectiveHours = Math.min(dayHours, RANKING_CONFIG.MAX_DAILY_HOURS);
    const hourFactor =
      (effectiveHours / RANKING_CONFIG.MAX_DAILY_HOURS) **
      RANKING_CONFIG.HOUR_EXPONENT;
    const compliance = complianceFor(day);
    return {
      date: day,
      hours: round(dayHours, 2),
      compliance: round(compliance, 3),
      score: round(hourFactor * compliance),
    };
  });

  let weightedSum = 0;
  let weightTotal = 0;
  for (const day of dailyScores) {
    const age = diffDaysBetweenKeys(day.date, evaluatedThrough);
    const weight = 0.5 ** (age / RANKING_CONFIG.HALF_LIFE);
    weightedSum += day.score * weight;
    weightTotal += weight;
  }
  const weightedScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

  const consistencyWindow = dailyScores.slice(
    -RANKING_CONFIG.CONSISTENCY_WINDOW_DAYS,
  );
  const consistencyRate =
    consistencyWindow.filter(
      (day) => day.hours >= RANKING_CONFIG.CONSISTENCY_MIN_HOURS,
    ).length / consistencyWindow.length;
  const gateApplied = consistencyRate < RANKING_CONFIG.CONSISTENCY_THRESHOLD;
  const score = gateApplied
    ? weightedScore * RANKING_CONFIG.CONSISTENCY_PENALTY
    : weightedScore;

  const apexWindow = dailyScores.slice(-RANKING_CONFIG.APEX_WINDOW_DAYS);
  const avgHours =
    apexWindow.reduce((sum, day) => sum + day.hours, 0) / apexWindow.length;
  const avgCompliance =
    apexWindow.reduce((sum, day) => sum + day.compliance, 0) /
    apexWindow.length;
  const apexEligible =
    avgHours >= RANKING_CONFIG.APEX_HOURS &&
    avgCompliance >= RANKING_CONFIG.APEX_COMPLIANCE;

  let rank = tierForScore(score);
  if (rank === 'Apex' && !apexEligible) rank = 'Elite';

  const tierIndex = RANK_TIERS.findIndex((tier) => tier.name === rank);
  const next = RANK_TIERS[tierIndex + 1] ?? null;
  const progressToNext = next
    ? Math.max(
        0,
        Math.min(
          1,
          (score - RANK_TIERS[tierIndex].min) /
            (next.min - RANK_TIERS[tierIndex].min),
        ),
      )
    : 1;

  return {
    rank,
    score: round(score),
    weightedScore: round(weightedScore),
    nextRank: next?.name ?? null,
    progressToNext: round(progressToNext, 3),
    cycle: {
      start: cycleStart,
      end: addDaysToKey(cycleStart, RANKING_CONFIG.CYCLE_DAYS - 1),
      day: diffDaysBetweenKeys(cycleStart, today) + 1,
      daysRemaining:
        RANKING_CONFIG.CYCLE_DAYS - diffDaysBetweenKeys(cycleStart, today) - 1,
      ruleCount: cycleRuleIds.size,
    },
    evaluatedThrough,
    consistency: { rate: round(consistencyRate, 3), gateApplied },
    apex: {
      eligible: apexEligible,
      avgHours: round(avgHours, 2),
      avgCompliance: round(avgCompliance, 3),
    },
    days: dailyScores,
  };
}
