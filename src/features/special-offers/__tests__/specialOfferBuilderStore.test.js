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
