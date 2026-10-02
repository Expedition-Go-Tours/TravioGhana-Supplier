import { describe, it, expect, beforeEach } from 'vitest';
import { useSpecialOfferBuilderStore } from '@/features/special-offers/stores/specialOfferBuilderStore';

function loadOffer(offer) {
  useSpecialOfferBuilderStore.getState().loadOffer(offer);
  return useSpecialOfferBuilderStore.getState().offer;
}

describe('specialOfferBuilderStore.loadOffer', () => {
  beforeEach(() => {
    localStorage.clear();
    useSpecialOfferBuilderStore.getState().reset();
  });

  it('keeps every photo when the tour has a photos array', () => {
    const offer = loadOffer({
      id: 'o-1',
      name: 'Sale',
      targets: [
        {
          tourId: 'tour-1',
          tour: { id: 'tour-1', title: 'Safari', photos: ['a.jpg', 'b.jpg', 'c.jpg'], coverPhoto: 'cover.jpg' },
        },
      ],
    });

    expect(offer.targets[0].tourPhotos).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  // Regression: `photos || coverPhoto ? [coverPhoto] : []` parsed as
  // `(photos || coverPhoto) ? [coverPhoto] : []`, so a tour WITH photos threw
  // them all away and rendered only the cover — or nothing at all.
  it('falls back to the cover photo when the tour has no photos array', () => {
    const offer = loadOffer({
      id: 'o-1',
      name: 'Sale',
      targets: [{ tourId: 'tour-1', tour: { id: 'tour-1', title: 'Safari', photos: [], coverPhoto: 'cover.jpg' } }],
    });

    expect(offer.targets[0].tourPhotos).toEqual(['cover.jpg']);
  });

  it('leaves the photo list empty when the tour has neither', () => {
    const offer = loadOffer({
      id: 'o-1',
      name: 'Sale',
      targets: [{ tourId: 'tour-1', tour: { id: 'tour-1', title: 'Safari', photos: [] } }],
    });

    expect(offer.targets[0].tourPhotos).toEqual([]);
  });

  // The nightly expiry job writes `isActive: false`; the builder has no way to
  // invent a different value, so whatever is loaded is what gets sent back on
  // save. The Status switch in Step 2 is the only thing that can change it.
  it('round-trips a deactivated offer as deactivated', () => {
    const offer = loadOffer({ id: 'o-1', name: 'Sale', isActive: false, targets: [] });
    expect(offer.isActive).toBe(false);

    const offerOn = loadOffer({ id: 'o-1', name: 'Sale', isActive: true, targets: [] });
    expect(offerOn.isActive).toBe(true);
  });

  it('maps a missing isActive to true so legacy rows stay on', () => {
    expect(loadOffer({ id: 'o-1', name: 'Sale', targets: [] }).isActive).toBe(true);
  });
});

describe('specialOfferBuilderStore validation', () => {
  beforeEach(() => {
    localStorage.clear();
    useSpecialOfferBuilderStore.getState().reset();
  });

  const state = () => useSpecialOfferBuilderStore.getState();

  /** A draft that passes every step, so a test can break exactly one thing. */
  function makeValidOffer() {
    state().updateOffer({
      name: 'Summer Sale',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      targets: [{ tourId: 'tour-1' }],
      timeSlotMode: 'ALL_DAYS',
      specificWeekdays: [],
      discountType: 'PERCENTAGE',
      discountPercentage: 10,
      capacityType: 'UNLIMITED',
    });
  }

  it('accepts a draft where all three steps are valid', () => {
    makeValidOffer();

    expect(state().validateAll()).toEqual({ ok: true, firstInvalid: -1 });
    expect(state().errors).toEqual({});
  });

  it('requires at least one weekday when the offer is limited to specific days', () => {
    makeValidOffer();
    state().updateOffer({ timeSlotMode: 'SPECIFIC_WEEKDAYS', specificWeekdays: [] });

    // Matches the backend's 400: with no days selected the offer matches no
    // date at all, so it would advertise a discount nobody can ever claim.
    expect(state().validateStep(1)).toBe(false);
    expect(state().errors.specificWeekdays).toMatch(/weekday/i);

    state().updateOffer({ specificWeekdays: ['monday'] });
    expect(state().validateStep(1)).toBe(true);
  });

  it('accepts All Days with an empty weekday list', () => {
    makeValidOffer();
    state().updateOffer({ timeSlotMode: 'ALL_DAYS', specificWeekdays: [] });

    expect(state().validateAll().ok).toBe(true);
  });

  it('rejects a name longer than the 60 characters the input advertises', () => {
    makeValidOffer();
    state().updateOffer({ name: 'x'.repeat(61) });

    expect(state().validateStep(1)).toBe(false);
    expect(state().errors.name).toMatch(/60/);
  });

  // `STEPS.every` used to stop at the first failure while each validateStep
  // call REPLACED `errors`, so a save reported one step's problems and never
  // said which step it was.
  it('points at the first step that failed', () => {
    makeValidOffer();
    state().updateOffer({ targets: [] });

    const result = state().validateAll();

    expect(result).toEqual({ ok: false, firstInvalid: 0 });
    expect(state().errors.targets).toBe('Select at least one product');
  });

  it('reports the earliest failure even when later steps are also broken', () => {
    makeValidOffer();
    state().updateOffer({
      targets: [],
      discountPercentage: 0,
      endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const { ok, firstInvalid } = state().validateAll();

    expect(ok).toBe(false);
    expect(firstInvalid).toBe(0);
    // Errors from every failing step survive together instead of the last
    // call winning.
    expect(state().errors.targets).toBeDefined();
    expect(state().errors.discountPercentage).toBeDefined();
    expect(state().errors.endDate).toBeDefined();
  });
});
