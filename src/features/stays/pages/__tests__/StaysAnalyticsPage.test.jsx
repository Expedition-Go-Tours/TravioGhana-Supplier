/**
 * Analytics — the Stays workspace's own reporting page: metric tiles, the
 * revenue trend, the per-property breakdown and best sellers, with the period
 * buttons re-querying the supplier analytics endpoint.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import StaysAnalyticsPage from "../StaysAnalyticsPage";
import { staysMock } from "../../mock/store";
import { formatMoney } from "../../utils/money";

beforeEach(() => staysMock.reset());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaysAnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysAnalyticsPage — stays reporting", () => {
  it("renders the stays analytics payload", async () => {
    const expected = await staysMock.getAnalytics({ period: "90 days" });
    renderPage();

    expect(await screen.findByText("Total bookings")).toBeTruthy();
    expect(screen.getAllByText(String(expected.totalBookings)).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(formatMoney(expected.grossBookingValue)).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(String(expected.liveProperties)).length).toBeGreaterThan(0);
    expect(screen.getByText("Revenue trend")).toBeTruthy();
    expect(screen.getByText("Bookings by property")).toBeTruthy();

    const table = await screen.findByRole("table", { name: "Best selling properties" });
    expect(within(table).getByText(expected.bestSelling[0].name)).toBeTruthy();
  });

  it("re-queries when the period changes", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Total bookings");
    await user.click(screen.getByRole("button", { name: "30 days" }));

    await waitFor(() => {
      expect(screen.getByText(/over the last 30 days/)).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "30 days" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});
