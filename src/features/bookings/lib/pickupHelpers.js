/**
 * Shared pickup helpers for the supplier dashboard — kept outside component
 * files so both the pickup planner and the booking cards can use them without
 * tripping react-refresh/only-export-components.
 *
 * Canonical location priority:
 *   1. pickup.address.address  (the exact street address from the storefront)
 *   2. pickup.address.name     (short label / place name)
 *   3. pickup.place            (legacy supplier label / landmark)
 *   4. pickup.areaName | pickup.locationName (zone / saved point)
 *
 * The old helper showed `place` first, so a booking with "Kempinski Hotel" and
 * "12 Akuafo St, East Legon" rendered only the hotel name. The customer's
 * email and the customer app both render `address`, which made the supplier
 * and the customer see different pickup points.
 */

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** The structured address object, or null. */
export function pickupAddressObject(pickup) {
  return pickup?.address && typeof pickup.address === "object" ? pickup.address : null;
}

/**
 * Full display model for a snapshot. `primary` is the line a driver needs to
 * read; `secondary` holds the landmark / short label; `zone` is the service
 * area or saved pickup point.
 */
export function pickupDisplay(pickup) {
  if (!pickup) {
    return { primary: "", secondary: "", zone: "", hasAddress: false, hasLocation: false, hasTime: false };
  }
  const address = pickupAddressObject(pickup);
  const addressText = text(address?.address);
  const addressName = text(address?.name);
  const place = text(pickup.place);
  const zone = text(pickup.areaName) || text(pickup.locationName);

  const coords = pickupCoords(pickup);
  const coordLabel =
    coords.lat !== null && coords.lng !== null
      ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
      : "";
  const primary = addressText || addressName || place || zone || coordLabel;

  const extras = [];
  if (addressName && addressName !== primary) extras.push(addressName);
  if (place && place !== primary && place !== addressName) extras.push(place);

  const hasAddress = !!(addressText || addressName);
  const hasLocation = !!(hasAddress || place || zone || coordLabel);
  return {
    primary,
    secondary: extras.join(" · "),
    zone,
    hasAddress,
    hasLocation,
    hasTime: !!text(pickup.time),
  };
}

/** True when the snapshot has a location or coordinates. */
export function hasPickupLocation(pickup) {
  return pickupDisplay(pickup).hasLocation;
}

/** Canonical coordinates: address first, then legacy top-level lat/lng. */
export function pickupCoords(pickup) {
  const address = pickupAddressObject(pickup);
  const lat = finite(address?.lat) ?? finite(pickup?.lat);
  const lng = finite(address?.lng) ?? finite(pickup?.lng);
  return lat !== null && lng !== null ? { lat, lng } : { lat: null, lng: null };
}

/** Google Maps URL for the exact point, or the address text. */
export function pickupMapsUrl(pickup) {
  const { primary } = pickupDisplay(pickup);
  const { lat, lng } = pickupCoords(pickup);
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return primary ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primary)}` : null;
}

/** Human-readable label for a stored pickup snapshot. */
export function pickupLabel(pickup) {
  const { primary } = pickupDisplay(pickup);
  return primary || "Pickup requested";
}

/**
 * True when a pickup snapshot still needs operator attention: no location or
 * no time. Instructions are optional — neither storefront collects them at
 * checkout, so requiring them marked every new pickup "Incomplete".
 */
export function isPickupIncomplete(pickup) {
  if (!pickup) return true;
  const { hasLocation, hasTime } = pickupDisplay(pickup);
  return !hasLocation || !hasTime;
}
