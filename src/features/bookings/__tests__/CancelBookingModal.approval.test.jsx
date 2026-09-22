import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CancelBookingModal from "../components/CancelBookingModal";

/**
 * Full-modal regression coverage for the admin-approval branch: the backend
 * returns `data.request` (parked) instead of `data.cancellation` (executed),
 * and the success screen must say so unambiguously.
 */

const booking = {
  id: "BK-2026-0001",
  bookingNumber: "TGA-78234",
  tour: { title: "Serengeti Safari Adventure" },
  currency: "USD",
};

async function driveWizardToConfirm(user) {
  // Taxonomy loads from MSW (GET /bookings/cancellation-reasons).
  await screen.findByText("Operational issue");
  await user.click(screen.getByRole("radio", { name: /Operational issue/i }));
  await user.click(
    await screen.findByRole("radio", { name: /Guide or staff unavailable/i })
  );
  fireEvent.change(screen.getByLabelText(/What happened/i), {
    target: { value: "Our guide fell ill and no replacement was available." },
  });
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: /^Continue$/i }));
  await screen.findByRole("button", { name: /Confirm cancellation/i });
}

describe("CancelBookingModal — request vs executed", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", "test-token");
  });

  it("shows the explicit 'submitted for review' screen when the cancel is parked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({
      booking,
      request: { id: "req-001", status: "PENDING_APPROVAL" },
    }));

    render(
      <CancelBookingModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        booking={booking}
      />
    );

    await driveWizardToConfirm(user);
    await user.click(screen.getByRole("button", { name: /Confirm cancellation/i }));

    expect(
      await screen.findByText(/Cancellation request submitted for review/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Nothing has been cancelled yet; the customer has not been told/i)
    ).toBeTruthy();
    expect(screen.getByText("Pending approval")).toBeTruthy();
    // The executed-only copy must not leak into the parked screen.
    expect(screen.queryByText(/Customer refund/i)).toBeNull();
    expect(screen.getByText("Cancellation requested")).toBeTruthy();
  });

  it("keeps the existing executed success screen when a cancellation is returned", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({
      booking,
      cancellation: {
        refundStatus: "PENDING",
        refundAmount: 2400,
        refundExecuted: false,
        fee: 600,
        countsTowardRate: true,
        choiceDeadline: "2026-05-22T10:00:00.000Z",
      },
    }));

    render(
      <CancelBookingModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        booking={booking}
      />
    );

    await driveWizardToConfirm(user);
    await user.click(screen.getByRole("button", { name: /Confirm cancellation/i }));

    expect(await screen.findByText("Customer refund")).toBeTruthy();
    expect(screen.getByText("Cancellation fee")).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByText(/submitted for review/i)).toBeNull()
    );
    expect(screen.getByText("Booking cancelled")).toBeTruthy();
  });
});
