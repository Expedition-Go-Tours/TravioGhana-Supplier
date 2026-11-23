/**
 * Client-side period model for the Performance pages.
 *
 * Mirrors the server's rules (services/analyticsPeriod.js in the backend) so the
 * chart label, the GA4 window and the cancellation window all describe the same
 * days as the figures the API returned:
 *
 *   - presets `30d` / `90d` / `12m` are rolling windows ending today;
 *   - `YYYY-MM` is a calendar month, compared with the previous calendar month.
 *
 * Dates are computed in UTC, matching the server. Anything unrecognised falls
 * back to 30 days rather than rendering a half-configured page.
 */

const DAY_MS = 86_400_000;
const MAX_MONTHS_BACK = 36;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PRESETS = Object.freeze([
  { key: "30d", label: "30 days", full: "Last 30 days", days: 30 },
  { key: "90d", label: "90 days", full: "Last 90 days", days: 90 },
  { key: "12m", label: "12 months", full: "Last 12 months", days: 365 },
]);

const PRESET_KEYS = new Set(PRESETS.map((preset) => preset.key));

const isoDay = (date) => date.toISOString().slice(0, 10);
const utcMonthStart = (year, monthIndex) => new Date(Date.UTC(year, monthIndex, 1));

const monthLabel = (date, { short = false } = {}) => {
  const names = short ? MONTHS_SHORT : MONTHS_LONG;
  return `${names[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

export function isMonthKey(value) {
  return typeof value === "string" && MONTH_KEY.test(value);
}

/** A month within the server's accepted range, or null. */
function resolveMonth(value, now) {
  const match = MONTH_KEY.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;

  const start = utcMonthStart(year, monthIndex);
  const end = utcMonthStart(year, monthIndex + 1);
  const currentMonthStart = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth());
  const earliest = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth() - MAX_MONTHS_BACK);
  if (start > currentMonthStart || start < earliest) return null;

  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    year,
    monthIndex,
    start,
    end,
    days: Math.round((end.getTime() - start.getTime()) / DAY_MS),
  };
}

/** Coerce anything from the URL into a period the server will accept. */
export function resolvePeriodKey(value, now = new Date()) {
  if (value && PRESET_KEYS.has(value)) return value;
  if (isMonthKey(value)) {
    const month = resolveMonth(value, now);
    if (month) return month.key;
  }
  return "30d";
}

/**
 * Everything the UI needs for one period: labels for the chart and the
 * comparison line, the day count for legacy callers, and inclusive GA4 bounds.
 */
export function periodMeta(value, now = new Date()) {
  const key = resolvePeriodKey(value, now);

  if (PRESET_KEYS.has(key)) {
    const preset = PRESETS.find((entry) => entry.key === key) || PRESETS[0];
    return {
      key: preset.key,
      isMonth: false,
      label: preset.label,
      full: preset.full,
      previousLabel: "Previous period",
      compareText: `compared with the ${preset.days} days before`,
      days: preset.days,
      from: isoDay(new Date(now.getTime() - preset.days * DAY_MS)),
      to: isoDay(now),
    };
  }

  const month = resolveMonth(key, now);
  const previousStart = utcMonthStart(month.year, month.monthIndex - 1);
  const previousLabel = monthLabel(previousStart);

  return {
    key: month.key,
    isMonth: true,
    label: monthLabel(month.start, { short: true }),
    full: monthLabel(month.start),
    previousLabel,
    compareText: `compared with ${previousLabel}`,
    days: month.days,
    from: isoDay(month.start),
    // GA4 takes inclusive dates; the month window is exclusive at the end.
    to: isoDay(new Date(month.end.getTime() - 1)),
  };
}

/** Months for the picker: newest first, so "this month" is the first option. */
export function monthOptions(now = new Date(), count = 18) {
  const options = [];
  for (let i = 0; i < count; i += 1) {
    const start = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth() - i);
    options.push({
      key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(start),
    });
  }
  return options;
}
