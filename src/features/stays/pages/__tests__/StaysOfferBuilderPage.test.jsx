/**
 * The Stays offer builder — the three-step wizard mirrored from the
 * Experiences builder: property selection validation, the details step, the
 * discount step, publishing into the mock, editing prefill and the
 * Properties-page deep link.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import StaysOfferBuilderPage from "../StaysOfferBuilderPage";
import { staysMock } from "../../mock/store";
import { useStaysOfferBuilderStore } from "../../stores/staysOfferBuilderStore";

beforeEach(() => {
  staysMock.reset();
  localStorage.removeItem("stays-offer-builder-draft");
  useStaysOfferBuilderStore.getState().reset();
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderBuilder(initialEntry = "/stays/special-offers/build/new") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route
            path="/stays/special-offers/build/:id?/:step?"
            element={<StaysOfferBuilderPage />}
          />
          <Route path="/stays/special-offers" element={<div>Offers list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysOfferBuilderPage — the three-step wizard", () => {
  it("validates the property step, then publishes through the steps", async () => {
    const user = userEvent.setup();
    renderBuilder();

    expect(screen.getByText("Create Offer")).toBeTruthy();
    expect(screen.getByText(/Step 1 of 3 — Properties/)).toBeTruthy();

    // No properties selected → the step refuses to advance.
    await user.click(screen.getByRole("button", { name: /Next Step/ }));
    expect(await screen.findByText("Select at least one property")).toBeTruthy();

    // Pick the seeded live property from the dropdown.
    await user.click(screen.getByPlaceholderText("Select a property or type to filter..."));
    await user.click(await screen.findByRole("button", { name: /Akwaaba Coast Hotel/ }));
    expect(screen.getByText("Selected Properties")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Next Step/ }));
    expect(await screen.findByText("Offer Name")).toBeTruthy();

    // Early Bird keeps the dates optional, so no date-picker interaction.
    await user.click(screen.getByRole("button", { name: /Early Bird/ }));
    await user.type(screen.getByPlaceholderText('e.g. "Weekend escape"'), "Last chance deal");
    await user.click(screen.getByRole("button", { name: /Next Step/ }));

    expect(await screen.findByText("Discount Percentage")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Publish Offer/ }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/stays/special-offers");
    });
    const created = (await staysMock.listOffers()).find(
      (offer) => offer.name === "Last chance deal",
    );
    expect(created).toMatchObject({
      offerType: "EARLY_BIRD",
      discountType: "PERCENTAGE",
      discountPercentage: 10,
      isActive: true,
      status: "active",
    });
    expect(created.targets[0]).toMatchObject({ propertyId: "p1" });
  });

  it("prefills an existing offer for editing", async () => {
    const user = userEvent.setup();
    renderBuilder("/stays/special-offers/build/offer-1");

    expect(await screen.findByText("Edit Offer")).toBeTruthy();
    expect(await screen.findByTestId("builder-status-badge")).toHaveTextContent("Active");
    expect(screen.getByText("Selected Properties")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Deluxe King Room" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Next Step/ }));
    expect(await screen.findByPlaceholderText('e.g. "Weekend escape"')).toHaveValue(
      "Weekend escape",
    );
  });

  it("preselects the property from the Properties-page deep link", async () => {
    renderBuilder("/stays/special-offers/build/new?property=p1");

    expect(await screen.findByText("Selected Properties")).toBeTruthy();
    expect(screen.getByText("Akwaaba Coast Hotel")).toBeTruthy();
  });
});
