/**
 * Parse what suppliers paste from Google Maps into a coordinate pair.
 *
 * Google's URLs carry coordinates in several shapes depending on how the link
 * was copied: the `!3d…!4d…` place payload, an `@lat,lng,zoom` viewport, or a
 * `q=`/`query=` style parameter. Mobile's "copy coordinates" also yields a raw
 * "5.6037, -0.1870" string. Short links (maps.app.goo.gl, goo.gl/maps) can't be
 * expanded in the browser (CORS hides the redirect target), so they are
 * detected separately so the UI can explain what to paste instead.
 *
 * Pure and unit-testable — no React, no network.
 */

const SHORT_LINK_PATTERNS = [
  /^https?:\/\/maps\.app\.goo\.gl\//i,
  /^https?:\/\/goo\.gl\/maps\//i,
  /^https?:\/\/g\.co\/kgs\//i,
];

const PAIR_VALUE = /^\s*(?:loc:)?\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** The query-parameter names Google has used for coordinate values. */
const COORD_PARAMS = ["q", "query", "ll", "center", "daddr", "destination", "sll"];

function validPair(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function parsePairValue(value) {
  const match = String(value ?? "").match(PAIR_VALUE);
  if (!match) return null;
  return validPair(Number(match[1]), Number(match[2]));
}

/** Accept a URL with or without its scheme (suppliers often paste the latter). */
function asUrl(input) {
  try {
    return new URL(input);
  } catch {
    // Not a URL yet — normalise the common schemeless forms and retry once.
  }
  if (/^(?:www\.|maps\.|google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|g\.co)/i.test(input)) {
    try {
      return new URL(`https://${input}`);
    } catch {
      return null;
    }
  }
  return null;
}

/** `/maps/place/Roman+Ridge/…` → "Roman Ridge". */
function placeName(url) {
  const match = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
  } catch {
    return match[1].replace(/\+/g, " ").trim();
  }
}

/** True for the short links the browser cannot expand. */
export function isShortGoogleMapsLink(input) {
  const raw = String(input ?? "").trim();
  return SHORT_LINK_PATTERNS.some((pattern) => pattern.test(raw));
}

/**
 * Extract `{ lat, lng, name }` from a Google Maps link or a raw coordinate
 * pair. Returns `null` when no valid pair can be read. `name` is "" when the
 * link carried no place name.
 */
export function parseGoogleMapsLocation(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  // A raw pair (the "copy coordinates" output from the mobile app).
  const rawPair = parsePairValue(raw);
  if (rawPair) return { ...rawPair, name: "" };

  const url = asUrl(raw);
  if (!url) return null;

  // `!3d<lat>!4d<lng>` is the actual place pin; prefer it over the viewport.
  const placePin = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (placePin) {
    const pair = validPair(Number(placePin[1]), Number(placePin[2]));
    if (pair) return { ...pair, name: placeName(url) };
  }

  // `@<lat>,<lng>,<zoom>` — the map viewport centre.
  const viewport = url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (viewport) {
    const pair = validPair(Number(viewport[1]), Number(viewport[2]));
    if (pair) return { ...pair, name: placeName(url) };
  }

  for (const key of COORD_PARAMS) {
    const pair = parsePairValue(url.searchParams.get(key));
    if (pair) return { ...pair, name: placeName(url) };
  }

  return null;
}
