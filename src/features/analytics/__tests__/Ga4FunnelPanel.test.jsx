/**
 * The GA4 funnel panel.
 *
 * The states must stay distinct, because this panel is the only place a
 * supplier can see "people looked at my product and did not buy" — and a
 * rendering bug there turns a measurement into a claim:
 *   not configured  → an explanation, NEVER a table of zeros
 *   request failed  → an error with Retry, never an empty funnel
 *   no activity     → an explicit "measured zero", with the dates
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fetchGa4Funnel = vi.fn();

vi.mock('../api', () => ({
  fetchGa4Funnel: (...args) => fetchGa4Funnel(...args),
}));

import Ga4FunnelPanel from '../components/Ga4FunnelPanel';

const ROWS = [
  {
    itemId: 'tour-1',
    itemName: 'Accra Guided City Tour: Cultural and Historical Experience',
    itemsViewed: 120,
    itemsAddedToCart: 9,
    itemsPurchased: 1,
    itemRevenue: 70,
    itemRevenueSharePct: 11.08,
    itemsPurchasedSharePct: 16.67,
  },
  {
    itemId: 'tour-2',
    itemName: 'From Accra : Waterfalls, Aburi Gardens & Cocoa Farm Tour',
    itemsViewed: 60,
    itemsAddedToCart: 4,
    itemsPurchased: 2,
    itemRevenue: 320,
    itemRevenueSharePct: 50.63,
    itemsPurchasedSharePct: 33.33,
  },
];

const SUMMARY = {
  enabled: true,
  from: '2026-09-22',
  to: '2026-10-22',
  rows: ROWS,
  totals: { itemsViewed: 180, itemsAddedToCart: 13, itemsPurchased: 3, itemRevenue: 390 },
  excludedCount: 1,
};

beforeEach(() => {
  fetchGa4Funnel.mockReset().mockResolvedValue(SUMMARY);
});

afterEach(() => {
  cleanup();
});

describe('when this server cannot see GA4', () => {
  it('says so instead of rendering a table of zeros', async () => {
    fetchGa4Funnel.mockResolvedValue({
      enabled: false,
      from: '2026-09-22',
      to: '2026-10-22',
      rows: [],
      totals: { itemsViewed: 0, itemsAddedToCart: 0, itemsPurchased: 0, itemRevenue: 0 },
      reason: 'GA4 reporting is not configured on this server.',
    });

    render(<Ga4FunnelPanel />);

    await waitFor(() => {
      expect(screen.getByText(/not connected to google analytics yet/i)).toBeInTheDocument();
    });
    // The exact misreading this guards against: zeros that read as "nobody
    // looked at my products".
    expect(screen.queryByText('Total')).toBeNull();
    expect(screen.queryByText('No product activity in this period')).toBeNull();
    expect(screen.getByText(/not configured on this server/i)).toBeInTheDocument();
  });
});

describe('when the request fails', () => {
  it('shows an error with Retry — never an empty funnel', async () => {
    fetchGa4Funnel.mockRejectedValue({ response: { data: { message: 'Could not load the GA4 funnel: quota exceeded' } } });

    render(<Ga4FunnelPanel />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load the storefront funnel/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('Total')).toBeNull();

    fetchGa4Funnel.mockResolvedValue(SUMMARY);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => {
      expect(screen.getByText(/Accra Guided City Tour/)).toBeInTheDocument();
    });
  });
});

describe('when GA4 has data', () => {
  it('shows each product down the funnel with its shares and a totals row', async () => {
    render(<Ga4FunnelPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Accra Guided City Tour/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Waterfalls, Aburi Gardens/)).toBeInTheDocument();

    // Purchased carries its share of the supplier's own totals.
    expect(screen.getByText('1 (16.67%)')).toBeInTheDocument();
    expect(screen.getByText('2 (33.33%)')).toBeInTheDocument();
    // Revenue likewise, in the supplier's currency.
    expect(screen.getByText(/70\.00/)).toBeInTheDocument();
    expect(screen.getByText(/320\.00/)).toBeInTheDocument();

    // Totals agree with the rows: 120+60 viewed, 1+2 purchased, 70+320 revenue.
    const totalsRow = screen.getByText('Total').closest('tr');
    expect(totalsRow.textContent).toContain('180');
    expect(totalsRow.textContent).toContain('3');
    expect(totalsRow.textContent).toContain('390');
  });

  it('does not invent a share percentage for the count columns', async () => {
    render(<Ga4FunnelPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Accra Guided City Tour/)).toBeInTheDocument();
    });
    // Views and carts are counts only (GA4 prints "–" there too). A "0.00%"
    // next to a real count would read as a conversion rate nobody measured.
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.queryByText('120 (0.00%)')).toBeNull();
  });

  it('says how many products were hidden — hidden must not look like nothing', async () => {
    render(<Ga4FunnelPanel />);

    await waitFor(() => {
      expect(screen.getByText(/1 product on the property were hidden/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/from google analytics for 2026-09-22/i)).toBeInTheDocument();
  });
});

describe('when GA4 measured nothing', () => {
  it('says so explicitly, with the window, rather than showing an empty table', async () => {
    fetchGa4Funnel.mockResolvedValue({
      enabled: true,
      from: '2026-09-22',
      to: '2026-10-22',
      rows: [],
      totals: { itemsViewed: 0, itemsAddedToCart: 0, itemsPurchased: 0, itemRevenue: 0 },
      excludedCount: 0,
    });

    render(<Ga4FunnelPanel />);

    await waitFor(() => {
      expect(screen.getByText(/no product activity in this period/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Total')).toBeNull();
    // Not the "not connected" state: the measurement happened, it is empty.
    expect(screen.queryByText(/not connected to google analytics/i)).toBeNull();
  });
});
