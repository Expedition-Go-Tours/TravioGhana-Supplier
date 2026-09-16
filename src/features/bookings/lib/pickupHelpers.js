/**
 * Shared pickup helpers for the supplier dashboard — kept outside component
 * files so both the pickup planner and the booking cards can use them without
 * tripping react-refresh/only-export-components.
 */

/** Human-readable label for a stored pickup snapshot. */
export function pickupLabel(pickup) {
  if (!pickup) return "";
  if (pickup.place) return pickup.place;
  if (pickup.areaName) return `Pickup area: ${pickup.areaName}`;
  if (pickup.locationName) return pickup.locationName;
  if (pickup.address?.name) return pickup.address.name;
  if (pickup.address?.address) return pickup.address.address;
  return "Pickup requested";
}

/** True when a pickup snapshot is missing location, time, or instructions. */
export function isPickupIncomplete(pickup) {
  if (!pickup) return true;
  if (!pickup.place && !pickup.areaName && !pickup.locationName && !pickup.address) return true;
  if (!pickup.time) return true;
  if (!pickup.instructions) return true;
  return false;
}
