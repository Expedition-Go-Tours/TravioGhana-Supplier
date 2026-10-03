/**
 * The property-type chooser is the entry page for a new listing: it renders
 * the four category cards from `PROPERTY_GROUPS`. Every card detours through
 * its own intro chain without creating a draft — Apartment's Quick start,
 * Homes' booking type, Hotel's category list and Alternative places' booking
 * type + category list. The draft is only created at the end of a chain.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyTypeChooserPage from "../PropertyTypeChooserPage";
import { PROPERTY_GROUPS } from "../../config/constants";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderChooser(initialEntry = "/stays/properties/build") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/stays/properties/build" element={<PropertyTypeChooserPage />} />
          <Route path="/stays/properties/build/quick-start" element={<div>Quick start</div>} />
          <Route path="/stays/properties/build/book-type" element={<div>Book type</div>} />
          <Route path="/stays/properties/build/hotel-category" element={<div>Hotel categories</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyTypeChooserPage", () => {
  it("renders the four category cards with copy and a single Quick start badge", () => {
    renderChooser();

    expect(
      screen.getByText("List your property on TravioGhana and start welcoming guests in no time!"),
    ).toBeTruthy();

    for (const group of PROPERTY_GROUPS) {
      expect(screen.getByText(group.label, { exact: true })).toBeTruthy();
      expect(screen.getByText(group.description)).toBeTruthy();
      expect(
        screen.getByRole("button", { name: `List your property: ${group.label}` }),
      ).toBeTruthy();
    }
    expect(screen.getAllByText("Quick start")).toHaveLength(1);
  });

  it("sends the Alternative places card to the booking-type intro without creating a draft", async () => {
    const user = userEvent.setup();
    renderChooser();

    const before = (await staysMock.listProperties()).length;
    await user.click(
      screen.getByRole("button", { name: "List your property: Alternative places" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/book-type?group=alternative",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("sends the Hotel card to the category list intro without creating a draft", async () => {
    const user = userEvent.setup();
    renderChooser();

    const before = (await staysMock.listProperties()).length;
    await user.click(
      screen.getByRole("button", { name: "List your property: Hotel, B&Bs, and more" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/hotel-category?group=hotel",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("carries the draft id through the chain when editing an existing property", async () => {
    const user = userEvent.setup();
    renderChooser("/stays/properties/build?draft=p-123");

    await user.click(screen.getByRole("button", { name: "List your property: Homes" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/book-type?group=homes&draft=p-123",
      );
    });
  });

  it("sends the quick-start card to its intro screen without creating a draft", async () => {
    const user = userEvent.setup();
    renderChooser();

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByRole("button", { name: "List your property: Apartment" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start?group=apartment",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("sends the Homes card to the booking-type intro without creating a draft", async () => {
    const user = userEvent.setup();
    renderChooser();

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByRole("button", { name: "List your property: Homes" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/book-type?group=homes",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });
});
