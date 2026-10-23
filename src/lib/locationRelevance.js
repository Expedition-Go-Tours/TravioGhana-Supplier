/**
 * Token-based relevance check for the location picker's results.
 *
 * The "Search Google Maps" row was originally shown only when the ordinary
 * search returned ZERO suggestions. That misses the common case that bites
 * suppliers: autocomplete returns weak/unrelated matches for a place it does
 * not really know — a small hotel, a village junction — and the traveller sees
 * irrelevant suggestions with no way to reach the fallback.
 *
 * A suggestion counts as "found" only when EVERY meaningful token of the typed
 * query appears in it as the start of a word (`Kanes` matches `Kaneshie`, but
 * `osu` does not match `Tosu`). Stopwords and single-character tokens are
 * ignored. When nothing matches, the Google Maps row is offered alongside the
 * weak suggestions — and it still only spends a SerpApi credit when clicked.
 *
 * Ported from the TravioGhana storefront's `locationRelevance.ts`, so the
 * storefront and the supplier dashboard offer the escape hatch under the same
 * rule.
 */

const STOPWORDS = new Set([
  "a", "an", "and", "at", "by", "for", "from", "in", "is", "near", "of", "on",
  "or", "the", "to", "with",
]);

/** Lowercase + strip diacritics so `Ósu` and `Osu` compare equal. */
function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The meaningful tokens of a typed query (stopwords / short tokens dropped). */
export function locationQueryTokens(query) {
  return normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

/** True when `text` contains every token as the start of a word. */
export function locationTextMatchesTokens(text, tokens) {
  if (tokens.length === 0) return true;
  const haystack = normalize(text);
  return tokens.every((token) =>
    new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(token)}`).test(haystack),
  );
}

/**
 * True when at least one suggestion actually contains what was typed — all
 * meaningful query tokens present (word-prefix match) in the text the dropdown
 * shows for that suggestion. A stopword-only query counts as found.
 */
export function hasRelevantLocationSuggestion(query, suggestions) {
  const tokens = locationQueryTokens(query);
  if (tokens.length === 0) return true;
  return (suggestions || []).some((suggestion) => {
    const haystack = [suggestion.formatted, suggestion.city, suggestion.region, suggestion.country]
      .filter((value) => typeof value === "string" && value.length > 0)
      .join(" ");
    return locationTextMatchesTokens(haystack, tokens);
  });
}
