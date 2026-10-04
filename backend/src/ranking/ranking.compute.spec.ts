import { computeRank, findCycleStart, tierForScore } from './ranking.compute';

const TZ = 'UTC';

/** One session per day of `hours` length, starting 09:00 UTC on each day. */
function sessionsFor(dayHours: Record<string, number>) {
  return Object.entries(dayHours).map(([day, hours]) => {
    const startedAt = new Date(`${day}T09:00:00.000Z`);
    return {
      startedAt,
      endedAt: new Date(startedAt.getTime() + hours * 3_600_000),
    };
  });
}

function daysBack(from: string, count: number): string[] {
  const keys: string[] = [];
  const date = new Date(`${from}T00:00:00.000Z`);
  for (let i = 0; i < count; i++) {
    keys.unshift(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return keys;
}

describe('computeRank', () => {
  const now = new Date('2026-10-04T15:00:00.000Z');

  it('is Unranked with no sessions', () => {
    const result = computeRank({
      timezone: TZ,
      now,
      sessions: [],
      rules: [],
      complianceEntries: [],
    });
    expect(result.rank).toBe('Unranked');
    expect(result.cycle).toBeNull();
  });

  it('scores a perfect 8h day with no rules as 1.0', () => {
    const result = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor({ '2026-10-04': 8 }),
      rules: [],
      complianceEntries: [],
    });
    // Cycle started today, so today is evaluated
    expect(result.evaluatedThrough).toBe('2026-10-04');
    expect(result.score).toBe(1);
    // 8h at 100% compliance clears the Apex gate (≥6h, ≥90%) too
    expect(result.rank).toBe('Apex');
  });

  it('applies the nonlinear hour curve and the 8h cap', () => {
    const result = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor({ '2026-10-04': 4 }),
      rules: [],
      complianceEntries: [],
    });
    // (4/8)^1.5 = 0.35355
    expect(result.days[0].score).toBeCloseTo(0.3536, 3);

    const capped = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor({ '2026-10-04': 12 }),
      rules: [],
      complianceEntries: [],
    });
    expect(capped.days[0].score).toBe(1);
  });

  it('excludes today once the cycle is older than a day', () => {
    const result = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor({
        '2026-10-02': 8,
        '2026-10-03': 8,
        '2026-10-04': 0.5,
      }),
      rules: [],
      complianceEntries: [],
    });
    expect(result.evaluatedThrough).toBe('2026-10-03');
    expect(result.days.map((d) => d.date)).toEqual([
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('multiplies by compliance against rules locked at cycle start', () => {
    const rules = [
      { id: 'a', createdAt: new Date('2026-09-01T00:00:00Z') },
      { id: 'b', createdAt: new Date('2026-09-01T00:00:00Z') },
      // created mid-cycle → ignored this cycle
      { id: 'late', createdAt: new Date('2026-10-03T12:00:00Z') },
    ];
    const result = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor({ '2026-10-02': 8, '2026-10-03': 8 }),
      rules,
      complianceEntries: [
        { ruleId: 'a', date: '2026-10-02', checked: true },
        { ruleId: 'b', date: '2026-10-02', checked: true },
        { ruleId: 'a', date: '2026-10-03', checked: true },
        // b unmarked on 10-03 → counts as a miss
        { ruleId: 'late', date: '2026-10-03', checked: true },
      ],
    });
    expect(result.cycle?.ruleCount).toBe(2);
    expect(result.days[0].compliance).toBe(1);
    expect(result.days[1].compliance).toBe(0.5);
    expect(result.days[1].score).toBe(0.5);
  });

  it('weights recent days more heavily (30-day half-life)', () => {
    const days = daysBack('2026-10-03', 31);
    const hours: Record<string, number> = {};
    // Day 0 (30 days ago) scores 1.0, the latest day scores 1.0, everything else 2h
    for (const day of days) hours[day] = 2;
    hours[days[0]] = 8;
    const result = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor(hours),
      rules: [],
      complianceEntries: [],
    });
    const oldest = result.days[0];
    const newest = result.days[result.days.length - 1];
    expect(oldest.date).toBe(days[0]);
    expect(newest.date).toBe('2026-10-03');
    // Weighted avg must be below the plain mean because the high day is oldest
    const plainMean =
      result.days.reduce((sum, d) => sum + d.score, 0) / result.days.length;
    expect(result.weightedScore).toBeLessThan(plainMean);
  });

  it('halves the score when consistency over the last 30 days is under 70%', () => {
    const days = daysBack('2026-10-03', 30);
    const hours: Record<string, number> = {};
    days.forEach((day, i) => {
      hours[day] = i % 2 === 0 ? 6 : 0; // 50% of days ≥ 2h
    });
    const result = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor(hours),
      rules: [],
      complianceEntries: [],
    });
    expect(result.consistency?.gateApplied).toBe(true);
    expect(result.score).toBeCloseTo(result.weightedScore * 0.5, 3);
  });

  it('only grants Apex when the 14-day gate passes', () => {
    const days = daysBack('2026-10-03', 30);
    const allEight: Record<string, number> = {};
    for (const day of days) allEight[day] = 8;
    const apex = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor(allEight),
      rules: [],
      complianceEntries: [],
    });
    expect(apex.rank).toBe('Apex');

    // Same strong history but the last 14 days average 5.5h → capped at Elite
    // even though the weighted score would still clear 0.92 without the gate.
    const coasting: Record<string, number> = { ...allEight };
    days.slice(-14).forEach((day, i) => {
      coasting[day] = i < 7 ? 8 : 3;
    });
    const elite = computeRank({
      timezone: TZ,
      now,
      sessions: sessionsFor(coasting),
      rules: [],
      complianceEntries: [],
    });
    expect(elite.apex?.eligible).toBe(false);
    expect(['Elite', 'Performer', 'Executor']).toContain(elite.rank);
    expect(elite.rank).not.toBe('Apex');
  });

  it('buckets sessions by the user timezone', () => {
    // 02:00 UTC on Oct 4 is Oct 3 evening in New York
    const result = computeRank({
      timezone: 'America/New_York',
      now: new Date('2026-10-04T15:00:00.000Z'),
      sessions: [
        {
          startedAt: new Date('2026-10-04T00:00:00.000Z'),
          endedAt: new Date('2026-10-04T04:00:00.000Z'),
        },
      ],
      rules: [],
      complianceEntries: [],
    });
    expect(result.cycle?.start).toBe('2026-10-03');
  });
});

describe('findCycleStart', () => {
  it('starts at the first session', () => {
    expect(findCycleStart(['2026-09-01', '2026-09-05'], '2026-10-01')).toBe(
      '2026-09-01',
    );
  });

  it('rolls over to the first session after the 90-day window', () => {
    // 2026-04-01 + 90 days = 2026-06-30
    expect(
      findCycleStart(['2026-04-01', '2026-06-29', '2026-07-03'], '2026-07-10'),
    ).toBe('2026-07-03');
  });

  it('returns null when the cycle expired and no session followed', () => {
    expect(findCycleStart(['2026-04-01'], '2026-07-10')).toBeNull();
  });
});

describe('tierForScore', () => {
  it('maps thresholds', () => {
    expect(tierForScore(0)).toBe('Unranked');
    expect(tierForScore(0.149)).toBe('Unranked');
    expect(tierForScore(0.15)).toBe('Builder');
    expect(tierForScore(0.55)).toBe('Executor');
    expect(tierForScore(0.95)).toBe('Apex');
  });
});
