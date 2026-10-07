/**
 * Special Offers — the Stays mirror of the Experiences offers page: header +
 * Create Offer, three stat tiles, search/type/status filters, offer rows with
 * the discount badge, the toggle/delete actions and the detail modal.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import StaysOffersPage from "../StaysOffersPage";
import { staysMock } from "../../mock/store";

beforeEach(() => staysMock.reset());

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/stays/special-offers"]}>
        <LocationProbe />
        <Routes>
          <Route path="/stays/special-offers" element={<StaysOffersPage />} />
          <Route path="/stays/special-offers/build/:id?/:step?" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysOffersPage — experiences-parity offers list", () => {
  it("renders the header, stat tiles and the active seeded offers", async () => {
    renderPage();

    expect(screen.getByText("Special Offers")).toBeTruthy();
    expect(screen.getByText("Manage promotional discounts and offers")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Create Offer/ })).toBeTruthy();

    expect((await screen.findAllByText("Weekend escape")).length).toBeGreaterThan(0);
    // The default status filter is Active — the scheduled offer is hidden.
    expect(screen.queryByText("Early bird special")).toBeNull();
    expect(screen.getByText("Showing 1 of 2 offers")).toBeTruthy();

    for (const label of ["Total Offers", "Active", "Scheduled"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("filters by status and search", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Weekend escape");

    await user.selectOptions(screen.getByLabelText("Filter by status"), "");
    expect((await screen.findAllByText("Early bird special")).length).toBeGreaterThan(0);
    expect(screen.getByText("Showing 2 of 2 offers")).toBeTruthy();

    await user.type(screen.getByPlaceholderText("Search offers..."), "early");
    await waitFor(() => {
      expect(screen.queryByText("Weekend escape")).toBeNull();
      expect(screen.getAllByText("Early bird special").length).toBeGreaterThan(0);
    });
  });

  it("opens the builder from Create Offer", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Create Offer/ }));
    expect(screen.getByTestId("location").textContent).toBe("/stays/special-offers/build/new");
  });

  it("opens the builder from a row's Edit action", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Weekend escape");

    await user.click(screen.getByRole("button", { name: "Edit Weekend escape" }));
    expect(screen.getByTestId("location").textContent).toBe(
      "/stays/special-offers/build/offer-1",
    );
  });

  it("toggles an offer off and deletes an offer", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Weekend escape");

    await user.click(screen.getByRole("button", { name: "Deactivate Weekend escape" }));
    expect(await screen.findByText("No active offers")).toBeTruthy();
    const toggled = (await staysMock.listOffers()).find((offer) => offer.id === "offer-1");
    expect(toggled.isActive).toBe(false);

    await user.selectOptions(screen.getByLabelText("Filter by status"), "");
    await screen.findAllByText("Early bird special");
    await user.click(screen.getByRole("button", { name: "Delete Early bird special" }));

    expect(await screen.findByText("Delete offer")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(async () => {
      const rows = await staysMock.listOffers();
      expect(rows.some((offer) => offer.id === "offer-2")).toBe(false);
    });
  });

  it("opens the detail modal with the offer facts", async () => {
    const user = userEvent.setup();
    renderPage();
    const titles = await screen.findAllByText("Weekend escape");

    await user.click(titles[0]);
    expect(await screen.findByText("Offer Type")).toBeTruthy();
    expect(screen.getAllByText("Limited Time").length).toBeGreaterThan(0);
    expect(screen.getByText("15% discount")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Edit Offer/ })).toBeTruthy();
  });
});
