/**
 * The finance API's shape contract with the backend.
 *
 * These exist because `fetchInvoiceById` was written against an assumed shape
 * and shipped one field wrong: the server sends `destination` as an OBJECT
 * ({ type, label, accountName, maskedDetail }), not a string. Rendering that
 * straight into JSX throws "Objects are not valid as a React child", which
 * would have blanked the invoice drawer the moment a real invoice was opened.
 *
 * The fixtures below are copied from the live production payload, so they
 * drift only if the backend does.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();

vi.mock('@/lib/axios', () => ({
  default: { get: (...args) => getMock(...args) },
}));

import { fetchInvoiceById, downloadInvoicePdf } from '../api';

/** Real `GET /finance/invoices/:id` payload, trimmed to the fields the UI reads. */
const REAL_DETAIL_PAYLOAD = {
  data: {
    status: 'success',
    data: {
      invoice: {
        id: 'cmva8mli500mjf31o9tlkydy4',
        invoiceNumber: 'INV-20261016-015516cm7h',
        status: 'INVOICED',
        cycle: 'TWICE_MONTHLY',
        cycleLabel: 'Oct 1–15',
        cycleStartDate: '2026-10-01T00:00:00.000Z',
        cycleEndDate: '2026-10-15T23:59:59.999Z',
        invoicedAt: '2026-10-16T01:55:16.000Z',
        paymentScheduledAt: '2026-10-20T00:00:00.000Z',
        approvedAt: null,
        paidAt: null,
        reference: null,
        grossTotal: '2045.00',
        commissionTotal: '306.75',
        netTotal: '1738.25',
        currency: 'USD',
        bookingCount: 14,
        // The object that blanked the drawer when passed straight to JSX.
        destination: {
          type: 'PAYPAL',
          label: 'PayPal',
          accountName: null,
          maskedDetail: 'st•••••••••••@gmail.com',
        },
        supplier: {
          id: 'cmpcxwl3k0000caylg0jcp879',
          name: 'Expedition-Go Tours LTD',
          email: 'expeditiongotravelandtoursltd@gmail.com',
          address: null,
          city: null,
          country: null,
        },
        items: [
          {
            id: 'li1',
            bookingId: 'b1',
            grossAmount: '150.00',
            platformCommission: '22.50',
            supplierPayout: '127.50',
            currency: 'USD',
            booking: {
              id: 'b1',
              bookingNumber: 'TRG-07915925-2026-07',
              travelDate: '2026-10-03T00:00:00.000Z',
              selectedTime: '08:00',
              status: 'COMPLETED',
              paymentStatus: 'PAID',
              payoutStatus: 'INVOICED',
              grossAmount: '150.00',
              supplierPayout: '127.50',
              platformCommission: '22.50',
              tour: {
                id: 't1',
                title: 'Cape Coast Castle, Elmina Castle & Kakum National Park Tour',
                imageCover: 'https://cdn.example.com/cover.jpg',
              },
            },
          },
        ],
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchInvoiceById', () => {
  it('flattens the destination object into one display string', async () => {
    getMock.mockResolvedValue(REAL_DETAIL_PAYLOAD);

    const invoice = await fetchInvoiceById('cmva8mli500mjf31o9tlkydy4');

    // Must be a string: JSX cannot render an object child.
    expect(typeof invoice.destination).toBe('string');
    expect(invoice.destination).toBe('PayPal · st•••••••••••@gmail.com');
  });

  it('never leaks an unmasked account through the destination string', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          invoice: {
            ...REAL_DETAIL_PAYLOAD.data.data.invoice,
            destination: {
              type: 'BANK_TRANSFER',
              label: 'Bank transfer · Barclays',
              accountName: 'Expedition-Go Tours LTD',
              maskedDetail: 'account ••••4821 · SWIFT ••••GH',
            },
          },
        },
      },
    });

    const invoice = await fetchInvoiceById('inv1');

    expect(invoice.destination).toBe(
      'Bank transfer · Barclays · Expedition-Go Tours LTD · account ••••4821 · SWIFT ••••GH'
    );
    // The masking must survive the trip through the API layer: at most the
    // 4-digit tail that maskTail deliberately leaves visible, never a whole
    // account or card number.
    expect(invoice.destination).toContain('••••');
    const digitRuns = invoice.destination.match(/\d+/g) || [];
    expect(digitRuns.every((run) => run.length <= 4)).toBe(true);
  });

  it('returns an empty string rather than "undefined" when there is no destination', async () => {
    getMock.mockResolvedValue({
      data: { data: { invoice: { ...REAL_DETAIL_PAYLOAD.data.data.invoice, destination: null } } },
    });

    const invoice = await fetchInvoiceById('inv1');

    expect(invoice.destination).toBe('');
  });

  it('keeps the tour title and drops the image field the schema lacks', async () => {
    getMock.mockResolvedValue(REAL_DETAIL_PAYLOAD);

    const invoice = await fetchInvoiceById('inv1');

    expect(invoice.items[0].booking.tour.title).toMatch(/Cape Coast Castle/);
    expect(invoice.items[0].booking.tour).not.toHaveProperty('imageCover');
  });

  it('coerces money strings to numbers so the UI can sum them', async () => {
    getMock.mockResolvedValue(REAL_DETAIL_PAYLOAD);

    const invoice = await fetchInvoiceById('inv1');

    expect(invoice.netTotal).toBe(1738.25);
    expect(invoice.items[0].supplierPayout).toBe(127.5);
  });

  it('requests the supplier-scoped route', async () => {
    getMock.mockResolvedValue(REAL_DETAIL_PAYLOAD);

    await fetchInvoiceById('inv1');

    expect(getMock).toHaveBeenCalledWith('/finance/invoices/inv1', { skipGlobalErrorHandler: true });
  });

  it('returns null when the payload carries no invoice', async () => {
    getMock.mockResolvedValue({ data: { data: {} } });

    await expect(fetchInvoiceById('missing')).resolves.toBeNull();
  });
});

describe('downloadInvoicePdf', () => {
  it('saves the PDF under the invoice number and requests the pdf route', async () => {
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:invoice');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const anchor = { href: '', download: '', click };
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: { appendChild, removeChild },
    });

    getMock.mockResolvedValue({ data: new Blob(['%PDF-1.3']) });

    await downloadInvoicePdf('inv1', 'INV-20261016-015516cm7h');

    expect(getMock).toHaveBeenCalledWith('/finance/invoices/inv1/pdf', {
      responseType: 'blob',
      skipGlobalErrorHandler: true,
    });
    expect(anchor.download).toBe('INV-20261016-015516cm7h.pdf');
    expect(click).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalledWith(anchor);

    vi.unstubAllGlobals();
  });

  it('falls back to "invoice.pdf" when the number is missing', async () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    getMock.mockResolvedValue({ data: new Blob(['%PDF-1.3']) });

    await downloadInvoicePdf('inv1', '');

    expect(anchor.download).toBe('invoice.pdf');

    vi.unstubAllGlobals();
  });
});
