import { computeAnalytics, type AnalyticsInput } from './analytics.compute';

function session(taskId: string, start: string, minutes: number) {
  const startedAt = new Date(start);
  return {
    taskId,
    startedAt,
    endedAt: new Date(startedAt.getTime() + minutes * 60_000),
  };
}

const base: AnalyticsInput = {
  timezone: 'UTC',
  weekStart: 'monday',
  now: new Date('2026-10-04T18:00:00Z'), // Sunday
  sessions: [],
  tasks: [
    {
      id: 'a1',
      projectId: 'ascent',
      priority: 'high',
      status: 'done',
      estimatedMinutes: 60,
    },
    {
      id: 'a2',
      projectId: 'ascent',
      priority: 'low',
      status: 'todo',
      estimatedMinutes: null,
    },
    {
      id: 's1',
      projectId: 'school',
      priority: 'high',
      status: 'done',
      estimatedMinutes: 100,
    },
    {
      id: 'i1',
      projectId: null,
      priority: 'medium',
      status: 'todo',
      estimatedMinutes: null,
    },
  ],
  projects: [
    { id: 'ascent', name: 'Ascent', color: '#7b6ef6' },
    { id: 'school', name: 'School', color: '#6b9ed9' },
  ],
};

describe('computeAnalytics', () => {
  it('handles a user with no sessions', () => {
    const result = computeAnalytics(base);
    expect(result.dailyHours).toHaveLength(90);
    expect(result.dailyHours.at(-1)).toEqual({ date: '2026-10-04', hours: 0 });
    expect(result.thisMonth).toBeNull();
    expect(result.highValue.pct).toBeNull();
    expect(result.sessionStats.avgMin).toBeNull();
    expect(result.drift.series).toEqual([]);
    expect(result.estimationAccuracy).toEqual([]);
  });

  it('aggregates daily hours, totals and month stats', () => {
    const result = computeAnalytics({
      ...base,
      sessions: [
        session('a1', '2026-10-04T09:00:00Z', 90),
        session('a2', '2026-10-03T09:00:00Z', 60),
        session('s1', '2026-09-20T09:00:00Z', 120),
      ],
    });
    expect(result.dailyHours.at(-1)?.hours).toBe(1.5);
    expect(result.dailyHours.at(-2)?.hours).toBe(1);
    expect(result.totals.last7).toBe(2.5);
    expect(result.totals.last30).toBe(4.5);
    // October so far: 4 days, 2.5h, 2 active days
    expect(result.thisMonth).toEqual({
      total: 2.5,
      avgPerDay: 0.6,
      activeDays: 2,
    });
    // September: 30 days, 2h, 1 active day
    expect(result.lastMonth).toEqual({
      total: 2,
      avgPerDay: 0.1,
      activeDays: 1,
    });
  });

  it('computes the high-value share from High-priority tasks, split by project', () => {
    const result = computeAnalytics({
      ...base,
      sessions: [
        session('a1', '2026-10-01T09:00:00Z', 60), // high, Ascent
        session('s1', '2026-10-02T09:00:00Z', 30), // high, School
        session('a2', '2026-10-02T12:00:00Z', 30), // low → Other
      ],
    });
    expect(result.highValue.pct).toBe(75);
    expect(result.highValue.breakdown).toEqual([
      { label: 'Ascent', pct: 50, color: '#7b6ef6' },
      { label: 'School', pct: 25, color: '#6b9ed9' },
      { label: 'Other', pct: 25, color: expect.any(String) },
    ]);
  });

  it('builds 8 weeks of drift by project with the week starting Monday', () => {
    const result = computeAnalytics({
      ...base,
      sessions: [
        session('a1', '2026-09-28T09:00:00Z', 120), // Mon of the current week
        session('i1', '2026-09-27T09:00:00Z', 60), // Sun → previous week
      ],
    });
    expect(result.drift.weeks).toHaveLength(8);
    expect(result.drift.weeks.at(-1)).toMatchObject({
      week: 'Sep 28',
      ascent: 2,
      none: 0,
    });
    expect(result.drift.weeks.at(-2)).toMatchObject({
      week: 'Sep 21',
      ascent: 0,
      none: 1,
    });
    expect(result.drift.series.map((s) => s.label)).toEqual([
      'Ascent',
      'No project',
    ]);
  });

  it('respects a Sunday week start', () => {
    const result = computeAnalytics({
      ...base,
      weekStart: 'sunday',
      sessions: [session('a1', '2026-10-04T09:00:00Z', 60)],
    });
    expect(result.drift.weeks.at(-1)?.week).toBe('Oct 4');
  });

  it('computes session stats over the last 30 days', () => {
    const result = computeAnalytics({
      ...base,
      sessions: [
        session('a1', '2026-10-04T09:00:00Z', 30),
        session('a1', '2026-10-04T11:00:00Z', 90),
        session('a2', '2026-10-01T09:00:00Z', 60),
        session('a2', '2026-08-01T09:00:00Z', 600), // outside window
      ],
    });
    expect(result.sessionStats).toEqual({
      avgMin: 60,
      longestMin: 90,
      perDay: 1.5,
    });
    expect(result.sessionTrend).toHaveLength(30);
    expect(result.sessionTrend.at(-1)).toBe(60);
  });

  it('computes estimation error per month for completed, estimated tasks', () => {
    const result = computeAnalytics({
      ...base,
      sessions: [
        session('a1', '2026-09-10T09:00:00Z', 90), // est 60 → 50% error
        session('s1', '2026-09-12T09:00:00Z', 90), // est 100 → 10% error
        session('a2', '2026-09-12T12:00:00Z', 90), // not done → ignored
      ],
    });
    expect(result.estimationAccuracy).toEqual([
      { month: 'Sep 2026', err: 30, tasks: 2 },
    ]);
  });

  it('buckets by the user timezone', () => {
    const result = computeAnalytics({
      ...base,
      timezone: 'America/New_York',
      now: new Date('2026-10-04T18:00:00Z'),
      // 01:00 UTC Oct 4 = 21:00 Oct 3 in New York
      sessions: [session('a1', '2026-10-04T01:00:00Z', 60)],
    });
    expect(result.dailyHours.at(-2)).toEqual({ date: '2026-10-03', hours: 1 });
  });
});
