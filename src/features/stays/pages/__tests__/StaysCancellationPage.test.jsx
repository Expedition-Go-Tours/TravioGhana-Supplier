/**
 * Cancellation rate — the Stays mirror of the Experiences page: rate card and
 * threshold gauge, the about card, the sortable records table with the
 * period filter and the details modal. Amounts are USD.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";

import StaysCancellationPage from "../StaysCancellationPage";
import { staysMock } from "../../mock/store";

beforeEach(() => staysMock.reset());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaysCancellationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysCancellationPage — experiences-parity cancellation page", () => {
  it("renders the summary card, gauge and the cancellation records", async () => {
    const expected = await staysMock.getCancellationSummary({ days: 90 });
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Cancellation rate" }),
    ).toBeTruthy();
    expect(screen.getByText("Monitor and review booking cancellations across your properties")).toBeTruthy();

    // Wait for the summary card, then assert the derived figures.
    await screen.findByText("Your rate");
    expect(screen.getAllByText(`${expected.cancellationRate}%`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(expected.status).length).toBeGreaterThan(0);
    expect(screen.getByText(/No-show rate/)).toBeTruthy();

    // Records table.
    expect(await screen.findByText("TG-S-20496")).toBeTruthy();
    expect(screen.getAllByText("Property unavailable").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Most common reason/)).toBeTruthy();
    expect(screen.getAllByText("$1,400.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Total value lost")).toBeTruthy();
    expect(screen.getByText(formatCurrency(expected.bookingValueLost))).toBeTruthy();
    expect(screen.getByRole("button", { name: /Export CSV/ })).toBeTruthy();
  });

  it("re-filters the records when the period changes", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("TG-S-20498");

    await user.click(screen.getByRole("button", { name: "30 days" }));

    await waitFor(() => {
      expect(screen.getByText("Your rate")).toBeTruthy();
      expect(screen.getByText("TG-S-20496")).toBeTruthy();
      expect(screen.queryByText("TG-S-20498")).toBeNull();
    });
  });

  it("sorts the records by booking value", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("TG-S-20496");

    await user.click(screen.getByText("Booking Value"));

    const table = screen.getByRole("table");
    await waitFor(() => {
      const firstRow = within(table).getAllByRole("row")[1];
      expect(firstRow).toHaveTextContent("TG-S-20499");
    });
  });

  it("opens the details modal with the summary strip", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("TG-S-20496");

    await user.click(screen.getByRole("button", { name: "View details" }));

    const dialog = await screen.findByRole("dialog", { name: "Cancellation details" });
    expect(within(dialog).getByText("Completion Rate")).toBeTruthy();
    expect(within(dialog).getByText("Cancellation Rate")).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
