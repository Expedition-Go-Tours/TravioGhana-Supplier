/**
 * Operating hours — the supplier's weekly schedule on the business profile.
 *
 * Deliberately the same shape the product builder uses for a tour's "standard
 * weekly schedule": an object keyed by full day name, each day holding a list
 * of { startTime, endTime } ranges as 24-hour "HH:mm" strings. The builder
 * allows a single range per day; the same rule is kept here so the two can be
 * unified later without a data migration.
 *
 * Stored at `businessInfo.operatingHours`. The field used to be free text, so
 * anything that isn't a valid week collapses to an empty one rather than
 * throwing.
 */

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Default range applied when a day is first opened (matches the builder). */
export const DEFAULT_RANGE = { startTime: '08:00', endTime: '18:00' };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Is this a 24-hour "HH:mm" string? */
export function isValidTime(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

/**
 * An empty week with every day present, so the object's key order is stable —
 * the settings form's dirty check compares with JSON.stringify, which is
 * order-sensitive.
 */
export function emptyWeeklyHours() {
  const out = {};
  for (const day of DAYS) out[day] = [];
  return out;
}

/**
 * Coerce a stored value into a complete week. Legacy free-text values, partial
 * objects and junk all normalise to a valid week (days default to closed).
 */
export function normalizeWeeklyHours(value) {
  const out = emptyWeeklyHours();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;

  for (const day of DAYS) {
    const ranges = value[day];
    if (!Array.isArray(ranges)) continue;
    const range = ranges.find((r) => r && typeof r === 'object');
    if (!range) continue;
    out[day] = [{
      startTime: isValidTime(range.startTime) ? range.startTime : DEFAULT_RANGE.startTime,
      endTime: isValidTime(range.endTime) ? range.endTime : DEFAULT_RANGE.endTime,
    }];
  }
  return out;
}

/** Does any day have hours? */
export function hasHours(weekly) {
  return DAYS.some((day) => (weekly?.[day] || []).length > 0);
}

/** The first open day in week order — the source for "copy to remaining days". */
export function firstDayWithHours(weekly) {
  return DAYS.find((day) => (weekly?.[day] || []).length > 0) || null;
}

/**
 * Structure only: the schedule is optional, but a range that ends at or before
 * it starts is meaningless. The builder does not check this; storing one would
 * be a bug worth avoiding.
 *
 * @returns {Record<string, string>} day name -> message (empty when valid)
 */
export function validateOperatingHours(weekly) {
  const errors = {};
  for (const day of DAYS) {
    const range = (weekly?.[day] || [])[0];
    if (!range) continue;
    if (!isValidTime(range.startTime) || !isValidTime(range.endTime)) {
      errors[day] = 'Enter a valid time';
    } else if (range.endTime <= range.startTime) {
      errors[day] = 'End time must be after the start time';
    }
  }
  return errors;
}

/** Copy one day's hours to every later day (forward only, like the builder). */
export function copyDayForward(weekly, sourceDay) {
  const next = { ...emptyWeeklyHours(), ...weekly };
  const source = next[sourceDay] || [];
  const startIndex = DAYS.indexOf(sourceDay);
  for (let i = startIndex + 1; i < DAYS.length; i += 1) {
    next[DAYS[i]] = source.map((range) => ({ ...range }));
  }
  return next;
}

/** Close every day. */
export function clearAllHours() {
  return emptyWeeklyHours();
}
