// ─── Holiday Utilities — Single source of truth ────────────────────────────
// Rules:
//   - All Sundays are holidays
//   - 1st and 3rd Saturday of each month are holidays
//   - 2nd, 4th, and 5th Saturdays are working days
//   - Manual holidays (from DB) are checked separately by the API

/**
 * Returns which occurrence of the weekday (e.g. Saturday) a date falls on within its month.
 * e.g. Sept 6 (Saturday) → 1st Saturday → returns 1
 */
export function getWeekdayOccurrence(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

/**
 * Returns true if the date is a default (rule-based) holiday.
 * Does NOT check manual/DB holidays — that's the API's job.
 */
export function isDefaultHoliday(date: Date): boolean {
  const day = date.getDay();

  // Sunday = always holiday
  if (day === 0) return true;

  // Saturday: only 1st and 3rd occurrences are holidays
  if (day === 6) {
    const occurrence = getWeekdayOccurrence(date);
    return occurrence === 1 || occurrence === 3;
  }

  return false;
}

/**
 * Parses a YYYY-MM-DD string into a local Date object (avoids UTC offset issues).
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
