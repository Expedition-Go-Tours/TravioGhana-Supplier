/**
 * Payment status presentation on the booking card.
 *
 * "Paid" is the expected state: it must read as quiet text with a check, not a
 * big green banner competing with the amount. Only states a supplier has to act
 * on (pending, failed) get a pill, and every state uses plain copy.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mapBookingRow } from "../api";
import BookingCard from "../components/BookingCard";

const apiBooking = {
  id: "b-pay-1",
  bookingNumber: "TRG-90123456-2026-02",
  customer: {
    id: "u-1",
    name: "Ama Serwaa",
    email: "ama@example.com",
    phone: "+233201234567",
    photoURL: "",
  },
  guest: null,
  tour: { id: "t-1", title: "Shai Hills Safari", coverPhoto: "", photos: [] },
  travelDate: "2026-11-04T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  grossAmount: 420,
  currency: "USD",
  status: "CONFIRMED",
  paymentTiming: "now",
  paymentStatus: "SUCCEEDED",
  travelers: 1,
  selectedTime: "09:00",
};

const noop = () => {};

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
  await user.click(screen.getAllByRole("button", { expanded: false })[0]);
  return user;
}

describe("BookingCard — payment status presentation", () => {
  it("shows Paid as plain text with a check, not a green box", async () => {
    await renderMapped(apiBooking);

    const paid = screen.getByText("Paid");
    expect(paid).toBeTruthy();
    // Quiet inline status: no tinted container around the word.
    expect(paid.closest("span")?.className).not.toMatch(/bg-emerald-50|border-emerald-200/);
    expect(screen.getAllByLabelText("Paid in full").length).toBeGreaterThan(0);
    // The old copy repeated the state: "Paid" + "Payment completed".
    expect(screen.queryByText("Payment completed")).toBeNull();
  });

  it("does not show a Paid chip in the collapsed row", async () => {
    const user = userEvent.setup();
    render(
      <BookingCard
        booking={mapBookingRow(apiBooking)}
        onStatusUpdate={noop}
        onMessageCustomer={noop}
        onWithdrawRequest={noop}
      />
    );
    expect(screen.queryByText("Paid")).toBeNull();
    expect(screen.getAllByLabelText("Paid in full").length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { expanded: false })[0]);
    expect(screen.getByText("Paid")).toBeTruthy();
  });

  it("gives an unpaid pay-later reservation a compact pending pill", async () => {
    await renderMapped({
      ...apiBooking,
      paymentTiming: "later",
      paymentStatus: "PENDING",
    });

    expect(screen.getByText("Payment pending")).toBeTruthy();
    const hint = screen.getByText(/Not charged yet/);
    expect(hint.closest("span.rounded-full")?.className).toMatch(/border-amber-200/);
    expect(screen.queryByText("Payment unconfirmed")).toBeNull();
  });

  it("marks a failed charge with the failure pill and plain copy", async () => {
    await renderMapped({ ...apiBooking, paymentStatus: "FAILED" });

    expect(screen.getAllByText("Payment failed").length).toBeGreaterThan(0);
    const hint = screen.getByText(/No charge was taken/);
    expect(hint.closest("span.rounded-full")?.className).toMatch(/border-red-200/);
    expect(screen.queryByText("No charge was made")).toBeNull();
  });

  it("uses neutral copy for a refunded booking", async () => {
    await renderMapped({ ...apiBooking, paymentStatus: "REFUNDED" });

    expect(screen.getByText("Refunded")).toBeTruthy();
    const hint = screen.getByText(/Returned to the customer/);
    expect(hint.closest("span.rounded-full")?.className).toMatch(/border-slate-200/);
    expect(screen.queryByText("Charge was returned")).toBeNull();
  });

  it("puts status and total on one line in the payment section", async () => {
    await renderMapped(apiBooking);

    const status = screen.getByText("Status");
    const total = screen.getByText("Total charged");
    // Both are inline label/value pairs, so they wrap instead of stacking
    // into two full-width rows on a narrow screen.
    expect(status.className).toContain("text-[11px]");
    expect(total.className).toContain("text-[11px]");
    expect(status.closest("div")?.className).toContain("items-baseline");
  });
});
