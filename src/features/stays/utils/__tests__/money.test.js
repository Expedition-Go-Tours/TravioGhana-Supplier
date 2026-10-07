import { describe, expect, it } from 'vitest';
import { formatMoney } from '../money';

describe('formatMoney', () => {
  it('prints whole amounts the way the prototype does', () => {
    expect(formatMoney(6950)).toBe('GHS 6,950');
    expect(formatMoney(750)).toBe('GHS 750');
    expect(formatMoney(0)).toBe('GHS 0');
  });

  it('keeps cents only when the amount actually has a fraction', () => {
    expect(formatMoney(1234.5)).toBe('GHS 1,234.5');
    expect(formatMoney(999.99)).toBe('GHS 999.99');
  });

  it('honours the payload currency and survives junk', () => {
    expect(formatMoney(1000, 'USD')).toBe('USD 1,000');
    expect(formatMoney(undefined)).toBe('GHS 0');
    expect(formatMoney('not-a-number')).toBe('GHS 0');
  });
});
