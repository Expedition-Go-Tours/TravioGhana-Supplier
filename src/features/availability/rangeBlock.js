/**
 * Bulk "block a date range" maths.
 *
 * Kept pure so the rule can be tested without rendering the calendar: the
 * range is inclusive of both ends, walks in UTC days (a date the supplier typed
 * must never shift a day across a timezone boundary), is capped at the API's
 * batch limit, and an invalid or partial range yields nothing rather than a
 * single accidental date.
 */

/** The API refuses a batch larger than this (availabilityController). */
export const MAX_BATCH_DATES = 365;

/**
 * `datesInRange('2026-11-01', '2026-11-03')` → the three ISO dates inclusive.
 * Returns [] when either end is missing, unparseable, or reversed.
 */
export function datesInRange(from, to, max = MAX_BATCH_DATES) {
  if (!from || !to) return [];

  const start = parseIsoDay(from);
  const end = parseIsoDay(to);
  if (!start || !end) return [];
  if (start.getTime() > end.getTime()) return [];

  const out = [];
  const cursor = start;
  while (cursor.getTime() <= end.getTime() && out.length < max) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function parseIsoDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
