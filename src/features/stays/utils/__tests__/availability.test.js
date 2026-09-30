import { describe, expect, it } from 'vitest';
import { cellStateFor } from '../availability';

const room = { id: 'r1', count: 6, price: 750 };
const today = '2026-09-30';

describe('cellStateFor', () => {
  it('marks dates before today as Past and never editable', () => {
    const state = cellStateFor(room, '2026-09-29', { 'r1|2026-09-29': { price: 900, count: 2 } }, today);
    expect(state.key).toBe('Past');
    expect(state.available).toBe(0);
  });

  it('uses the room defaults when no override exists', () => {
    const state = cellStateFor(room, '2026-10-01', {}, today);
    expect(state).toMatchObject({ key: 'Available', available: 6 });
  });

  it('marks a closed override as Blocked', () => {
    const state = cellStateFor(room, '2026-10-01', { 'r1|2026-10-01': { closed: true, count: 6 } }, today);
    expect(state.key).toBe('Blocked');
  });

  it('marks zero rooms as Full and one room as Limited', () => {
    expect(cellStateFor(room, '2026-10-01', { 'r1|2026-10-01': { count: 0 } }, today).key).toBe('Full');
    expect(cellStateFor(room, '2026-10-01', { 'r1|2026-10-01': { count: 1 } }, today).key).toBe('Limited');
    expect(cellStateFor(room, '2026-10-01', { 'r1|2026-10-01': { count: 2 } }, today).key).toBe('Available');
  });

  it('prefers the override count over the room default', () => {
    const state = cellStateFor(room, '2026-10-01', { 'r1|2026-10-01': { price: 900, count: 3 } }, today);
    expect(state).toMatchObject({ key: 'Available', available: 3 });
    expect(state.override.price).toBe(900);
  });
});
