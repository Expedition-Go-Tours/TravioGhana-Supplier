/**
 * The Finance page's tax summary.
 *
 * Three ways a tax record can mislead, each with a test here:
 *  1. it sums two currencies into one figure (GH₵200 and $200 are two records,
 *     not $400);
 *  2. it reads "no tax" out of a failed fetch;
 *  3. it looks like a filed return rather than a record of what was charged.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fetchTaxSummary = vi.fn();

vi.mock('../api', () => ({
  fetchTaxSummary: (...args) => fetchTaxSummary(...args),
}));

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('sonner', () => ({ toast }));

import TaxSummaryTab from '../components/TaxSummaryTab';

const SUMMARY = {
  from: '2025-11-01',
  to: '2026-10-21',
  rows: [
    { month: '2026-09', currency: 'GHS', bookings: 1, gross: 2000, tax: 200, net: 1800 },
    { month: '2026-10', currency: 'USD', bookings: 2, gross: 600, tax: 30, net: 570 },
    { month: '2026-10', currency: 'GHS', bookings: 1, gross: 1000, tax: 100, net: 900 },
  ],
  totalsByCurrency: [
    { currency: 'GHS', bookings: 2, gross: 3000, tax: 300, net: 2700 },
    { currency: 'USD', bookings: 2, gross: 600, tax: 30, net: 570 },
  ],
  disclaimer:
    'A record of the tax charged on your paid bookings in this period. It is not tax advice and not a filed return.',
  truncated: false,
};

beforeEach(() => {
  fetchTaxSummary.mockReset().mockResolvedValue(SUMMARY);
  toast.success.mockReset();
  toast.error.mockReset();
});

afterEach(() => {
  cleanup();
  URL.createObjectURL = undefined;
  URL.revokeObjectURL = undefined;
});

describe('money that spans currencies', () => {
  it('shows one total per currency and never a combined figure', async () => {
    render(<TaxSummaryTab />);

    // The label is "Tax charged · GHS" with the currency in its own span, so
    // match on the paragraph's full text.
    const labelFor = (currency) =>
      screen.getByText(
        (_, node) =>
          node?.tagName === 'P' && node.textContent === `Tax charged · ${currency}`,
      );

    await waitFor(() => {
      expect(labelFor('GHS')).toBeInTheDocument();
    });
    expect(labelFor('USD')).toBeInTheDocument();
    // 300 + 30 = 330 must NOT appear anywhere as a tax total.
    expect(screen.queryByText(/\$330|330\.00/)).toBeNull();
  });

  it('keeps each currency’s months under its own heading', async () => {
    render(<TaxSummaryTab />);

    await waitFor(() => {
      expect(screen.getAllByText('2026-10').length).toBe(2);
    });
    // One GHS section and one USD section.
    expect(screen.getByText('GHS', { selector: 'p.text-xs.font-semibold' })).toBeInTheDocument();
    expect(screen.getByText('USD', { selector: 'p.text-xs.font-semibold' })).toBeInTheDocument();
  });
});

describe('failure and empty states', () => {
  it('says it could not load rather than showing a zero record', async () => {
    fetchTaxSummary.mockRejectedValue(new Error('gateway down'));

    render(<TaxSummaryTab />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load the tax summary/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('No paid bookings in this period')).toBeNull();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('distinguishes "nothing was charged" from "we do not know"', async () => {
    fetchTaxSummary.mockResolvedValue({
      ...SUMMARY,
      rows: [],
      totalsByCurrency: [],
    });

    render(<TaxSummaryTab />);

    await waitFor(() => {
      expect(screen.getByText(/no paid bookings in this period/i)).toBeInTheDocument();
    });
  });
});

describe('what the record claims to be', () => {
  it('carries the disclaimer that it is not a filed return', async () => {
    render(<TaxSummaryTab />);

    await waitFor(() => {
      expect(screen.getByText(/not tax advice/i)).toBeInTheDocument();
    });
  });

  it('exports a CSV of exactly these rows, with the disclaimer attached', async () => {
    const createObjectURL = vi.fn(() => 'blob:tax');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    render(<TaxSummaryTab />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export csv/i })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole('button', { name: /export csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toContain('Month,Currency,Bookings,Gross,Tax charged,Net of tax');
    expect(text).toContain('2026-10,GHS,1,1000.00,100.00,900.00');
    expect(text).toContain('not tax advice');
    expect(toast.success).toHaveBeenCalled();
  });

  it('asks for a window rather than fetching everything', async () => {
    render(<TaxSummaryTab />);
    await waitFor(() => expect(fetchTaxSummary).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: /this year/i }));
    await waitFor(() => expect(fetchTaxSummary).toHaveBeenCalledTimes(2));
    expect(fetchTaxSummary.mock.calls[1][0]).toHaveProperty('from');
  });
});
