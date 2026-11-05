/**
 * Period comparisons for the Performance page.
 *
 * Every delta on the page compares one window with the window immediately
 * before it, of the same length. These helpers only do the arithmetic; the
 * windows themselves come from the API so the card, the chart and the table
 * cannot disagree about what "previous" means.
 */

/** Percentage change, or null when the previous window was empty. */
export function percentChange(current, previous) {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (before === 0) return now > 0 ? null : 0;
  return ((now - before) / before) * 100;
}

function monthLabel(value) {
  const [, month] = String(value ?? "").split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[Number(month) - 1] || String(value ?? "");
}

/**
 * Compare the two most recent monthly buckets in a series shaped like
 * `{ month: '2026-10', revenue|grossAmount, bookingCount|bookings }`.
 *
 * Kept for callers that only have a monthly series. The Performance page uses
 * the API's period pair instead, which is not limited to months.
 */
export function compareLastTwoMonths(series) {
  const months = (series || [])
    .map((entry) => ({
      month: entry.month,
      revenue: Number(entry.revenue ?? entry.grossAmount) || 0,
      bookings: Number(entry.bookings ?? entry.bookingCount) || 0,
    }))
    .filter((entry) => entry.month)
    .sort((a, b) => String(a.month).localeCompare(String(b.month)));

  if (months.length < 2) return null;

  const [previous, current] = months.slice(-2);

  return {
    label: `${monthLabel(current.month)} vs ${monthLabel(previous.month)}`,
    revenuePct: percentChange(current.revenue, previous.revenue),
    bookingsPct: percentChange(current.bookings, previous.bookings),
    currentRevenue: current.revenue,
    previousRevenue: previous.revenue,
    currentBookings: current.bookings,
    previousBookings: previous.bookings,
  };
}

/** "▲ 12.4%" / "▼ 3.0%" / "New" / "No change" — never a bare sign. */
export function formatDelta(pct) {
  if (pct === null || pct === undefined) return "New";
  if (pct === 0) return "No change";
  const magnitude = Math.abs(pct);
  const shown = magnitude >= 10 ? Math.round(magnitude) : Number(magnitude.toFixed(1));
  return `${pct > 0 ? "▲" : "▼"} ${shown}%`;
}
