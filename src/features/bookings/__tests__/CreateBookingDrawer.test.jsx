/**
 * The create-booking wizard: the four things that make it trustworthy.
 *
 *  1. THE PRICE ON SCREEN IS THE SERVER'S. The wizard fetches a quote and
 *     submits no total, no price, no supplier and no commission — a browser
 *     cannot be trusted with the amount a booking costs.
 *  2. OFFLINE MONEY IS NAMED HONESTLY. A supplier-collected payment is shown
 *     as "Recorded as collected", never "Paid", and the step says plainly that
 *     TravioGhana does not verify offline payments.
 *  3. RETRIES ARE SAFE. The same idempotency key goes out on every attempt for
 *     one booking, so re-submitting after an uncertain response cannot create
 *     a second booking — and the failure copy says so instead of guessing.
 *  4. AN UNPAID RESERVATION IS A REAL STATE. With no collection reported, the
 *     review says "Unpaid reservation" rather than implying money changed
 *     hands.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const quoteSupplierBooking = vi.fn();
const createSupplierBooking = vi.fn();

vi.mock("../api", () => ({
  quoteSupplierBooking: (...a) => quoteSupplierBooking(...a),
  createSupplierBooking: (...a) => createSupplierBooking(...a),
  fetchBookingCollections: vi.fn(),
  recordBookingCollection: vi.fn(),
  recordBookingRefund: vi.fn(),
}));

import CreateBookingDrawer from "../components/CreateBookingDrawer";

const tours = [{ id: "tour-1", title: "Shai Hills Safari", status: "PUBLISHED" }];

beforeEach(() => {
  vi.clearAllMocks();
  quoteSupplierBooking.mockResolvedValue({
    currency: "USD",
    subtotal: 400,
    discount: 0,
    total: 400,
    available: true,
    unavailableReason: null,
    commission: { policy: "APPLY", rate: 0.15, amount: 60 },
  });
  createSupplierBooking.mockResolvedValue({ id: "b-1", bookingNumber: "TGA-2048" });
});

/** Step 1: pick the tour, then a day on the inline calendar. */
async function fillExperience() {
  fireEvent.click(screen.getByRole("button", { name: "Shai Hills Safari" }));

  // The calendar is the app's DatePicker (react-datepicker), rendered inline:
  // any selectable day in the visible month is a valid choice.
  const cells = Array.from(
    document.querySelectorAll(
      ".react-datepicker__day:not(.react-datepicker__day--outside-month):not(.react-datepicker__day--disabled)"
    )
  );
  expect(cells.length).toBeGreaterThan(0);
  fireEvent.click(cells[cells.length - 1]);

  await waitFor(() => expect(quoteSupplierBooking).toHaveBeenCalled());
}

/** Steps 1 → 2, ending on the pricing & collection step. */
async function reachCollectionStep() {
  render(<CreateBookingDrawer open tours={tours} onClose={() => {}} />);
  await fillExperience();

  fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
  fireEvent.change(await screen.findByLabelText("Lead traveller name"), {
    target: { value: "Kwame Mensah" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
  await screen.findByRole("heading", { name: "Payment" });
}

describe("the price is the server's, never the browser's", () => {
  it("shows the quoted total and submits no total or price field at all", async () => {
    await reachCollectionStep();

    // The total on screen came from the quote response (the price card and the
    // summary rail both carry it).
    expect(screen.getAllByText("$400.00").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: /Create booking/ }));

    await waitFor(() => expect(createSupplierBooking).toHaveBeenCalled());
    const [payload] = createSupplierBooking.mock.calls[0];
    expect(payload.total).toBeUndefined();
    expect(payload.price).toBeUndefined();
    expect(payload.grossAmount).toBeUndefined();
    expect(payload.supplierId).toBeUndefined();
    expect(payload.status).toBeUndefined();
    expect(payload.commissionRate).toBeUndefined();
  });

  it("re-quotes when the party changes rather than adjusting the number itself", async () => {
    render(<CreateBookingDrawer open tours={tours} onClose={() => {}} />);
    await fillExperience();
    expect(quoteSupplierBooking).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Add adults" }));
    await waitFor(() => expect(quoteSupplierBooking).toHaveBeenCalledTimes(2));
  });
});

describe("offline money is named honestly", () => {
  it('says "Recorded as collected" and states that offline payments are not verified', async () => {
    await reachCollectionStep();

    // The phrase appears as the field label and in the ledger; the point is
    // that it appears at all instead of "Paid".
    expect(screen.getAllByText(/Recorded as collected/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/TravioGhana does not verify offline payments/).length
    ).toBeGreaterThan(0);
    // The collection is a different fact from a platform payment, and the
    // wizard must never call it one.
    expect(screen.queryByText(/^Total paid/)).toBeNull();
  });

  it('says "Unpaid reservation" when no collection is reported', async () => {
    await reachCollectionStep();

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Unpaid reservation")).toBeInTheDocument();
  });

  it("will not record more money than the booking costs", async () => {
    await reachCollectionStep();

    // The backend refuses this too; the wizard says so before the round trip
    // instead of letting the supplier discover it as a failed submission.
    fireEvent.change(screen.getByLabelText("Amount collected"), {
      target: { value: "500" },
    });
    expect(await screen.findByText(/More than the booking total/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByRole("button", { name: /Create booking/ })).toBeDisabled();
  });
});

describe("retries cannot create a second booking", () => {
  it("sends one stable idempotency key across attempts", async () => {
    await reachCollectionStep();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    createSupplierBooking.mockRejectedValueOnce(new Error("network"));
    fireEvent.click(screen.getByRole("button", { name: /Create booking/ }));
    await waitFor(() => expect(createSupplierBooking).toHaveBeenCalledTimes(1));

    // The failure says a re-submit is safe instead of claiming the booking
    // failed outright.
    expect(await screen.findByText(/Re-submitting is safe/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create booking/ }));
    await waitFor(() => expect(createSupplierBooking).toHaveBeenCalledTimes(2));

    const [, keyFirst] = createSupplierBooking.mock.calls[0];
    const [, keySecond] = createSupplierBooking.mock.calls[1];
    expect(keyFirst).toBeTruthy();
    expect(keySecond).toBe(keyFirst);
  });
});

describe("availability failures stay inside the flow", () => {
  it("keeps the entered details, explains the change, and offers a fresh quote", async () => {
    await reachCollectionStep();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    createSupplierBooking.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          code: "RESERVATION_UNAVAILABLE",
          message: "That date is no longer available.",
        },
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create booking/ }));

    expect(await screen.findByText(/That date is no longer available/)).toBeInTheDocument();
    expect(screen.getByText(/details are still here/i)).toBeInTheDocument();
    const before = quoteSupplierBooking.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Refresh quote/i }));
    await waitFor(() =>
      expect(quoteSupplierBooking.mock.calls.length).toBeGreaterThan(before),
    );
    // The wizard never fabricates a booking or claims one was created.
    expect(screen.queryByRole("heading", { name: /Booking created/i })).toBeNull();
  });
});
