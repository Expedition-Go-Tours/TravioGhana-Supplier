/**
 * The `mapBookingRow` → `BookingCard` seam, for cancellation detail.
 *
 * A component test that hands `BookingCard` a hand-written fixture will pass
 * whether or not the mapper forwards the cancellation fields, because the
 * fixture carries them either way. That is exactly how
 * `fix(supplier): show cancellation reason and refund status on cancelled
 * bookings` shipped: the JSX looked right, the fields were real, and the
 * mapper quietly dropped all four — so the section never rendered once.
 *
 * Every booking in the supplier list is fed to this component by
 * `mapBookingRow`, so these tests walk a raw API row through the real mapper
 * and assert on what actually reaches the screen. If a future mapper refactor
 * stops forwarding one of these keys, this file fails.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mapBookingRow } from "../api";
import BookingCard from "../components/BookingCard";

/** A cancelled booking as `GET /supplier/bookings` actually serialises it. */
const apiCancelledBooking = {
  id: "b-cancel-1",
  bookingNumber: "TRG-90123456-2026-01",
  customer: {
    id: "u-1",
    name: "Ama Serwaa",
    email: "ama@example.com",
    phone: "+233201234567",
    photoURL: "",
  },
  tour: { id: "t-1", title: "Shai Hills Safari", coverPhoto: "", photos: [] },
  travelDate: "2026-11-04T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  grossAmount: 420,
  currency: "USD",
  status: "CANCELLED",
  cancellationReason: "WEATHER",
  cancellationNote: "Forecast said the whole week would be washed out.",
  cancelledAt: "2026-10-02T09:15:00.000Z",
  refundStatus: "SUCCEEDED",
};

const noop = () => {};

/** Renders a raw API row the way the bookings page does: mapped, then expanded. */
async function renderMapped(rawBooking) {
  const user = userEvent.setup();
  render(
    <BookingCard
      booking={mapBookingRow(rawBooking)}
      onStatusUpdate={noop}
      onMessageCustomer={noop}
      onWithdrawRequest={noop}
    />
  );
  // Two headers exist (mobile + desktop layouts); Tailwind's responsive
  // visibility classes are inert under jsdom, so both are in the tree.
  await user.click(screen.getAllByRole("button", { expanded: false })[0]);
  return user;
}

describe("BookingCard — cancellation detail, through the real mapper", () => {
  it("shows the reason the customer gave", async () => {
    await renderMapped(apiCancelledBooking);

    expect(screen.getByText("Reason")).toBeTruthy();
    expect(screen.getByText("WEATHER")).toBeTruthy();
  });

  it("shows the customer's free-text note", async () => {
    // The feature under review: the note is what a supplier actually needs to
    // judge whether a cancellation is legitimate, and a reason code alone
    // ("WEATHER") does not tell them that.
    await renderMapped(apiCancelledBooking);

    expect(screen.getByText("Customer note")).toBeTruthy();
    expect(
      screen.getByText("Forecast said the whole week would be washed out.")
    ).toBeTruthy();
  });

  it("shows when the cancellation happened", async () => {
    await renderMapped(apiCancelledBooking);

    expect(screen.getByText("Cancelled on")).toBeTruthy();
  });

  it("shows the refund as Processed", async () => {
    await renderMapped(apiCancelledBooking);

    expect(screen.getByText("Refund")).toBeTruthy();
    expect(screen.getByText("Processed")).toBeTruthy();
  });

  it("reports a failed refund as Failed", async () => {
    await renderMapped({
      ...apiCancelledBooking,
      refundStatus: "FAILED",
    });

    expect(screen.getByText("Failed")).toBeTruthy();
  });

  it("omits the Customer note cell when the customer gave no note", async () => {
    // A bare reason code is the common case. An empty cell labelled
    // "Customer note" would read as a rendering fault rather than "nothing
    // was written", so the block is hidden outright.
    await renderMapped({ ...apiCancelledBooking, cancellationNote: null });

    expect(screen.getByText("Reason")).toBeTruthy();
    expect(screen.queryByText("Customer note")).toBeNull();
  });

  it("hides the refund badge when no refund applies", async () => {
    // NOT_APPLICABLE is the backend's "nothing to refund" sentinel — a real
    // value the mapper must not flatten to null, and which the card filters.
    await renderMapped({
      ...apiCancelledBooking,
      refundStatus: "NOT_APPLICABLE",
    });

    expect(screen.queryByText("Refund")).toBeNull();
  });

  it("keeps the section hidden for a booking that is not cancelled", async () => {
    await renderMapped({ ...apiCancelledBooking, status: "CONFIRMED" });

    expect(screen.queryByText("Cancellation")).toBeNull();
    expect(screen.queryByText("Customer note")).toBeNull();
  });

  it("survives a cancelled booking with no cancellation metadata at all", async () => {
    // Sweeper-cancelled and pre-reason legacy rows have none of these set.
    // The section must render its heading rather than crash or vanish.
    await renderMapped({
      ...apiCancelledBooking,
      cancellationReason: null,
      cancellationNote: null,
      cancelledAt: null,
      refundStatus: null,
    });

    expect(screen.getByText("Cancellation")).toBeTruthy();
    expect(screen.queryByText("Reason")).toBeNull();
  });
});

/** The grid cell wrapping a labelled detail, addressed by its label text. */
function cellFor(label) {
  return screen.getByText(label).parentElement;
}

describe("BookingCard — cancellation detail layout", () => {
  // The block is a 3-column grid and the four cells are laid out in DOM order:
  // Reason, Customer note, Cancelled on, Refund. When a note is present the
  // Reason cell drops to one column so Reason(1) + note(2) fills exactly one
  // row; leaving Reason at two columns would make the pair span 4 of 3 columns,
  // wrap, and push the section a row taller for no gain.
  it("gives the Reason cell one column when a note is shown", async () => {
    await renderMapped(apiCancelledBooking);

    expect(cellFor("Reason").className).toContain("sm:col-span-1");
    expect(cellFor("Customer note").className).toContain("sm:col-span-2");
  });

  it("gives the Reason cell two columns when there is no note", async () => {
    await renderMapped({ ...apiCancelledBooking, cancellationNote: null });

    expect(cellFor("Reason").className).toContain("sm:col-span-2");
    expect(cellFor("Reason").className).not.toContain("sm:col-span-1");
  });

  it("keeps the Reason and note cells within the three-column grid", async () => {
    // Spans are counted by class name; a regression that widened either cell
    // past 2 would silently overflow the row, so assert the budget directly.
    await renderMapped(apiCancelledBooking);

    const spanOf = (className) =>
      Number(className.match(/sm:col-span-(\d)/)?.[1] ?? 1);
    const reason = spanOf(cellFor("Reason").className);
    const note = spanOf(cellFor("Customer note").className);

    expect(reason + note).toBeLessThanOrEqual(3);
  });
});