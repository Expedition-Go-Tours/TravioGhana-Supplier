import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { fetchInvoiceByIdMock, downloadInvoicePdfMock } = vi.hoisted(() => ({
  fetchInvoiceByIdMock: vi.fn(),
  downloadInvoicePdfMock: vi.fn(),
}));

vi.mock('../../api', () => ({
  fetchInvoiceById: fetchInvoiceByIdMock,
  downloadInvoicePdf: downloadInvoicePdfMock,
}));

// Real layout, no animation: these tests assert on what the tab *says*, and
// framer-motion's enter/exit cycle would leave elements mid-transition.
// Motion-only props are stripped rather than destructured away, because
// `no-unused-vars` counts a destructured binding that is never read.
const MOTION_ONLY_PROPS = new Set([
  'initial', 'animate', 'exit', 'transition', 'layoutId', 'layout',
  'variants', 'custom', 'whileHover', 'whileTap', 'onAnimationStart',
]);

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_t, tag) => (props) => {
        const domProps = {};
        for (const [key, value] of Object.entries(props || {})) {
          if (!MOTION_ONLY_PROPS.has(key)) domProps[key] = value;
        }
        return typeof tag === 'string' ? React.createElement(tag, domProps) : null;
      },
    }
  ),
  AnimatePresence: ({ children }) => children,
}));

vi.mock('@/components/ui/dropdown-menu', () => {
  const noop = ({ children }) => children;
  return {
    DropdownMenu: ({ children }) => children,
    DropdownMenuTrigger: noop,
    DropdownMenuContent: noop,
    DropdownMenuItem: ({ children, onClick, disabled }) => (
      <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
  };
});

// jsdom has no layout, so the shared dialog hook's focus machinery is noise
// here. Keep the contract (returns refs) and skip the behaviour.
vi.mock('@/components/shared/useModalDialog', () => ({
  useModalDialog: () => ({ panelRef: { current: null }, closeRef: { current: null } }),
}));

import React from 'react';
import InvoicesTab from '../InvoicesTab';

const invoiceRow = {
  id: 'inv1',
  invoiceNumber: 'INV-2026-10-0001',
  status: 'INVOICED',
  cycle: 'TWICE_MONTHLY',
  cycleLabel: 'Oct 1–15',
  cycleStartDate: '2026-10-01T00:00:00.000Z',
  cycleEndDate: '2026-10-15T23:59:59.999Z',
  invoicedAt: '2026-10-16T00:00:00.000Z',
  paymentScheduledAt: '2026-10-20T00:00:00.000Z',
  paidAt: null,
  reference: '',
  grossTotal: 780,
  commissionTotal: 132.6,
  netTotal: 647.4,
  currency: 'USD',
  bookingCount: 4,
};

function renderTab(overrides = {}) {
  const props = {
    invoices: [invoiceRow],
    pagination: { currentPage: 1, totalPages: 1, totalCount: 1 },
    loading: false,
    error: null,
    page: 1,
    onPageChange: vi.fn(),
    onRetry: vi.fn(),
    statusFilter: '',
    onStatusFilterChange: vi.fn(),
    isEnrolled: true,
    ...overrides,
  };
  return { ...render(<InvoicesTab {...props} />), props };
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchInvoiceByIdMock.mockResolvedValue({
    ...invoiceRow,
    destination: 'Barclays ****4821',
    items: [
      {
        id: 'li1',
        bookingId: 'b1',
        grossAmount: 400,
        platformCommission: 68,
        supplierPayout: 332,
        currency: 'USD',
        booking: {
          id: 'b1',
          bookingNumber: 'GHA-1001',
          travelDate: '2026-10-03T00:00:00.000Z',
          status: 'COMPLETED',
          payoutStatus: 'INVOICED',
          tour: { id: 't1', title: 'Kakum Canopy Walk' },
        },
      },
      {
        id: 'li2',
        bookingId: 'b2',
        grossAmount: 380,
        platformCommission: 64.6,
        supplierPayout: 315.4,
        currency: 'USD',
        booking: {
          id: 'b2',
          bookingNumber: 'GHA-1002',
          travelDate: '2026-10-09T00:00:00.000Z',
          status: 'COMPLETED',
          payoutStatus: 'INVOICED',
          tour: { id: 't2', title: 'Cape Coast Castle Tour' },
        },
      },
    ],
  });
  downloadInvoicePdfMock.mockResolvedValue(new Blob(['%PDF-1.4']));
});

describe('InvoicesTab — the supplier invoice history', () => {
  it('renders the invoice number, net total and status pill', () => {
    renderTab();

    expect(screen.getByText('INV-2026-10-0001')).toBeInTheDocument();
    // The row badge, not the filter pill of the same word.
    expect(within(screen.getByRole('table')).getByText('Due')).toBeInTheDocument();
    expect(screen.getByText('$647.40')).toBeInTheDocument();
  });

  it('offers a pill for every status the endpoint can filter on', () => {
    renderTab();

    for (const label of ['All', 'Due', 'Approved', 'Paid', 'Voided']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('asks the API to filter when a pill is chosen', async () => {
    const { props } = renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'Voided' }));

    expect(props.onStatusFilterChange).toHaveBeenCalledWith('CANCELLED');
  });

  it('explains itself to a supplier who is not enrolled, instead of an empty table', () => {
    renderTab({ isEnrolled: false, invoices: [] });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/Invoices are not available on your plan/)).toBeInTheDocument();
  });

  it('names the empty filter rather than saying there are no invoices at all', () => {
    renderTab({ invoices: [], pagination: null, statusFilter: 'CANCELLED' });

    expect(screen.getByText(/No voided invoices/)).toBeInTheDocument();
    expect(screen.queryByText('No invoices yet')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filter' })).toBeInTheDocument();
  });

  it('says the history is empty when an unfiltered list has nothing in it', () => {
    renderTab({ invoices: [], pagination: null });

    expect(screen.getByText('No invoices yet')).toBeInTheDocument();
  });

  it('surfaces a load error with a retry that re-runs the fetch', async () => {
    const { props } = renderTab({ invoices: [], error: 'Failed to load finance data' });

    expect(screen.getByText('Failed to load finance data')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it('shows the skeleton rather than the empty state while loading', () => {
    const { container } = renderTab({ loading: true, invoices: [] });

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    expect(screen.queryByText('No invoices yet')).not.toBeInTheDocument();
  });

  it('renders no pager when everything fits on one page', () => {
    renderTab({ pagination: { currentPage: 1, totalPages: 1, totalCount: 1 } });

    expect(screen.queryByRole('button', { name: /Previous/ })).not.toBeInTheDocument();
  });

  it('offers a pager when there is a second page, and calls back', async () => {
    const { props } = renderTab({ pagination: { currentPage: 1, totalPages: 3, totalCount: 41 } });

    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('InvoicesTab — the row menu', () => {
  it('offers detail, PDF and booking-list actions for each invoice', async () => {
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'Actions for INV-2026-10-0001' }));

    expect(screen.getByRole('button', { name: /View details/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download PDF/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download booking list/ })).toBeInTheDocument();
  });

  it('downloads the PDF under the invoice number', async () => {
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'Actions for INV-2026-10-0001' }));
    await userEvent.click(screen.getByRole('button', { name: /Download PDF/ }));

    await waitFor(() =>
      expect(downloadInvoicePdfMock).toHaveBeenCalledWith('inv1', 'INV-2026-10-0001')
    );
  });
});

describe('InvoicesTab — the detail drawer', () => {
  it('opens on the invoice number and lists its bookings with the destination', async () => {
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'INV-2026-10-0001' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(fetchInvoiceByIdMock).toHaveBeenCalledWith('inv1'));

    expect(await screen.findByText('GHA-1001')).toBeInTheDocument();
    expect(screen.getByText('GHA-1002')).toBeInTheDocument();
    // The tour title shares its line with the activity date, so match on the
    // title alone rather than the whole text node.
    expect(screen.getByText(/Kakum Canopy Walk/)).toBeInTheDocument();
    // Masked destination only — never the full account.
    expect(screen.getByText('Barclays ****4821')).toBeInTheDocument();
  });

  it('shows a retry when the detail fetch fails', async () => {
    fetchInvoiceByIdMock.mockRejectedValue({ response: { data: { message: 'Invoice not found' } } });
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'INV-2026-10-0001' }));

    expect(await screen.findByText('Invoice not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('enables the booking-list download once the items are known', async () => {
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'INV-2026-10-0001' }));
    const dialog = await screen.findByRole('dialog');

    // The mocked detail fetch resolves immediately, so assert the settled
    // state rather than racing the intermediate one.
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: /Booking list/ })).toBeEnabled()
    );
  });

  it('keeps the booking-list download disabled when the invoice has no line items', async () => {
    fetchInvoiceByIdMock.mockResolvedValue({ ...invoiceRow, items: [] });
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'INV-2026-10-0001' }));
    const dialog = await screen.findByRole('dialog');

    await waitFor(() => expect(fetchInvoiceByIdMock).toHaveBeenCalled());
    expect(within(dialog).getByRole('button', { name: /Booking list/ })).toBeDisabled();
  });
});
