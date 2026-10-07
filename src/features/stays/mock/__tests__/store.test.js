import { describe, expect, it, beforeEach, vi } from 'vitest';
import { staysMock, STAYS_MOCK_STORAGE_KEY } from '../store';
import { STAYS_BUILDER_STEP_COUNT } from '@/features/stays/config/staysSteps';

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
      upcomingArrivals: 4,
      newReservations: 1,
      liveProperties: 1,
      grossBookingValue: 7650,
    });
    expect(data.cancellation).toEqual({ rate: 42.9, cancelled: 3, total: 7 });
    expect(data.actionRequired).toEqual({
      messagesAwaitingReply: 3,
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
      bookings: 7,
      roomTypes: 1,
      revenue: 7650,
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
    expect(submitted).toMatchObject({ status: 'Under review', step: STAYS_BUILDER_STEP_COUNT });
  });

  it('deletes a property together with its bookings', async () => {
    await staysMock.deleteProperty('p1');
    expect(await staysMock.listProperties()).toHaveLength(0);
    expect(await staysMock.listBookings()).toHaveLength(0);
  });
});

describe('rate plans', () => {
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
    expect(all).toHaveLength(7);
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

describe('draft persistence', () => {
  it('keeps a created draft through a reload', async () => {
    const created = await staysMock.createProperty({ name: 'Persisted Draft', city: 'Accra' });

    staysMock.reload();

    const reloaded = await staysMock.getProperty(created.id);
    expect(reloaded).toMatchObject({ name: 'Persisted Draft', city: 'Accra', status: 'Draft' });
  });

  it('keeps edits to a reference property through a reload', async () => {
    await staysMock.updateProperty('p1', { name: 'Renamed Hotel', step: 4 });

    staysMock.reload();

    const reloaded = await staysMock.getProperty('p1');
    expect(reloaded).toMatchObject({ name: 'Renamed Hotel', step: 4 });
  });

  it('restores the reference dataset on reset, stored copy included', async () => {
    await staysMock.updateProperty('p1', { name: 'Scratch' });

    staysMock.reset();
    staysMock.reload();

    const reloaded = await staysMock.getProperty('p1');
    expect(reloaded.name).toBe('Akwaaba Coast Hotel');
  });

  it('falls back to the seed when the stored payload is corrupt', async () => {
    localStorage.setItem(STAYS_MOCK_STORAGE_KEY, '{not-json');

    staysMock.reload();

    const properties = await staysMock.listProperties();
    expect(properties.map((p) => p.id)).toContain('p1');
  });

  it('falls back to the seed for an older storage version', async () => {
    localStorage.setItem(
      STAYS_MOCK_STORAGE_KEY,
      JSON.stringify({ version: 0, db: { properties: [], bookings: [] } }),
    );

    staysMock.reload();

    const properties = await staysMock.listProperties();
    expect(properties.map((p) => p.id)).toContain('p1');
  });

  it('keeps draft fields (drops photo payloads) when storage is full', async () => {
    const created = await staysMock.createProperty({ name: 'Quota Draft' });

    const original = Storage.prototype.setItem;
    let calls = 0;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      calls += 1;
      // Fail the first (full) write so persist() retries without the photos.
      if (calls === 1) throw new DOMException('quota', 'QuotaExceededError');
      return original.call(this, key, value);
    });

    try {
      await staysMock.addPhotos(created.id, ['data:image/png;base64,AAAA']);

      staysMock.reload();

      const reloaded = await staysMock.getProperty(created.id);
      expect(reloaded.name).toBe('Quota Draft');
      expect(reloaded.photos).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
