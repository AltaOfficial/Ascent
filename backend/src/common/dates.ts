import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

// Day keys are plain "YYYY-MM-DD" strings in the user's timezone. Doing day math
// on the keys themselves (anchored at UTC midnight) keeps DST transitions from
// shifting a day forwards or backwards.

export function dateKeyInTz(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone || 'UTC', 'yyyy-MM-dd');
}

export function addDaysToKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDaysBetweenKeys(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      86_400_000,
  );
}

/** Inclusive list of day keys from `start` to `end`. */
export function keysBetween(start: string, end: string): string[] {
  const keys: string[] = [];
  for (let key = start; key <= end; key = addDaysToKey(key, 1)) keys.push(key);
  return keys;
}

/** 0 = Sunday … 6 = Saturday, for a day key. */
export function weekdayOfKey(key: string): number {
  return new Date(`${key}T00:00:00.000Z`).getUTCDay();
}

/** The instant at which the given day starts in the user's timezone. */
export function startOfDayInTz(key: string, timezone: string): Date {
  return fromZonedTime(`${key}T00:00:00`, timezone || 'UTC');
}
