import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import Step2Details from '@/features/special-offers/components/Step2Details';
import { useSpecialOfferBuilderStore } from '@/features/special-offers/stores/specialOfferBuilderStore';

function resetStore(offerOverrides = {}) {
  localStorage.clear();
  useSpecialOfferBuilderStore.getState().reset();
  if (Object.keys(offerOverrides).length) {
    useSpecialOfferBuilderStore.getState().updateOffer(offerOverrides);
  }
}

function inWindow() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { startDate: yesterday.toISOString(), endDate: tomorrow.toISOString() };
}

function endedLastWeek() {
  const start = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

describe('Step2Details status control', () => {
  beforeEach(() => resetStore());

  it('reports a switched-off offer as Expired even inside its window', () => {
    // There is no separate "Inactive" badge any more: switched off and window
    // spent are one state. The amber note asserted further down is what still
    // tells the supplier that the window is fine and the switch is the fix.
    resetStore({ isActive: false, ...inWindow() });
    render(<Step2Details />);

    expect(screen.getByTestId('offer-status-badge')).toHaveTextContent('Expired');
  });

  it('reports an expired window as Expired even while switched on', () => {
    resetStore({ isActive: true, ...endedLastWeek() });
    render(<Step2Details />);

    expect(screen.getByTestId('offer-status-badge')).toHaveTextContent('Expired');
  });

  it('flips the badge when the switch is toggled', () => {
    // This is the case the backend's nightly expiry job creates: the dates are
    // perfectly valid, but `isActive` was forced off.
    resetStore({ isActive: false, ...inWindow() });
    render(<Step2Details />);

    const toggle = screen.getByRole('switch', { name: /offer status/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('offer-status-badge')).toHaveTextContent('Active');
  });

  it('explains that a current window is being held back by the off switch', () => {
    resetStore({ isActive: false, ...inWindow() });
    render(<Step2Details />);

    expect(screen.getByText(/Your offer period is current/i)).toBeInTheDocument();
  });

  it('reports a past window as Expired even while switched off', () => {
    // Dates outrank the switch, and now that "switched off" is folded into
    // Expired the two cases share a badge. What must stay distinct is the
    // remedy: a window that has run out needs new dates, so the amber
    // "period is current" note must NOT appear — and, because the backend's
    // nightly job forces isActive off, checking the switch first would still
    // leave a genuinely dead offer looking merely switched off.
    resetStore({ isActive: false, ...endedLastWeek() });
    render(<Step2Details />);

    expect(screen.queryByText(/Your offer period is current/i)).toBeNull();
    expect(screen.getByTestId('offer-status-badge')).toHaveTextContent('Expired');
  });

  it('persists the switch into the store payload', () => {
    resetStore({ isActive: false, ...inWindow() });
    render(<Step2Details />);

    fireEvent.click(screen.getByRole('switch', { name: /offer status/i }));

    expect(useSpecialOfferBuilderStore.getState().offer.isActive).toBe(true);
  });
});
