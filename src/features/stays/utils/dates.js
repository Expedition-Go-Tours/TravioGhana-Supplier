/**
 * Date helpers for the Stays workspace.
 *
 * The prototype's date handling (string slicing, `new Date(...T12:00:00Z)`
 * timezone hacks) is replaced here with date-fns. Stay dates are calendar
 * dates, not instants: they stay as `yyyy-MM-dd` strings everywhere and are
 * only turned into Date objects inside these helpers.
 */
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

/** Date → "yyyy-MM-dd" (the wire format). */
export function toISODate(date) {
  return format(date, "yyyy-MM-dd");
}

/** "yyyy-MM-dd" → Date (local midnight — no UTC shifts). */
export function fromISODate(iso) {
  return parseISO(iso);
}

/** "yyyy-MM-dd" + n months → "yyyy-MM-dd" (day-of-month is clamped). */
export function shiftISOMonths(iso, months) {
  return toISODate(addMonths(fromISODate(iso), months));
}

/** "yyyy-MM-dd" ± n days → "yyyy-MM-dd". */
export function shiftISODays(iso, days) {
  return toISODate(addDays(fromISODate(iso), days));
}

/** The calendar month containing `anchorIso`: 1st → last day, with its label
 *  and the leading blank cells needed for a Sunday-first week grid. */
export function monthRangeFor(anchorIso) {
  const anchor = fromISODate(anchorIso);
  const start = startOfMonth(anchor);
  const days = eachDayOfInterval({ start, end: endOfMonth(anchor) }).map(toISODate);
  return {
    days,
    from: days[0],
    to: days[days.length - 1],
    label: format(anchor, "MMMM yyyy"),
    padStart: start.getDay(),
  };
}

/** Seven days starting at `anchorIso`, with a compact range label. */
export function weekRangeFor(anchorIso) {
  const start = fromISODate(anchorIso);
  const days = Array.from({ length: 7 }, (_, index) => toISODate(addDays(start, index)));
  return {
    days,
    from: days[0],
    to: days[days.length - 1],
    label: `${format(start, "d MMM")} – ${format(addDays(start, 6), "d MMM yyyy")}`,
    padStart: 0,
  };
}

/** Dashboard list format, matching the prototype: "10-04 – 10-08". */
export function formatStayShort(fromIso, toIso) {
  return `${String(fromIso).slice(5)} – ${String(toIso).slice(5)}`;
}

/** Two-line calendar day header: { weekday: "Thu", date: "1 Oct" }. */
export function formatDayHeader(iso) {
  const date = fromISODate(iso);
  return { weekday: format(date, "EEE"), date: format(date, "d MMM") };
}

/** Booking modal copy: "2026-10-04 → 2026-10-08" (prototype format). */
export function formatShortArrow(fromIso, toIso) {
  return `${fromIso} → ${toIso}`;
}

/** Today as `yyyy-MM-dd`, for default form values. */
export function todayISO() {
  return toISODate(new Date());
}
