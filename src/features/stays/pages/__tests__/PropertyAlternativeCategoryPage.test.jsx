/**
 * The "Alternative places" sub-type screen: Booking's three categories
 * (Campsite, Boat, Luxury tent), no default selection, and Continue handing
 * the chosen canonical type to the how-many screen. No draft is created here.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyAlternativeCategoryPage from "../PropertyAlternativeCategoryPage";
import { ALTERNATIVE_CATEGORIES } from "../../config/constants";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(
  initialEntry = "/stays/properties/build/alternative-category?group=alternative&booking=entire",
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route
            path="/stays/properties/build/alternative-category"
            element={<PropertyAlternativeCategoryPage />}
          />
          <Route path="/stays/properties/build/home-count" element={<div>How many</div>} />
          <Route path="/stays/properties/build/book-type" element={<div>Booking type</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyAlternativeCategoryPage — the three alternative categories", () => {
  it("shows the reference categories with no default and a disabled Continue", () => {
    renderPage();

    expect(
      screen.getByText(
        "From the list below, which property category is most similar to your place?",
      ),
    ).toBeTruthy();

    expect(ALTERNATIVE_CATEGORIES).toHaveLength(3);
    for (const category of ALTERNATIVE_CATEGORIES) {
      expect(screen.getByText(category.type, { exact: true })).toBeTruthy();
      expect(screen.getByText(category.description)).toBeTruthy();
    }

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios.every((radio) => !radio.checked)).toBe(true);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("hands the chosen category to the how-many screen without creating a draft", async () => {
    const user = userEvent.setup();
    renderPage(
      "/stays/properties/build/alternative-category?group=alternative&booking=private",
    );

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByText("Luxury tent", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-count?group=alternative&booking=private&type=Luxury%20tent",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("keeps the Entire place booking type when carrying a category forward", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Campsite", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-count?group=alternative&booking=entire&type=Campsite",
      );
    });
  });

  it("goes back to the booking-type screen with the answer kept", async () => {
    const user = userEvent.setup();
    renderPage(
      "/stays/properties/build/alternative-category?group=alternative&booking=private",
    );

    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/book-type?group=alternative&booking=private",
      );
    });
  });
});
