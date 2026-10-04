import { addDaysToKey, weekdayOfKey } from '../common/dates';

export type RepeatRule = {
  repeatFrequency: 'daily' | 'weekly' | 'custom' | null | undefined;
  /** 0 = Sunday … 6 = Saturday */
  repeatDays?: number[] | null;
  repeatInterval?: number | null;
};

/**
 * The next occurrence day strictly after `todayKey`.
 *
 * `anchorKey` is the previous occurrence (or the day repeat was turned on);
 * custom intervals count from it so a late cron run doesn't drift the
 * schedule. Daily and weekly schedules only depend on today.
 */
export function nextOccurrenceKey(
  rule: RepeatRule,
  todayKey: string,
  anchorKey: string = todayKey,
): string {
  switch (rule.repeatFrequency) {
    case 'weekly': {
      const days = rule.repeatDays?.length
        ? rule.repeatDays
        : [weekdayOfKey(anchorKey)];
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = addDaysToKey(todayKey, offset);
        if (days.includes(weekdayOfKey(candidate))) return candidate;
      }
      return addDaysToKey(todayKey, 7);
    }
    case 'custom': {
      const interval = Math.max(1, Math.floor(rule.repeatInterval ?? 1));
      let candidate = addDaysToKey(anchorKey, interval);
      while (candidate <= todayKey) {
        candidate = addDaysToKey(candidate, interval);
      }
      return candidate;
    }
    case 'daily':
    default:
      return addDaysToKey(todayKey, 1);
  }
}
