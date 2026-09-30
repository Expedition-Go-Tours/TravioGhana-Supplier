/**
 * Prototype status → tone mapping:
 *   Draft / Under review / New / Paused  → amber
 *   Cancelled / No-show                  → red
 *   Confirmed / Checked in               → blue
 *   everything else (Live, Completed)    → green
 */
export function statusTone(status) {
  switch (status) {
    case "Draft":
    case "Under review":
    case "New":
    case "Paused":
      return "amber";
    case "Cancelled":
    case "No-show":
      return "red";
    case "Confirmed":
    case "Checked in":
      return "blue";
    default:
      return "green";
  }
}

/** Booking statuses offered by the reservation editor (prototype order). */
export const BOOKING_STATUSES = [
  "New",
  "Confirmed",
  "Checked in",
  "Completed",
  "Cancelled",
  "No-show",
];

/** Property statuses offered by the properties filter. */
export const PROPERTY_STATUSES = ["All", "Live", "Under review", "Draft", "Paused"];
