/**
 * Period comparisons for the Analytics stat cards.
 *
 * The cards used to read "vs previous period" with no calculation behind them —
 * a label implying a trend the page never computed. A comparison is only shown
 * when the monthly series actually supports one, and it names the two buckets
 * it compares ("Oct vs Sep") so the supplier knows exactly what the number
 * means. When there is nothing to compare, the label is simply not printed.
 */

function monthLabel(value) {
  const [, month] = String(value ?? "").split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[Number(month) - 1] || String(value ?? "");
}

/**
 * Compare the two most recent monthly buckets in a series shaped like
 * `{ month: '2026-10', revenue|grossAmount, bookingCount|bookings }`.
 *
 * Returns null when the series cannot support a comparison — fewer than two
 * buckets, or nothing at all. Percent change is null when the earlier bucket is
 * zero (a move from 0 to 5 is not "+∞%", it is "new").
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
  const pct = (now, before) => {
    if (before === 0) return now > 0 ? null : 0;
    return ((now - before) / before) * 100;
  };

  return {
    label: `${monthLabel(current.month)} vs ${monthLabel(previous.month)}`,
    revenuePct: pct(current.revenue, previous.revenue),
    bookingsPct: pct(current.bookings, previous.bookings),
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
