import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import BookingCard from "../components/BookingCard";

const baseBooking = {
  id: "BK-2026-0001",
  bookingNumber: "TGA-78234",
  tourName: "Serengeti Safari Adventure",
  status: "CONFIRMED",
  paymentStatus: "SUCCEEDED",
  paymentTiming: "now",
  travelers: 2,
  travelersRaw: { adults: 2 },
  total: 2400,
  currency: "USD",
  travelDate: "2026-06-15",
  bookingDate: "2026-05-18",
};

describe("BookingCard — pending cancellation", () => {
  it("shows a Pending approval chip with the requested date and withdraws via a confirm dialog", async () => {
    const user = userEvent.setup();
    const onWithdrawRequest = vi.fn(async () => {});

    render(
      <BookingCard
        booking={{
          ...baseBooking,
          pendingCancellation: {
            id: "req-001",
            status: "PENDING_APPROVAL",
            createdAt: "2026-05-20T10:00:00.000Z",
          },
        }}
        onStatusUpdate={() => {}}
        onMessageCustomer={() => {}}
        onWithdrawRequest={onWithdrawRequest}
      />
    );

    const badge = screen.getByTestId("pending-cancellation-badge");
    expect(badge.textContent).toMatch(/Pending approval/);
    expect(badge.textContent).toMatch(/requested/);

    // Opening the dialog explains that nothing on the booking changes.
    await user.click(screen.getByRole("button", { name: /^Withdraw$/ }));
    expect(
      screen.getByRole("heading", { name: /Withdraw cancellation request\?/i })
    ).toBeTruthy();
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" && /has not been cancelled/i.test(el.textContent)
      )
    ).toBeTruthy();
    expect(screen.getByText(/re-opened for new bookings/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Withdraw request/i }));
    expect(onWithdrawRequest).toHaveBeenCalledWith("req-001");
  });

  it("renders no chip when the booking has no pending cancellation", () => {
    render(
      <BookingCard
        booking={baseBooking}
        onStatusUpdate={() => {}}
        onMessageCustomer={() => {}}
      />
    );
    expect(screen.queryByTestId("pending-cancellation-badge")).toBeNull();
  });
});
