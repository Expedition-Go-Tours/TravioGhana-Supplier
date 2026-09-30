import { describe, expect, it } from 'vitest';
import { monthRangeFor, shiftISODays, shiftISOMonths, weekRangeFor } from '../dates';

describe('monthRangeFor', () => {
  it('returns the calendar month containing the anchor', () => {
    const range = monthRangeFor('2026-09-30');
    expect(range.days[0]).toBe('2026-09-01');
    expect(range.days.at(-1)).toBe('2026-09-30');
    expect(range.days).toHaveLength(30);
    expect(range.from).toBe('2026-09-01');
    expect(range.to).toBe('2026-09-30');
    expect(range.label).toBe('September 2026');
  });

  it('returns the leading blank cells for a Sunday-first week grid', () => {
    // 1 Sep 2026 is a Tuesday → two blanks (Sun, Mon) before it.
    expect(monthRangeFor('2026-09-30').padStart).toBe(2);
    // 1 Feb 2026 is a Sunday → no blanks.
    expect(monthRangeFor('2026-02-10').padStart).toBe(0);
    // 1 Mar 2026 is a Sunday too; 1 Jul 2026 is a Wednesday → three blanks.
    expect(monthRangeFor('2026-07-01').padStart).toBe(3);
  });

  it('handles 31-day and February months', () => {
    expect(monthRangeFor('2026-01-15').days).toHaveLength(31);
    expect(monthRangeFor('2026-02-10').days).toHaveLength(28);
    expect(monthRangeFor('2026-02-10').days.at(-1)).toBe('2026-02-28');
  });
});

describe('weekRangeFor', () => {
  it('returns seven days starting at the anchor', () => {
    const range = weekRangeFor('2026-09-30');
    expect(range.days).toHaveLength(7);
    expect(range.days[0]).toBe('2026-09-30');
    expect(range.days.at(-1)).toBe('2026-10-06');
    expect(range.label).toBe('30 Sep – 6 Oct 2026');
    expect(range.padStart).toBe(0);
  });

  it('crosses month boundaries', () => {
    expect(weekRangeFor('2026-10-30').days.at(-1)).toBe('2026-11-05');
  });
});

describe('shift helpers', () => {
  it('steps months and clamps the day of month', () => {
    expect(shiftISOMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftISOMonths('2026-09-30', -1)).toBe('2026-08-30');
    expect(shiftISOMonths('2026-09-15', 3)).toBe('2026-12-15');
  });

  it('steps days across boundaries', () => {
    expect(shiftISODays('2026-09-30', 7)).toBe('2026-10-07');
    expect(shiftISODays('2026-10-01', -1)).toBe('2026-09-30');
  });
});
