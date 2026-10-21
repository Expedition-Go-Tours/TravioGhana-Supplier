/**
 * The booking detail panel (the GYG-style slide-over).
 *
 * Three rules it must keep, all of which are about not telling a supplier
 * something untrue:
 *  1. a failed fetch shows an error with Retry — it never falls back to a stale
 *     list row and calls it "the booking";
 *  2. the notes editor is honest about save state: "Saved" only after the
 *     server confirms, and an unsaved draft is labelled as such;
 *  3. post-activity actions (complete / no-show) are unavailable before the
 *     activity date, and unavailable actions say why instead of sitting there
 *     grey and mute.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fetchBookingDetail = vi.fn();
const updateBookingNotes = vi.fn();

vi.mock('../api', async (importOriginal) => ({
  // mapBookingRow is the real mapper: the panel is only as truthful as the
  // mapping it feeds on, so the tests walk raw API rows through it.
  ...(await importOriginal()),
  fetchBookingDetail: (...args) => fetchBookingDetail(...args),
  updateBookingNotes: (...args) => updateBookingNotes(...args),
}));

import BookingDetailDrawer from '../components/BookingDetailDrawer';
import { mapBookingRow } from '../api';

const FUTURE = '2999-06-15T00:00:00.000Z';
const PAST = '2026-06-15T00:00:00.000Z';

const rawBooking = (over = {}) => ({
  id: 'b-1',
  bookingNumber: 'TRG-10000001-2026-01',
  createdAt: '2026-10-18T09:00:00.000Z',
  travelDate: FUTURE,
  status: 'CONFIRMED',
  paymentStatus: 'SUCCEEDED',
  paymentTiming: 'now',
  grossAmount: 420,
  subtotal: 420,
  currency: 'USD',
  source: 'GHANA',
  customer: {
    id: 'u-1',
    name: 'Kwame Mensah',
    email: 'kwame@example.com',
    phone: '+233201111111',
    photoURL: '',
  },
  leadTravelerName: 'Kwame Mensah',
  tour: { id: 't-1', title: 'Shai Hills Safari', coverPhoto: '', photos: [] },
  travelers: { adults: 2, children: 0, infants: 0 },
  supplierNotes: '',
  ...over,
});

const noop = () => {};

function renderDrawer(props = {}) {
  return render(
    <BookingDetailDrawer
      bookingId="b-1"
      onClose={props.onClose || noop}
      onMessageCustomer={props.onMessageCustomer || noop}
      onStatusUpdate={props.onStatusUpdate || noop}
      isUpdating={false}
    />,
  );
}

beforeEach(() => {
  fetchBookingDetail.mockReset();
  updateBookingNotes.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe('loading and failure', () => {
  it('shows an error with Retry when the fetch fails, and no booking', async () => {
    fetchBookingDetail.mockRejectedValue(new Error('boom'));

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText(/couldn't load this booking/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /save note/i })).toBeNull();

    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking()));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('TRG-10000001-2026-01')).toBeInTheDocument();
    });
  });

  it('announces itself as a dialog and closes on Escape', async () => {
    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking()));
    const onClose = vi.fn();

    renderDrawer({ onClose });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});

describe('what the panel shows', () => {
  it('shows the customer contact details the list does not carry', async () => {
    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking()));

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /kwame@example.com/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /\+233201111111/i })).toBeInTheDocument();
    expect(screen.getByText('Shai Hills Safari')).toBeInTheDocument();
  });

  it('marks the payment as taken, not as an estimate', async () => {
    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking()));

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText('Paid in full.')).toBeInTheDocument();
    });
  });

  it('says a pay-later booking has NOT been charged', async () => {
    fetchBookingDetail.mockResolvedValue(
      mapBookingRow(rawBooking({ paymentStatus: 'PENDING', paymentTiming: 'later' })),
    );

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText(/pays later — no charge has been taken yet/i)).toBeInTheDocument();
    });
  });
});

describe('supplier notes', () => {
  it('only claims Saved after the server confirms', async () => {
    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking()));
    let resolveSave;
    updateBookingNotes.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );

    renderDrawer();
    const box = await screen.findByLabelText(/supplier notes/i);
    await userEvent.type(box, 'Customer arrives at 9am');

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save note/i }));
    expect(updateBookingNotes).toHaveBeenCalledWith('b-1', 'Customer arrives at 9am');
    // While the request is out, the draft is still unsaved — no "Saved" yet.
    expect(screen.queryByText(/^Saved /)).toBeNull();

    resolveSave({});
    await waitFor(() => {
      expect(screen.getByText(/^Saved /)).toBeInTheDocument();
    });
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('does not claim Saved when the save fails', async () => {
    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking()));
    updateBookingNotes.mockRejectedValue({ response: { data: { message: 'Nope' } } });

    renderDrawer();
    const box = await screen.findByLabelText(/supplier notes/i);
    await userEvent.type(box, 'Draft note');
    await userEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
    expect(screen.queryByText(/^Saved /)).toBeNull();
  });
});

describe('status actions', () => {
  it('hides post-activity actions before the activity date and says why', async () => {
    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking({ travelDate: FUTURE })));

    renderDrawer();

    const complete = await screen.findByRole('button', { name: /mark completed/i });
    expect(complete).toBeDisabled();
    expect(
      screen.getByText(/a future booking cannot be marked completed/i),
    ).toBeInTheDocument();
  });

  it('offers complete and no-show once the activity date has passed', async () => {
    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking({ travelDate: PAST })));

    renderDrawer();

    const complete = await screen.findByRole('button', { name: /mark completed/i });
    expect(complete).toBeEnabled();
    expect(screen.getByRole('button', { name: /mark no-show/i })).toBeEnabled();
    // The reason line is only printed for disabled actions.
    expect(screen.queryByText(/a future booking cannot be marked completed/i)).toBeNull();
  });

  it('routes a status action through the caller, so the wizard stays in charge', async () => {
    fetchBookingDetail.mockResolvedValue(mapBookingRow(rawBooking({ travelDate: PAST })));
    const onStatusUpdate = vi.fn();

    renderDrawer({ onStatusUpdate });
    await userEvent.click(
      await screen.findByRole('button', { name: /mark completed/i }),
    );

    expect(onStatusUpdate).toHaveBeenCalledWith('b-1', 'COMPLETED');
  });
});
