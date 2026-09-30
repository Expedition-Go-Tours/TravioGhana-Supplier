import { describe, expect, it, beforeEach } from 'vitest';
import { staysMock } from '../store';

/**
 * The mock store stands in for the property API while it is being built, so
 * these tests pin the behaviour the pages rely on: the dashboard aggregates,
 * the derived rate-plan price, the availability override map, and the
 * "never delete the last rate plan" rule.
 */
beforeEach(() => staysMock.reset());

describe('dashboard aggregates', () => {
  it('reproduces the prototype numbers for the reference dataset', async () => {
    const data = await staysMock.getDashboard();
    expect(data.stats).toEqual({
      upcomingArrivals: 3,
      newReservations: 1,
      liveProperties: 1,
      grossBookingValue: 6950,
    });
    expect(data.cancellation).toEqual({ rate: 0, cancelled: 0, total: 3 });
    expect(data.actionRequired).toEqual({
      messagesAwaitingReply: 2,
      bookingsToReview: 1,
      draftProperties: 0,
    });
    expect(data.recentBookings[0]).toMatchObject({
      id: 'TG-S-20493',
      guest: 'Sarah Johnson',
      propertyName: 'Akwaaba Coast Hotel',
    });
    expect(data.topProperties[0]).toMatchObject({
      name: 'Akwaaba Coast Hotel',
      bookings: 3,
      roomTypes: 1,
      revenue: 6950,
    });
  });
});

describe('properties', () => {
  it('filters by status and search text', async () => {
    expect(await staysMock.listProperties()).toHaveLength(1);
    expect(await staysMock.listProperties({ status: 'Draft' })).toHaveLength(0);
    expect(await staysMock.listProperties({ query: 'akwaaba' })).toHaveLength(1);
    expect(await staysMock.listProperties({ query: 'nothing-matches' })).toHaveLength(0);
  });

  it('creates a draft with the builder defaults', async () => {
    const created = await staysMock.createProperty();
    expect(created.status).toBe('Draft');
    expect(created.step).toBe(0);
    expect(created.rooms).toEqual([]);
    const draft = await staysMock.listProperties({ status: 'Draft' });
    expect(draft.map((p) => p.id)).toContain(created.id);
  });

  it('submits a property for review', async () => {
    const created = await staysMock.createProperty();
    const submitted = await staysMock.submitProperty(created.id);
    expect(submitted).toMatchObject({ status: 'Under review', step: 10 });
  });

  it('deletes a property together with its bookings', async () => {
    await staysMock.deleteProperty('p1');
    expect(await staysMock.listProperties()).toHaveLength(0);
    expect(await staysMock.listBookings()).toHaveLength(0);
  });
});

describe('rooms and rate plans', () => {
  it('gives a new room its default Standard rate plan', async () => {
    const created = await staysMock.createProperty();
    const property = await staysMock.saveRoom(created.id, {
      kind: 'Double Room',
      name: 'Garden Double',
      count: 4,
      adults: 2,
      children: 0,
      beds: '1 double bed',
      size: 24,
      price: 520,
      weekend: 600,
      bathroom: 'Private',
    });
    expect(property.rooms).toHaveLength(1);
    expect(property.ratePlans).toHaveLength(1);
    expect(property.ratePlans[0]).toMatchObject({
      roomId: property.rooms[0].id,
      name: 'Standard rate',
      price: 520,
      weekend: 600,
    });
  });

  it("keeps the reference plan's weekend price derived from the room when skipped", async () => {
    const property = await staysMock.getProperty('p1');
    expect(property.ratePlans[0]).toMatchObject({ price: 750, weekend: 850 });
  });

  it('refuses to delete the last rate plan of a room', async () => {
    const property = await staysMock.getProperty('p1');
    await expect(staysMock.deleteRatePlan('p1', property.ratePlans[0].id)).rejects.toThrow(
      'Keep at least one rate plan for this room',
    );
  });
});

describe('availability overrides', () => {
  it('stores a cell and returns it inside the requested range', async () => {
    await staysMock.setAvailabilityCell('p1', {
      roomId: 'r1',
      date: '2026-10-04',
      values: { price: 900, count: 2, closed: false, minStay: 2 },
    });
    const { overrides } = await staysMock.getAvailability('p1', {
      from: '2026-10-01',
      to: '2026-10-07',
    });
    expect(overrides['r1|2026-10-04']).toEqual({ price: 900, count: 2, closed: false, minStay: 2 });

    const outside = await staysMock.getAvailability('p1', {
      from: '2026-11-01',
      to: '2026-11-07',
    });
    expect(outside.overrides).toEqual({});
  });

  it('clears a cell so the room defaults apply again', async () => {
    await staysMock.setAvailabilityCell('p1', {
      roomId: 'r1',
      date: '2026-10-04',
      values: { price: 900, count: 2, closed: false, minStay: 2 },
    });
    await staysMock.clearAvailabilityCell('p1', { roomId: 'r1', date: '2026-10-04' });
    const { overrides } = await staysMock.getAvailability('p1', {
      from: '2026-10-01',
      to: '2026-10-07',
    });
    expect(overrides['r1|2026-10-04']).toBeUndefined();
  });
});

describe('bookings', () => {
  it('filters by status and joins the property name', async () => {
    const all = await staysMock.listBookings();
    expect(all).toHaveLength(3);
    const newOnly = await staysMock.listBookings({ status: 'New' });
    expect(newOnly).toHaveLength(1);
    expect(newOnly[0].propertyName).toBe('Akwaaba Coast Hotel');
  });

  it('updates a booking status', async () => {
    const updated = await staysMock.updateBookingStatus('TG-S-20494', 'Confirmed');
    expect(updated.status).toBe('Confirmed');
    expect(await staysMock.listBookings({ status: 'New' })).toHaveLength(0);
  });
});
