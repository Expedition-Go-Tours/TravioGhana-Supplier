/**
 * Bookings — the Stays mirror of the Experiences bookings page: header +
 * refresh, six stat tiles, quick-filter chips, search, stay-date filters,
 * expandable reservation cards with status actions (no editor modal) and the
 * pagination footer.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import StaysBookingsPage from "../StaysBookingsPage";
import { STAYS_MOCK_STORAGE_KEY, staysMock } from "../../mock/store";

beforeEach(() => staysMock.reset());

/** Push extra reservations into the persisted mock db, then reload it. */
function seedExtraBookings(count) {
  const stored = JSON.parse(localStorage.getItem(STAYS_MOCK_STORAGE_KEY));
  for (let index = 0; index < count; index += 1) {
    stored.db.bookings.push({
      id: `TG-S-9${String(index).padStart(4, "0")}`,
      guest: `Guest ${index + 1}`,
      propertyId: "p1",
      room: "Deluxe King Room",
      from: "2026-11-01",
      to: "2026-11-03",
      amount: 1000,
      status: "Confirmed",
      guests: 2,
    });
  }
  localStorage.setItem(STAYS_MOCK_STORAGE_KEY, JSON.stringify(stored));
  staysMock.reload();
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaysBookingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const cards = (container) => [...container.querySelectorAll('[id^="stays-booking-"]')];

describe("StaysBookingsPage — experiences-parity bookings page", () => {
  it("renders the header, stat tiles and the seeded reservations as cards", async () => {
    const { container } = renderPage();

    expect(await screen.findByText("Bookings")).toBeTruthy();
    expect(screen.getByText("Manage and track all guest reservations")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Refresh/ })).toBeTruthy();

    for (const label of [
      "Total Bookings",
      "New",
      "Confirmed",
      "Checked in",
      "Cancellations",
      "Revenue",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(await screen.findByText("GHS 6,950")).toBeTruthy();
    expect(await screen.findByText("7 bookings")).toBeTruthy();

    await waitFor(() => expect(cards(container)).toHaveLength(7));
    expect(container.textContent).toContain("Sarah Johnson");
    expect(container.textContent).toContain("Kwame Agyeman");
    expect(container.textContent).toContain("Rebecca Smith");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("filters with the status chips and the search box", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(cards(container)).toHaveLength(7));

    await user.click(screen.getByRole("button", { name: "New" }));
    await waitFor(() => expect(cards(container)).toHaveLength(1));
    expect(cards(container)[0].textContent).toContain("Kwame Agyeman");

    await user.click(screen.getByRole("button", { name: "All bookings" }));
    await user.type(
      screen.getByPlaceholderText("Search guest, reference or property..."),
      "TG-S-20495",
    );
    await waitFor(() => expect(cards(container)).toHaveLength(1));
    expect(cards(container)[0].textContent).toContain("Rebecca Smith");
  });

  it("expands a card and updates the status through its actions", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(cards(container)).toHaveLength(7));

    const card = cards(container).find((element) =>
      element.textContent.includes("Kwame Agyeman"),
    );
    await user.click(within(card).getAllByRole("button", { expanded: false })[0]);

    expect(within(card).getByText("Booking details")).toBeTruthy();
    expect(within(card).getByText("Reference")).toBeTruthy();
    expect(within(card).getAllByText("TG-S-20494").length).toBeGreaterThan(0);

    await user.click(within(card).getByRole("button", { name: "Confirm booking" }));

    await waitFor(() => {
      expect(within(card).getByRole("button", { name: "Check in" })).toBeTruthy();
    });
    const stored = (await staysMock.listBookings()).find(
      (booking) => booking.id === "TG-S-20494",
    );
    expect(stored.status).toBe("Confirmed");
  });

  it("paginates once the list passes the page size", async () => {
    seedExtraBookings(27); // 7 seeded + 27 = 34 reservations → 2 pages
    const user = userEvent.setup();
    const { container } = renderPage();

    expect(await screen.findByText("34 bookings")).toBeTruthy();
    expect(cards(container)).toHaveLength(25);
    expect(screen.getByText("of 34")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(cards(container)).toHaveLength(9));
  });
});
