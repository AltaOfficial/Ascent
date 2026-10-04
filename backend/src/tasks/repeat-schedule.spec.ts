import { nextOccurrenceKey } from './repeat-schedule';

// 2026-10-04 is a Sunday
describe('nextOccurrenceKey', () => {
  it('daily → tomorrow', () => {
    expect(nextOccurrenceKey({ repeatFrequency: 'daily' }, '2026-10-04')).toBe(
      '2026-10-05',
    );
  });

  it('weekly → next selected weekday, strictly after today', () => {
    // Mon (1) and Wed (3)
    const rule = { repeatFrequency: 'weekly' as const, repeatDays: [3, 1] };
    expect(nextOccurrenceKey(rule, '2026-10-04')).toBe('2026-10-05'); // Sun → Mon
    expect(nextOccurrenceKey(rule, '2026-10-05')).toBe('2026-10-07'); // Mon → Wed
  });

  it('weekly wraps into next week when today is past every selected day', () => {
    // Only Monday; today is Friday 2026-10-09
    expect(
      nextOccurrenceKey(
        { repeatFrequency: 'weekly', repeatDays: [1] },
        '2026-10-09',
      ),
    ).toBe('2026-10-12');
  });

  it('weekly on the same weekday as today → one week later', () => {
    expect(
      nextOccurrenceKey(
        { repeatFrequency: 'weekly', repeatDays: [0] },
        '2026-10-04',
      ),
    ).toBe('2026-10-11');
  });

  it('weekly with no days falls back to the anchor weekday', () => {
    expect(
      nextOccurrenceKey(
        { repeatFrequency: 'weekly', repeatDays: [] },
        '2026-10-04',
        '2026-10-01', // Thursday
      ),
    ).toBe('2026-10-08');
  });

  it('custom interval counts from the anchor without drifting', () => {
    const rule = { repeatFrequency: 'custom' as const, repeatInterval: 3 };
    expect(nextOccurrenceKey(rule, '2026-10-04')).toBe('2026-10-07');
    // Cron ran late: anchor 10-01, today 10-05 → 10-04 is past, so 10-07
    expect(nextOccurrenceKey(rule, '2026-10-05', '2026-10-01')).toBe(
      '2026-10-07',
    );
  });

  it('custom interval guards against 0 / null', () => {
    expect(
      nextOccurrenceKey(
        { repeatFrequency: 'custom', repeatInterval: 0 },
        '2026-10-04',
      ),
    ).toBe('2026-10-05');
  });
});
