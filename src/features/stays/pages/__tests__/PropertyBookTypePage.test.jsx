/**
 * The Homes and Alternative places cards' intro screen: "What can guests
 * book?" with no default, handing the choice off to the group's sub-type list
 * (no draft is created here).
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyBookTypePage from "../PropertyBookTypePage";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(initialEntry = "/stays/properties/build/book-type?group=homes") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/stays/properties/build/book-type" element={<PropertyBookTypePage />} />
          <Route path="/stays/properties/build/home-category" element={<div>Categories</div>} />
          <Route path="/stays/properties/build/alternative-category" element={<div>Categories</div>} />
          <Route path="/stays/properties/build" element={<div>Chooser</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyBookTypePage — what can guests book", () => {
  it("shows both options with no default and a disabled Continue", () => {
    renderPage();

    expect(screen.getByText("What can guests book?")).toBeTruthy();
    expect(screen.getByText("Entire place")).toBeTruthy();
    expect(screen.getByText(/Guests are able to use the entire place/)).toBeTruthy();
    expect(screen.getByText("A private room")).toBeTruthy();
    expect(screen.getByText(/Guests rent a room within the property/)).toBeTruthy();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios.every((radio) => !radio.checked)).toBe(true);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("sends A private room to the private-room categories without creating a draft", async () => {
    const user = userEvent.setup();
    renderPage();

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByText("A private room"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-category?group=homes&booking=private",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("sends Entire place to the entire-place categories", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Entire place"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-category?group=homes&booking=entire",
      );
    });
  });

  it("sends Alternative places to its own category list", async () => {
    const user = userEvent.setup();
    renderPage("/stays/properties/build/book-type?group=alternative");

    await user.click(screen.getByText("Entire place"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/alternative-category?group=alternative&booking=entire",
      );
    });
  });

  it("carries the draft id forward when editing an existing property", async () => {
    const user = userEvent.setup();
    renderPage("/stays/properties/build/book-type?group=homes&draft=p-123");

    await user.click(screen.getByText("Entire place"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/home-category?group=homes&booking=entire&draft=p-123",
      );
    });
  });

  it("restores the answered booking type when returning", () => {
    renderPage("/stays/properties/build/book-type?group=homes&booking=private");

    expect(screen.getByRole("radio", { name: /A private room/ }).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(false);
  });

  it("goes back to the category chooser", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/stays/properties/build");
    });
  });
});
