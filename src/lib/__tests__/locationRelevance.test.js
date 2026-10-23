/**
 * When is a suggestion "good enough" to hide the Google Maps fallback?
 *
 * This is the rule that decides whether a supplier stuck with irrelevant
 * matches can still reach the escape hatch. Zero results is the easy case; the
 * one that bites is autocomplete returning weak/unrelated matches for a place
 * it doesn't really know.
 */
import { describe, expect, it } from 'vitest';
import {
  locationQueryTokens,
  locationTextMatchesTokens,
  hasRelevantLocationSuggestion,
} from '../locationRelevance';

describe('locationQueryTokens', () => {
  it('keeps meaningful words and drops stopwords and fragments', () => {
    expect(locationQueryTokens('Hotel near the Kumasi')).toEqual(['hotel', 'kumasi']);
  });

  it('folds diacritics so `Ósu` and `Osu` are the same token', () => {
    expect(locationQueryTokens('a b Ósu')).toEqual(['osu']);
    expect(locationQueryTokens('a b Osu')).toEqual(['osu']);
  });

  it('treats a stopword-only query as having no constraints', () => {
    expect(locationQueryTokens('near the')).toEqual([]);
  });
});

describe('locationTextMatchesTokens', () => {
  it('matches each token as the start of a word', () => {
    // Kanes → Kaneshie is a legitimate prefix match.
    expect(locationTextMatchesTokens('Kaneshie Market', ['kanes'])).toBe(true);
    // osu must NOT match Tosu: a substring is not a word start.
    expect(locationTextMatchesTokens('Tosu Lodge', ['osu'])).toBe(false);
    expect(locationTextMatchesTokens('Osu Castle', ['osu'])).toBe(true);
  });

  it('requires every token to match', () => {
    expect(locationTextMatchesTokens('Kumasi Hotel', ['kumasi', 'hotel'])).toBe(true);
    expect(locationTextMatchesTokens('Kumasi Hotel', ['kumasi', 'accra'])).toBe(false);
  });
});

describe('hasRelevantLocationSuggestion', () => {
  const place = (formatted, over = {}) => ({ formatted, ...over });

  it('is true when one suggestion carries the whole query', () => {
    expect(
      hasRelevantLocationSuggestion('Kumasi Hotel', [
        place('Somewhere else'),
        place('Kumasi Hotel, Ashanti'),
      ]),
    ).toBe(true);
  });

  it('is false when the suggestions are weak/unrelated — the case that hides the fallback', () => {
    // The supplier typed a place we don't know; the dropdown offers noise.
    expect(
      hasRelevantLocationSuggestion('Ghana Girl Guides Training Center', [
        place('Tosu Lodge, Ghana'),
        place('Accra, Ghana'),
      ]),
    ).toBe(false);
  });

  it('is true for a stopword-only query — never offer the fallback for "near the"', () => {
    expect(hasRelevantLocationSuggestion('near the', [])).toBe(true);
  });

  it('reads the structured fields too, not just the label', () => {
    expect(
      hasRelevantLocationSuggestion('Kumasi', [
        place('Some Lodge', { city: 'Kumasi', region: 'Ashanti' }),
      ]),
    ).toBe(true);
  });

  it('is false for an empty list — the plain "no results" case', () => {
    expect(hasRelevantLocationSuggestion('Kumasi Hotel', [])).toBe(false);
  });
});
