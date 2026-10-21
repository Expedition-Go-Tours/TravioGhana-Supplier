/**
 * The comparison maths behind the Analytics stat cards.
 *
 * These labels used to be printed with no calculation whatsoever ("vs previous
 * period"). They are only shown now when the monthly series supports them, and
 * they name the two buckets they compare.
 */
import { describe, expect, it } from 'vitest';
import { compareLastTwoMonths, formatDelta } from '../comparisons';

describe('compareLastTwoMonths', () => {
  it('compares the two most recent buckets and names them', () => {
    const result = compareLastTwoMonths([
      { month: '2026-08', revenue: 1000, bookings: 2 },
      { month: '2026-09', revenue: 2000, bookings: 4 },
      { month: '2026-10', revenue: 2400, bookings: 5 },
    ]);

    expect(result.label).toBe('Oct vs Sep');
    expect(result.revenuePct).toBeCloseTo(20);
    expect(result.bookingsPct).toBeCloseTo(25);
  });

  it('sorts by month before comparing, whatever order the API returns', () => {
    const result = compareLastTwoMonths([
      { month: '2026-10', grossAmount: 2400, bookingCount: 5 },
      { month: '2026-09', grossAmount: 2000, bookingCount: 4 },
    ]);

    expect(result.label).toBe('Oct vs Sep');
    expect(result.revenuePct).toBeCloseTo(20);
  });

  it('returns null rather than inventing a comparison', () => {
    expect(compareLastTwoMonths([])).toBeNull();
    expect(compareLastTwoMonths([{ month: '2026-10', revenue: 10 }])).toBeNull();
    expect(compareLastTwoMonths(null)).toBeNull();
  });

  it('calls a move off a zero base "New", not infinity', () => {
    const result = compareLastTwoMonths([
      { month: '2026-09', revenue: 0, bookings: 0 },
      { month: '2026-10', revenue: 2400, bookings: 5 },
    ]);

    expect(result.revenuePct).toBeNull();
    expect(formatDelta(result.revenuePct)).toBe('New');
    // Zero to zero is genuinely "no change".
    const flat = compareLastTwoMonths([
      { month: '2026-09', revenue: 0, bookings: 0 },
      { month: '2026-10', revenue: 0, bookings: 0 },
    ]);
    expect(formatDelta(flat.revenuePct)).toBe('No change');
  });

  it('handles the legacy and the current series shapes alike', () => {
    const legacy = compareLastTwoMonths([
      { month: '2026-09', revenue: 100 },
      { month: '2026-10', revenue: 150 },
    ]);
    const current = compareLastTwoMonths([
      { month: '2026-09', grossAmount: 100, bookingCount: 1 },
      { month: '2026-10', grossAmount: 150, bookingCount: 2 },
    ]);

    expect(legacy.revenuePct).toBeCloseTo(current.revenuePct);
  });
});

describe('formatDelta', () => {
  it('always carries a direction and a magnitude', () => {
    expect(formatDelta(12.35)).toBe('▲ 12%');
    expect(formatDelta(-3.04)).toBe('▼ 3%');
    expect(formatDelta(0.4)).toBe('▲ 0.4%');
  });
});
