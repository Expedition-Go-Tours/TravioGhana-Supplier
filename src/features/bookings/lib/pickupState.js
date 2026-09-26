/**
 * Pickup-run state tokens for the planner.
 *
 * Deliberately no yellow: "awaiting customer" is informational (sky) and a
 * genuinely incomplete pickup is a problem (red). Confirmed bookings read
 * emerald. Kept in one place so the row, the pill and the page never drift.
 */
export const PICKUP_STATE_META = {
  confirmed: {
    label: "Confirmed",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15",
    accent: "border-l-emerald-500",
  },
  deferred: {
    label: "Awaiting customer",
    dot: "bg-sky-500",
    text: "text-sky-700",
    chip: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/15",
    accent: "border-l-sky-500",
  },
  incomplete: {
    label: "Incomplete",
    dot: "bg-red-500",
    text: "text-red-700",
    chip: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15",
    accent: "border-l-red-500",
  },
};

export function pickupStateMeta(state) {
  return PICKUP_STATE_META[state] || PICKUP_STATE_META.deferred;
}

/** Server state when present; otherwise infer from the booking flags. */
export function resolvePickupState(booking) {
  if (!booking) return "deferred";
  if (booking.pickupState) return booking.pickupState;
  if (booking.pickupDeferred) return "deferred";
  if (booking.isIncomplete) return "incomplete";
  return "confirmed";
}
