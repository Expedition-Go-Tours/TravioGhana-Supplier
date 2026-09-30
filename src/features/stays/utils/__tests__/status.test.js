import { describe, expect, it } from 'vitest';
import { statusTone, BOOKING_STATUSES, PROPERTY_STATUSES } from '../status';

describe('statusTone', () => {
  it("mirrors the prototype's tone mapping", () => {
    expect(statusTone('Draft')).toBe('amber');
    expect(statusTone('Under review')).toBe('amber');
    expect(statusTone('New')).toBe('amber');
    expect(statusTone('Paused')).toBe('amber');
    expect(statusTone('Cancelled')).toBe('red');
    expect(statusTone('No-show')).toBe('red');
    expect(statusTone('Confirmed')).toBe('blue');
    expect(statusTone('Checked in')).toBe('blue');
    expect(statusTone('Live')).toBe('green');
    expect(statusTone('Completed')).toBe('green');
    expect(statusTone(undefined)).toBe('green');
  });
});

describe('status vocabularies', () => {
  it("offers the prototype's booking statuses in order", () => {
    expect(BOOKING_STATUSES).toEqual([
      'New', 'Confirmed', 'Checked in', 'Completed', 'Cancelled', 'No-show',
    ]);
  });

  it('offers All + property statuses for the list filter', () => {
    expect(PROPERTY_STATUSES).toEqual(['All', 'Live', 'Under review', 'Draft', 'Paused']);
  });
});
