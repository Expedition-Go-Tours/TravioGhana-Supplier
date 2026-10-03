/**
 * The Homes sub-type screen: the two category lists depend on the booking
 * type, no default selection, the reassurance dialog from "I don't see my
 * property type on the list", and creating the draft with the chosen type.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyHomeCategoryPage from "../PropertyHomeCategoryPage";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(
  initialEntry = "/stays/properties/build/home-category?group=homes&booking=entire",
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route
            path="/stays/properties/build/home-category"
            element={<PropertyHomeCategoryPage />}
          />
          <Route path="/stays/properties/build/home-count" element={<div>How many</div>} />
          <Route path="/stays/properties/build/book-type" element={<div>Booking type</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyHomeCategoryPage — which category is most similar", () => {
  it("shows the entire-place list with no default and a disabled Continue", () => {
    renderPage();

    expect(
      screen.getByText(
        "From the list below, which property category is most similar to your place?",
      ),
    ).toBeTruthy();
    for (const type of ["Apartment", "Holiday home", "Villa", "Chalet", "Holiday park", "Aparthotel"]) {
      expect(screen.getByText(type, { exact: true })).toBeTruthy();
    }
    expect(screen.queryByText("Farm stay")).toBeNull();
    expect(screen.queryByText("Guesthouse")).toBeNull();
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("shows the private-room list for that booking type", () => {
    renderPage("/stays/properties/build/home-category?group=homes&booking=private");

    for (const type of [
      "Guesthouse",
      "Bed & Breakfast",
      "Homestay",
      "Country house",
      "Aparthotel",
      "Farm stay",
      "Lodge",
    ]) {
      expect(screen.getByText(type, { exact: true })).toBeTruthy();
    }
    expect(screen.queryByText("Villa")).toBeNull();
  });

  it("moves to the how-many screen with the chosen category and booking type", async () => {
    const user = userEvent.setup();
    renderPage();

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByText("Chalet", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-count?group=homes&booking=entire&type=Chalet",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("carries the private-room category and booking type forward", async () => {
    const user = userEvent.setup();
    renderPage("/stays/properties/build/home-category?group=homes&booking=private");

    await user.click(screen.getByText("Farm stay", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-count?group=homes&booking=private&type=Farm%20stay",
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

  it("goes back to the booking type with the answer kept", async () => {
    const user = userEvent.setup();
    renderPage("/stays/properties/build/home-category?group=homes&booking=private");

    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/book-type?group=homes&booking=private",
      );
    });
  });
});
