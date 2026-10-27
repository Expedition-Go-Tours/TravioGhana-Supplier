import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertiesListPage from "../PropertiesListPage";
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
      <MemoryRouter initialEntries={["/stays/properties"]}>
        <LocationProbe />
        <Routes>
          <Route path="/stays/properties" element={<PropertiesListPage />} />
          <Route path="/stays/properties/:id" element={<div>Preview page</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
          <Route path="/stays/properties/build" element={<div>Category chooser</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertiesListPage — preview navigation", () => {
  it("opens the full preview page from the eye action", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Akwaaba Coast Hotel")).toBeTruthy();
    await user.click(screen.getAllByRole("button", { name: "Preview property" })[0]);

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/stays/properties/p1");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
