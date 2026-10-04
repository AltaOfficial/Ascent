import {
  addDaysToKey,
  dateKeyInTz,
  diffDaysBetweenKeys,
  keysBetween,
  startOfDayInTz,
  weekdayOfKey,
} from './dates';

describe('dates', () => {
  it('buckets an instant into the user timezone day', () => {
    // 03:00 UTC is still the previous evening in New York
    const instant = new Date('2026-10-04T03:00:00.000Z');
    expect(dateKeyInTz(instant, 'America/New_York')).toBe('2026-10-03');
    expect(dateKeyInTz(instant, 'UTC')).toBe('2026-10-04');
  });

  it('does key arithmetic across month and DST boundaries', () => {
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToKey('2026-11-01', 1)).toBe('2026-11-02'); // US DST ends
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDaysBetweenKeys('2026-10-01', '2026-10-31')).toBe(30);
    expect(diffDaysBetweenKeys('2026-10-31', '2026-10-01')).toBe(-30);
  });

  it('lists keys inclusively', () => {
    expect(keysBetween('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(keysBetween('2026-10-02', '2026-10-01')).toEqual([]);
  });

  it('knows the weekday of a key', () => {
    expect(weekdayOfKey('2026-10-04')).toBe(0); // Sunday
    expect(weekdayOfKey('2026-10-05')).toBe(1);
  });

  it('finds the start of a day in a timezone', () => {
    expect(startOfDayInTz('2026-10-04', 'America/New_York').toISOString()).toBe(
      '2026-10-04T04:00:00.000Z',
    );
  });
});
