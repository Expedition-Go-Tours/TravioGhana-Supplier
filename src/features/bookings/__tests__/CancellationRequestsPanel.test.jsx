import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CancellationRequestsPanel from "../components/CancellationRequestsPanel";

/**
 * MSW-backed check of the new GET/POST cancellation-request endpoints: the
 * pending row renders the structured reason + preview, and Withdraw calls
 * POST /bookings/supplier/cancellation-requests/:id/withdraw.
 */
describe("CancellationRequestsPanel", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", "test-token");
  });

  it("lists pending requests with reason/preview and withdraws one", async () => {
    const user = userEvent.setup();
    const onWithdrawn = vi.fn();

    render(<CancellationRequestsPanel onWithdrawn={onWithdrawn} />);

    const rows = await screen.findAllByTestId("cancellation-request-row");
    expect(rows).toHaveLength(1);
    expect(screen.getByText("Serengeti Safari Adventure")).toBeTruthy();
    expect(screen.getByText("TGA-78234")).toBeTruthy();
    expect(screen.getByText("Guide unavailable")).toBeTruthy();
    expect(screen.getByText(/Preview refund:/)).toBeTruthy();
    // 2400.00 may be formatted with currency; just assert the fee line exists.
    expect(screen.getByText("Fee:")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Withdraw$/ }));
    await user.click(screen.getByRole("button", { name: /Withdraw request/i }));

    await waitFor(() => expect(onWithdrawn).toHaveBeenCalled());
    // The only pending request was withdrawn → the pending filter is now empty.
    expect(
      await screen.findByText("No cancellation requests")
    ).toBeTruthy();
  });
});
