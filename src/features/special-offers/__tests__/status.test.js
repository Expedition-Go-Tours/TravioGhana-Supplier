import { describe, it, expect } from 'vitest';
import { computeOfferStatus, statusIfActivated, STATUS_CONFIG } from '@/features/special-offers/utils/status';

const day = (offset) => new Date(Date.now() + offset * 24 * 60 * 60 * 1000);

describe('computeOfferStatus precedence', () => {
  it('reports a past end date as expired even when the switch is off', () => {
    expect(computeOfferStatus({ isActive: false, endDate: day(-1) })).toBe('expired');
  });

  it('reports a switched-off offer with a live window as expired', () => {
    // No `inactive` state: switched off and window spent are the same position
    // to a supplier — not earning, and not starting on its own — so both carry
    // `expired`, one filter and one stat card.
    expect(computeOfferStatus({ isActive: false, startDate: day(-1), endDate: day(1) })).toBe('expired');
  });

  it('reports a future start as scheduled only while the switch is on', () => {
    expect(computeOfferStatus({ isActive: true, startDate: day(1), endDate: day(5) })).toBe('scheduled');
    // Off, with dates still ahead: it will never go live by itself, so calling
    // it "scheduled" would promise something the switch prevents. `expired` is
    // the only non-live state left to fall to.
    expect(computeOfferStatus({ isActive: false, startDate: day(1), endDate: day(5) })).toBe('expired');
  });

  it('reports a live window as active', () => {
    expect(computeOfferStatus({ isActive: true, startDate: day(-1), endDate: day(1) })).toBe('active');
  });

  it('selects the same set of active offers as the old switch-first order', () => {
    // The dates-first ordering is only safe because `active` membership does
    // not move. activeOnly queries, tour listings and the homepage badge all
    // key off `active`, so they must be untouched by this change.
    const legacy = (o) => {
      if (!o.isActive) return 'inactive';
      if (o.startDate && new Date() < new Date(o.startDate)) return 'scheduled';
      if (o.endDate && new Date() > new Date(o.endDate)) return 'expired';
      return 'active';
    };

    const rows = [
      { isActive: true, startDate: day(-1), endDate: day(1) },
      { isActive: true, startDate: day(1), endDate: day(5) },
      { isActive: false, startDate: day(-1), endDate: day(1) },
      { isActive: false, startDate: day(-1), endDate: day(-1) },
      { isActive: true, startDate: day(-1), endDate: day(-1) },
      { isActive: true },
      { isActive: false },
    ];

    rows.forEach((o, i) => {
      expect(computeOfferStatus(o) === 'active', `row ${i}`).toBe(legacy(o) === 'active');
    });
  });
});

describe('statusIfActivated', () => {
  it('does not promise a live offer when the window has already ended', () => {
    expect(statusIfActivated({ isActive: false, endDate: day(-1) })).not.toBe('active');
  });

  it('shows active when the switch alone is holding it back', () => {
    expect(statusIfActivated({ isActive: false, startDate: day(-1), endDate: day(1) })).toBe('active');
  });
});

describe('STATUS_CONFIG', () => {
  it('labels every status the matcher can return', () => {
    ['active', 'scheduled', 'expired'].forEach((s) => {
      expect(STATUS_CONFIG[s]?.label).toBeTruthy();
      expect(STATUS_CONFIG[s]?.dot).toBeTruthy();
    });
  });

  it('has a label for every status computeOfferStatus can emit', () => {
    // The badge falls back to `expired` for an unknown key, so a genuinely new
    // state would be mislabelled silently rather than failing loudly here.
    // Sweep the date/switch matrix instead of trusting a hand-written list.
    const bools = [true, false];
    const dates = [undefined, new Date(Date.now() - 864e5), new Date(Date.now() + 864e5)];
    for (const isActive of bools) {
      for (const startDate of dates) {
        for (const endDate of dates) {
          const s = computeOfferStatus({ isActive, startDate, endDate });
          expect(STATUS_CONFIG[s], `status "${s}" has no STATUS_CONFIG entry`).toBeTruthy();
        }
      }
    }
  });
});
