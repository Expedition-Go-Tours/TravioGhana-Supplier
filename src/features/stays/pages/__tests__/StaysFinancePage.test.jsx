/**
 * Stays Finance — the Experiences finance page mirrored for the Stays
 * workspace: USD amounts, property wording, the payout schedule, and the
 * Earnings / Payouts / Refunds / Refund Requests / Payout Methods tabs.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";

import StaysFinancePage from "../StaysFinancePage";
import { staysMock } from "../../mock/store";

beforeEach(() => {
  staysMock.reset();
  localStorage.setItem("auth_token", "test-token");
});

function renderPage(initialEntry = "/stays/finance") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <StaysFinancePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysFinancePage — experiences-parity finance page", () => {
  it("renders the summary, payout schedule and USD earnings", async () => {
    const summary = await staysMock.getFinanceSummary();
    const earningsResult = await staysMock.getFinanceEarnings({ page: 1, limit: 25 });
    const first = earningsResult.earnings[0];
    renderPage();

    expect(await screen.findByRole("heading", { name: "Finance" })).toBeTruthy();
    expect(
      screen.getByText("Track earnings, your payout schedule, and payment methods"),
    ).toBeTruthy();

    await screen.findByText("Available for payout");
    await waitFor(() => {
      expect(
        screen.getAllByText(formatCurrency(summary.availableBalance.amount)).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Payout schedule/)).toBeTruthy();
    expect(screen.getByText("Twice a month — paid on the 1st & 15th")).toBeTruthy();

    // Earnings tab: the derived row with property wording + USD amounts.
    expect(await screen.findByText(first.bookingNumber)).toBeTruthy();
    expect(screen.getAllByText(first.property).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatCurrency(first.commissionAmount)).length,
    ).toBeGreaterThan(0);
  });

  it("switches tabs — payouts, refunds, refund requests and methods", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Available for payout");

    await user.click(screen.getByRole("button", { name: /Payouts/ }));
    expect(await screen.findByText("PR-2026-001")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Refunds$/ }));
    expect(await screen.findByText("RF-2026-001")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Refund Requests/ }));
    expect(await screen.findByText("No refund requests")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Payout Methods/ }));
    expect(await screen.findByText("Akwaaba Coast Ltd")).toBeTruthy();
  });

  it("keeps the URL tab and the earnings filter pills in sync", async () => {
    renderPage("/stays/finance?tab=earnings");
    await screen.findByText("Available for payout");

    expect(screen.getByRole("button", { name: "Eligible now" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Paid" })).toBeTruthy();
  });
});
