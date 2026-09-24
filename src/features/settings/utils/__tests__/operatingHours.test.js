import { describe, it, expect } from 'vitest';
import {
  DAYS,
  DEFAULT_RANGE,
  clearAllHours,
  copyDayForward,
  emptyWeeklyHours,
  firstDayWithHours,
  hasHours,
  isValidTime,
  normalizeWeeklyHours,
  validateOperatingHours,
} from '../operatingHours';

describe('isValidTime', () => {
  it('accepts 24-hour HH:mm', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('08:30')).toBe(true);
    expect(isValidTime('23:45')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('8:30')).toBe(false);
    expect(isValidTime('08:60')).toBe(false);
    expect(isValidTime('')).toBe(false);
    expect(isValidTime(null)).toBe(false);
    expect(isValidTime(830)).toBe(false);
  });
});

describe('emptyWeeklyHours', () => {
  it('has every day, closed, in week order', () => {
    const week = emptyWeeklyHours();
    expect(Object.keys(week)).toEqual(DAYS);
    expect(Object.values(week).every((ranges) => Array.isArray(ranges) && ranges.length === 0)).toBe(true);
  });
});

describe('normalizeWeeklyHours', () => {
  it('keeps a saved week and fills the missing days', () => {
    const week = normalizeWeeklyHours({ Monday: [{ startTime: '09:00', endTime: '17:00' }] });
    expect(Object.keys(week)).toEqual(DAYS);
    expect(week.Monday).toEqual([{ startTime: '09:00', endTime: '17:00' }]);
    expect(week.Sunday).toEqual([]);
  });

  it('drops legacy free-text values to an empty week', () => {
    expect(normalizeWeeklyHours('Mon-Fri 9AM-5PM')).toEqual(emptyWeeklyHours());
  });

  it('tolerates junk without throwing', () => {
    for (const junk of [null, undefined, 42, ['Monday'], { Monday: 'nope' }, { Monday: [null] }]) {
      expect(normalizeWeeklyHours(junk)).toEqual(emptyWeeklyHours());
    }
  });

  it('repairs invalid times and keeps at most one range per day', () => {
    const week = normalizeWeeklyHours({
      Monday: [{ startTime: 'nonsense', endTime: '99:99' }],
      Tuesday: [
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '13:00', endTime: '17:00' },
      ],
    });
    expect(week.Monday).toEqual([{ ...DEFAULT_RANGE }]);
    expect(week.Tuesday).toEqual([{ startTime: '09:00', endTime: '12:00' }]);
  });

  it('is stable across a round trip (key order matters for the dirty check)', () => {
    const week = normalizeWeeklyHours({ Friday: [{ startTime: '10:00', endTime: '16:00' }] });
    expect(JSON.stringify(normalizeWeeklyHours(week))).toBe(JSON.stringify(week));
  });
});

describe('hasHours / firstDayWithHours', () => {
  it('reports the first open day in week order', () => {
    const week = { ...emptyWeeklyHours(), Wednesday: [{ startTime: '08:00', endTime: '18:00' }], Friday: [{ startTime: '09:00', endTime: '17:00' }] };
    expect(hasHours(week)).toBe(true);
    expect(firstDayWithHours(week)).toBe('Wednesday');
    expect(hasHours(emptyWeeklyHours())).toBe(false);
    expect(firstDayWithHours(emptyWeeklyHours())).toBeNull();
  });
});

describe('validateOperatingHours', () => {
  it('accepts an empty schedule (the field is optional)', () => {
    expect(validateOperatingHours(emptyWeeklyHours())).toEqual({});
  });

  it('accepts a normal range', () => {
    expect(validateOperatingHours({ ...emptyWeeklyHours(), Monday: [{ startTime: '08:00', endTime: '18:00' }] })).toEqual({});
  });

  it('rejects an end time at or before the start', () => {
    const reversed = validateOperatingHours({ ...emptyWeeklyHours(), Friday: [{ startTime: '18:00', endTime: '08:00' }] });
    expect(reversed.Friday).toMatch(/after the start/i);

    const equal = validateOperatingHours({ ...emptyWeeklyHours(), Monday: [{ startTime: '08:00', endTime: '08:00' }] });
    expect(equal.Monday).toMatch(/after the start/i);
  });

  it('rejects malformed times', () => {
    const bad = validateOperatingHours({ ...emptyWeeklyHours(), Sunday: [{ startTime: '25:00', endTime: '26:00' }] });
    expect(bad.Sunday).toMatch(/valid time/i);
  });
});

describe('copyDayForward', () => {
  it('copies forward only and leaves earlier days alone', () => {
    const week = {
      ...emptyWeeklyHours(),
      Wednesday: [{ startTime: '09:00', endTime: '17:00' }],
      Monday: [{ startTime: '08:00', endTime: '18:00' }],
    };
    const next = copyDayForward(week, 'Wednesday');
    expect(next.Thursday).toEqual([{ startTime: '09:00', endTime: '17:00' }]);
    expect(next.Sunday).toEqual([{ startTime: '09:00', endTime: '17:00' }]);
    // Earlier days (Monday/Tuesday) are untouched by a Wednesday copy.
    expect(next.Monday).toEqual([{ startTime: '08:00', endTime: '18:00' }]);
    expect(next.Tuesday).toEqual([]);
  });

  it('does not alias the source range objects', () => {
    const week = { ...emptyWeeklyHours(), Monday: [{ startTime: '09:00', endTime: '17:00' }] };
    const next = copyDayForward(week, 'Monday');
    next.Tuesday[0].startTime = '10:00';
    expect(week.Monday[0].startTime).toBe('09:00');
  });
});

describe('clearAllHours', () => {
  it('closes every day', () => {
    expect(clearAllHours()).toEqual(emptyWeeklyHours());
  });
});
