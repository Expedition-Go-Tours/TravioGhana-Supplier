/**
 * The maths behind "Block a date range".
 *
 * A date the supplier typed must never shift a day across a timezone boundary,
 * and an invalid or half-filled range must yield nothing rather than one
 * accidental date being blocked.
 */
import { describe, expect, it } from 'vitest';
import { datesInRange, MAX_BATCH_DATES } from '../rangeBlock';

describe('datesInRange', () => {
  it('covers both ends, in order', () => {
    expect(datesInRange('2026-11-01', '2026-11-03')).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
  });

  it('handles a single-day range', () => {
    expect(datesInRange('2026-11-01', '2026-11-01')).toEqual(['2026-11-01']);
  });

  it('crosses month and year boundaries in UTC days', () => {
    expect(datesInRange('2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('returns nothing for a reversed or incomplete range', () => {
    expect(datesInRange('2026-11-05', '2026-11-01')).toEqual([]);
    expect(datesInRange('2026-11-01', '')).toEqual([]);
    expect(datesInRange('', '2026-11-01')).toEqual([]);
    expect(datesInRange(null, null)).toEqual([]);
  });

  it('rejects anything that is not an ISO day', () => {
    expect(datesInRange('01/11/2026', '2026-11-03')).toEqual([]);
    expect(datesInRange('2026-11-01', 'tomorrow')).toEqual([]);
  });

  it('never exceeds the API batch limit', () => {
    const dates = datesInRange('2026-01-01', '2027-12-31');
    expect(dates).toHaveLength(MAX_BATCH_DATES);
    expect(dates[0]).toBe('2026-01-01');
  });
});
