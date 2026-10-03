/**
 * The category chains' "How many are you listing?" screen: the question is
 * worded for the chosen category, the options carry the chain's reference copy
 * (short for an entire place, room-based for private/hotel), and Continue
 * creates the draft with the type, booking type and listing scope before
 * opening the builder at the Location step.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyHomeCountPage from "../PropertyHomeCountPage";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(
  initialEntry = "/stays/properties/build/home-count?group=homes&booking=entire&type=Chalet",
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/stays/properties/build/home-count" element={<PropertyHomeCountPage />} />
          <Route path="/stays/properties/build/home-category" element={<div>Categories</div>} />
          <Route path="/stays/properties/build/hotel-category" element={<div>Hotel categories</div>} />
          <Route path="/stays/properties/build/alternative-category" element={<div>Alternative categories</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyHomeCountPage — how many are you listing", () => {
  it("words the question for the chosen category with the reference options", () => {
    renderPage(
      "/stays/properties/build/home-count?group=homes&booking=private&type=Guesthouse",
    );

    expect(screen.getByText("How many guest houses are you listing?")).toBeTruthy();
    expect(
      screen.getByText("One guest house with one or multiple rooms that guests can book"),
    ).toBeTruthy();
    expect(
      screen.getByText("Multiple guest houses with one or multiple rooms that guests can book"),
    ).toBeTruthy();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios.every((radio) => !radio.checked)).toBe(true);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("uses the short labels for the entire-place path", () => {
    renderPage();

    expect(screen.getByText("How many chalets are you listing?")).toBeTruthy();
    expect(screen.getByText("One chalet", { exact: true })).toBeTruthy();
    expect(screen.getByText("Multiple chalets", { exact: true })).toBeTruthy();
    expect(
      screen.queryByText("One chalet with one or multiple rooms that guests can book"),
    ).toBeNull();
  });

  it("creates the draft with the scope and opens builder Step 2", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("One chalet", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toMatch(
        /^\/stays\/properties\/build\/p-.+\?section=basic-information&step=location$/,
      );
    });

    const id = screen.getByTestId("location").textContent.match(/\/build\/(p-[^?]+)/)[1];
    const created = await staysMock.getProperty(id);
    expect(created.type).toBe("Chalet");
    expect(created.bookingType).toBe("Entire property");
    expect(created.listingScope).toBe("One property");
  });

  it("maps Multiple to the multiple listing scope", async () => {
    const user = userEvent.setup();
    renderPage(
      "/stays/properties/build/home-count?group=homes&booking=private&type=Farm%20stay",
    );

    await user.click(
      screen.getByText(/^Multiple farm stays with one or multiple rooms/),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toMatch(/step=location$/);
    });

    const id = screen.getByTestId("location").textContent.match(/\/build\/(p-[^?]+)/)[1];
    const created = await staysMock.getProperty(id);
    expect(created.type).toBe("Farm stay");
    expect(created.bookingType).toBe("Individual rooms");
    expect(created.listingScope).toBe("Multiple properties");
  });

  it("uses the room-based wording and Individual rooms for the hotel chain", async () => {
    const user = userEvent.setup();
    renderPage("/stays/properties/build/home-count?group=hotel&booking=rooms&type=Inn");

    expect(screen.getByText("How many inns are you listing?")).toBeTruthy();
    expect(
      screen.getByText("One inn with one or multiple rooms that guests can book"),
    ).toBeTruthy();
    expect(
      screen.getByText("Multiple inns with one or multiple rooms that guests can book"),
    ).toBeTruthy();

    await user.click(screen.getByText(/^One inn with one or multiple rooms/));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toMatch(/step=location$/);
    });

    const id = screen.getByTestId("location").textContent.match(/\/build\/(p-[^?]+)/)[1];
    const created = await staysMock.getProperty(id);
    expect(created.type).toBe("Inn");
    expect(created.bookingType).toBe("Individual rooms");
    expect(created.listingScope).toBe("One property");
  });

  it("goes back to the hotel category list for the hotel chain", async () => {
    const user = userEvent.setup();
    renderPage("/stays/properties/build/home-count?group=hotel&booking=rooms&type=Hotel");

    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/hotel-category?group=hotel",
      );
    });
  });

  it("updates the existing draft instead of creating one when editing", async () => {
    const user = userEvent.setup();
    const existing = await staysMock.createProperty({
      name: "Existing",
      type: "Villa",
      step: 4,
    });
    renderPage(
      `/stays/properties/build/home-count?group=homes&booking=entire&type=Apartment&draft=${existing.id}`,
    );

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByText("One apartment", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        `/stays/properties/build/${existing.id}`,
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);

    const updated = await staysMock.getProperty(existing.id);
    expect(updated.type).toBe("Apartment");
    expect(updated.bookingType).toBe("Entire property");
    expect(updated.listingScope).toBe("One property");
    // Editing keeps the draft's progress.
    expect(updated.step).toBe(4);
  });

  it("goes back to the alternative category list for the alternative chain", async () => {
    const user = userEvent.setup();
    renderPage(
      "/stays/properties/build/home-count?group=alternative&booking=private&type=Campsite",
    );

    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/alternative-category?group=alternative&booking=private",
      );
    });
  });

  it("goes back to the category list with the booking type kept", async () => {
    const user = userEvent.setup();
    renderPage(
      "/stays/properties/build/home-count?group=homes&booking=private&type=Guesthouse",
    );

    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-category?group=homes&booking=private",
      );
    });
  });
});
