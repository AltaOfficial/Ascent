import {
  addDaysToKey,
  dateKeyInTz,
  keysBetween,
  weekdayOfKey,
} from '../common/dates';

export type AnalyticsInput = {
  timezone: string;
  // 'monday' or 'sunday'
  weekStart: string;
  now: Date;
  sessions: { taskId: string; startedAt: Date; endedAt: Date }[];
  tasks: {
    id: string;
    projectId: string | null;
    priority: string | null;
    status: string;
    estimatedMinutes: number | null;
  }[];
  projects: { id: string; name: string; color: string | null }[];
};

export type MonthStats = {
  total: number;
  avgPerDay: number;
  activeDays: number;
} | null;

export type DriftSeries = { key: string; label: string; color: string };

export type AnalyticsSummary = {
  today: string;
  dailyHours: { date: string; hours: number }[];
  totals: { last7: number; last14: number; last30: number };
  thisMonth: MonthStats;
  lastMonth: MonthStats;
  drift: { series: DriftSeries[]; weeks: Record<string, string | number>[] };
  highValue: {
    pct: number | null;
    breakdown: { label: string; pct: number; color: string }[];
  };
  sessionStats: {
    avgMin: number | null;
    longestMin: number | null;
    perDay: number | null;
  };
  sessionTrend: number[];
  estimationAccuracy: { month: string; err: number; tasks: number }[];
};

const NO_PROJECT_COLOR = 'rgba(200,200,210,0.35)';
const OTHER_COLOR = 'rgba(200,200,210,0.18)';
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sessionMinutes(session: { startedAt: Date; endedAt: Date }): number {
  return (session.endedAt.getTime() - session.startedAt.getTime()) / 60_000;
}

function monthLabel(key: string): string {
  return MONTHS[Number(key.slice(5, 7)) - 1];
}

function shortDate(key: string): string {
  return `${monthLabel(key)} ${Number(key.slice(8, 10))}`;
}

export function computeAnalytics(input: AnalyticsInput): AnalyticsSummary {
  const { timezone } = input;
  const today = dateKeyInTz(input.now, timezone);
  const taskById = new Map(input.tasks.map((t) => [t.id, t]));
  const projectById = new Map(input.projects.map((p) => [p.id, p]));

  const sessions = input.sessions
    .filter((s) => s.endedAt && sessionMinutes(s) > 0)
    .map((s) => ({
      ...s,
      day: dateKeyInTz(s.startedAt, timezone),
      minutes: sessionMinutes(s),
    }))
    .filter((s) => s.day <= today);

  const hoursByDay = new Map<string, number>();
  for (const session of sessions) {
    hoursByDay.set(
      session.day,
      (hoursByDay.get(session.day) ?? 0) + session.minutes / 60,
    );
  }
  const hoursOn = (day: string) => hoursByDay.get(day) ?? 0;

  // ── Daily hours (last 90 days, oldest first) ─────────────────────────
  const last90 = keysBetween(addDaysToKey(today, -89), today);
  const dailyHours = last90.map((date) => ({
    date,
    hours: round(hoursOn(date), 2),
  }));
  const sumLast = (days: number) =>
    round(
      last90.slice(-days).reduce((sum, day) => sum + hoursOn(day), 0),
      1,
    );

  // ── Month comparison ─────────────────────────────────────────────────
  const monthStats = (days: string[]): MonthStats => {
    const total = days.reduce((sum, day) => sum + hoursOn(day), 0);
    if (total === 0) return null;
    return {
      total: round(total),
      avgPerDay: round(total / days.length),
      activeDays: days.filter((day) => hoursOn(day) > 0).length,
    };
  };
  const thisMonthStart = `${today.slice(0, 8)}01`;
  const lastMonthEnd = addDaysToKey(thisMonthStart, -1);
  const lastMonthStart = `${lastMonthEnd.slice(0, 8)}01`;

  // ── Drift watch: weekly hours by project, last 8 weeks ───────────────
  const firstWeekday = input.weekStart === 'sunday' ? 0 : 1;
  const weekStartOf = (day: string) =>
    addDaysToKey(day, -((weekdayOfKey(day) - firstWeekday + 7) % 7));
  const currentWeek = weekStartOf(today);
  const weekStarts = Array.from({ length: 8 }, (_, i) =>
    addDaysToKey(currentWeek, (i - 7) * 7),
  );
  const projectKeyOf = (taskId: string) =>
    taskById.get(taskId)?.projectId ?? 'none';

  const driftSessions = sessions.filter((s) => s.day >= weekStarts[0]);
  const hoursByProject = new Map<string, number>();
  for (const session of driftSessions) {
    const key = projectKeyOf(session.taskId);
    hoursByProject.set(
      key,
      (hoursByProject.get(key) ?? 0) + session.minutes / 60,
    );
  }
  const topKeys = [...hoursByProject.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => key);
  const seriesKeyOf = (taskId: string) => {
    const key = projectKeyOf(taskId);
    return topKeys.includes(key) ? key : 'other';
  };
  const series: DriftSeries[] = topKeys.map((key) => {
    const project = projectById.get(key);
    return {
      key,
      label:
        project?.name ?? (key === 'none' ? 'No project' : 'Deleted project'),
      color: project?.color ?? NO_PROJECT_COLOR,
    };
  });
  if (hoursByProject.size > topKeys.length) {
    series.push({ key: 'other', label: 'Other', color: OTHER_COLOR });
  }
  const weeks = weekStarts.map((weekStart) => {
    const row: Record<string, string | number> = { week: shortDate(weekStart) };
    for (const s of series) row[s.key] = 0;
    const weekEnd = addDaysToKey(weekStart, 6);
    for (const session of driftSessions) {
      if (session.day < weekStart || session.day > weekEnd) continue;
      const key = seriesKeyOf(session.taskId);
      row[key] = (row[key] as number) + session.minutes / 60;
    }
    for (const s of series) row[s.key] = round(row[s.key] as number);
    return row;
  });

  // ── High-value focus: share of hours on High-priority tasks, 30 days ─
  const last30Start = addDaysToKey(today, -29);
  const recent = sessions.filter((s) => s.day >= last30Start);
  const recentTotal = recent.reduce((sum, s) => sum + s.minutes, 0);
  const highByProject = new Map<string, number>();
  let otherMinutes = 0;
  for (const session of recent) {
    const task = taskById.get(session.taskId);
    if (task?.priority === 'high') {
      const key = task.projectId ?? 'none';
      highByProject.set(key, (highByProject.get(key) ?? 0) + session.minutes);
    } else {
      otherMinutes += session.minutes;
    }
  }
  const pctOf = (minutes: number) =>
    recentTotal > 0 ? Math.round((minutes / recentTotal) * 100) : 0;
  const highMinutes = [...highByProject.values()].reduce((a, b) => a + b, 0);
  const breakdown = [...highByProject.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, minutes]) => {
      const project = projectById.get(key);
      return {
        label: project?.name ?? 'No project',
        pct: pctOf(minutes),
        color: project?.color ?? NO_PROJECT_COLOR,
      };
    });
  if (recentTotal > 0) {
    breakdown.push({
      label: 'Other',
      pct: pctOf(otherMinutes),
      color: OTHER_COLOR,
    });
  }

  // ── Sessions, last 30 days ───────────────────────────────────────────
  const recentDays = new Set(recent.map((s) => s.day));
  const sessionStats = recent.length
    ? {
        avgMin: Math.round(recentTotal / recent.length),
        longestMin: Math.round(Math.max(...recent.map((s) => s.minutes))),
        perDay: round(recent.length / recentDays.size),
      }
    : { avgMin: null, longestMin: null, perDay: null };
  const sessionTrend = keysBetween(last30Start, today).map((day) => {
    const daySessions = recent.filter((s) => s.day === day);
    if (!daySessions.length) return 0;
    return Math.round(
      daySessions.reduce((sum, s) => sum + s.minutes, 0) / daySessions.length,
    );
  });

  // ── Estimation accuracy by month (completed tasks with an estimate) ──
  const actualByTask = new Map<string, { minutes: number; lastDay: string }>();
  for (const session of sessions) {
    const current = actualByTask.get(session.taskId);
    actualByTask.set(session.taskId, {
      minutes: (current?.minutes ?? 0) + session.minutes,
      lastDay:
        current && current.lastDay > session.day
          ? current.lastDay
          : session.day,
    });
  }
  const errorsByMonth = new Map<string, number[]>();
  for (const task of input.tasks) {
    if (task.status !== 'done' || !task.estimatedMinutes) continue;
    const actual = actualByTask.get(task.id);
    if (!actual || actual.minutes <= 0) continue;
    const month = actual.lastDay.slice(0, 7);
    const error =
      (Math.abs(actual.minutes - task.estimatedMinutes) /
        task.estimatedMinutes) *
      100;
    errorsByMonth.set(month, [...(errorsByMonth.get(month) ?? []), error]);
  }
  const months: string[] = [];
  for (let key = thisMonthStart, i = 0; i < 4; i++) {
    months.unshift(key.slice(0, 7));
    key = `${addDaysToKey(key, -1).slice(0, 8)}01`;
  }
  const estimationAccuracy = months.flatMap((month) => {
    const errors = errorsByMonth.get(month);
    if (!errors?.length) return [];
    return [
      {
        month: `${monthLabel(`${month}-01`)} ${month.slice(0, 4)}`,
        err: Math.round(errors.reduce((a, b) => a + b, 0) / errors.length),
        tasks: errors.length,
      },
    ];
  });

  return {
    today,
    dailyHours,
    totals: { last7: sumLast(7), last14: sumLast(14), last30: sumLast(30) },
    thisMonth: monthStats(keysBetween(thisMonthStart, today)),
    lastMonth: monthStats(keysBetween(lastMonthStart, lastMonthEnd)),
    drift: { series, weeks },
    highValue: {
      pct: recentTotal > 0 ? pctOf(highMinutes) : null,
      breakdown,
    },
    sessionStats,
    sessionTrend,
    estimationAccuracy,
  };
}
