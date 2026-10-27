import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyPreviewPage from "../PropertyPreviewPage";
import { staysMock } from "../../mock/store";
import { TeamRoleContext } from "@/contexts/teamRoleContext";

beforeEach(() => staysMock.reset());

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(initialEntry = "/stays/properties/p1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamRoleContext.Provider value={{ hasPermission: () => true, loading: false }}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <LocationProbe />
          <Routes>
            <Route path="/stays/properties/:id" element={<PropertyPreviewPage />} />
            <Route path="/stays/properties" element={<div>Properties list</div>} />
            <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
            <Route path="/stays/properties/build" element={<div>Category chooser</div>} />
          </Routes>
        </MemoryRouter>
      </TeamRoleContext.Provider>
    </QueryClientProvider>,
  );
}

describe("PropertyPreviewPage", () => {
  it("renders the full property page and back navigation", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Akwaaba Coast Hotel" })).toBeTruthy();
    expect(screen.getByText("Deluxe King Room")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit listing" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Properties/ }));
    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/stays/properties");
    });
  });

  it("routes the page's edit actions to the builder", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: "Akwaaba Coast Hotel" });
    await user.click(screen.getByRole("button", { name: "Edit photos" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/p1?section=photos&step=photos",
      );
    });
  });

  it("opens the builder root from the page's Edit listing action", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: "Akwaaba Coast Hotel" });
    await user.click(screen.getByRole("button", { name: "Edit listing" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/stays/properties/build/p1");
    });
  });
});
