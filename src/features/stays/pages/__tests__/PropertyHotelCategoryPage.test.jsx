/**
 * The "Hotel, B&Bs, and more" sub-type screen: the full reference list shows
 * expanded by default with a "Less options" control that collapses it to the
 * first six, and Continue hands the chosen canonical type to the how-many
 * screen. No draft is created here.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyHotelCategoryPage from "../PropertyHotelCategoryPage";
import { HOTEL_CATEGORIES } from "../../config/constants";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(initialEntry = "/stays/properties/build/hotel-category?group=hotel") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route
            path="/stays/properties/build/hotel-category"
            element={<PropertyHotelCategoryPage />}
          />
          <Route path="/stays/properties/build/home-count" element={<div>How many</div>} />
          <Route path="/stays/properties/build" element={<div>Chooser</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyHotelCategoryPage — the full category list", () => {
  it("lands collapsed on the first six categories with More options", () => {
    renderPage();

    expect(
      screen.getByText(
        "From the list below, which property category is most similar to your place?",
      ),
    ).toBeTruthy();

    expect(HOTEL_CATEGORIES).toHaveLength(16);
    for (const category of HOTEL_CATEGORIES.slice(0, 6)) {
      expect(screen.getByText(category.label, { exact: true })).toBeTruthy();
      expect(screen.getByText(category.description)).toBeTruthy();
    }
    for (const category of HOTEL_CATEGORIES.slice(6)) {
      expect(screen.queryByText(category.label, { exact: true })).toBeNull();
    }

    const toggle = screen.getByRole("button", { name: /More options/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("expands to every reference category and collapses again", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /More options/ }));

    for (const category of HOTEL_CATEGORIES) {
      expect(screen.getByText(category.label, { exact: true })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: /Less options/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Less options/ }));
    expect(screen.queryByText("Lodge", { exact: true })).toBeNull();
    expect(screen.getByRole("button", { name: /More options/ })).toBeTruthy();
  });

  it("hands the chosen category to the how-many screen without creating a draft", async () => {
    const user = userEvent.setup();
    renderPage();

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByText("Hostel", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-count?group=hotel&booking=rooms&type=Hostel",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("maps the reference's display label to the canonical type", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Bed and breakfast", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-count?group=hotel&booking=rooms&type=Bed%20%26%20Breakfast",
      );
    });
  });

  it("opens and closes the reassurance dialog", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: /I don't see my property type on the list/i }),
    );
    expect(
      screen.getByText(/try to choose a category that is most similar to your property/),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => {
      expect(
        screen.queryByText(/try to choose a category that is most similar to your property/),
      ).toBeNull();
    });
  });

  it("goes back to the chooser", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/stays/properties/build");
    });
  });
});
