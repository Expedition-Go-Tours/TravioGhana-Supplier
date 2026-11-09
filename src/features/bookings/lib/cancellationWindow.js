/**
 * When does the supplier's cancellation button close?
 *
 * The activity date itself is not the cutoff. A supplier can still cancel on
 * the morning of the tour; they only lose the option once the experience is
 * due to start. With a time slot the cutoff is that time. Without one there is
 * no clock to point at, so the whole travel day stays open.
 *
 * Mirrors `cancellationClosedForActivity` in the backend so the button and the
 * API agree.
 */
const HAS_TIME = /^\d{1,2}:\d{2}/;

export function activityCutoff(booking) {
  const raw = new Date(booking?.travelDate);
  if (!Number.isFinite(raw.getTime())) return null;

  const startMs = Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
  const time = String(booking?.selectedTime || "");
  if (!HAS_TIME.test(time)) return new Date(startMs + 24 * 60 * 60 * 1000 - 1);

  const [hours, minutes] = time.split(":").map((n) => parseInt(n, 10) || 0);
  return new Date(startMs + (hours * 60 + minutes) * 60 * 1000);
}

export function isCancellationClosed(booking, now = new Date()) {
  const cutoff = activityCutoff(booking);
  return cutoff ? now >= cutoff : false;
}
