/**
 * The One-apartment confirmation screen: shows the listing sentence, hands off
 * to the other-listings question without creating a draft, and sends "No, I
 * need to make a change" back to the scope screen with the answer kept.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyConfirmPage from "../PropertyConfirmPage";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderConfirm(
  initialEntry = "/stays/properties/build/quick-start/confirm?group=apartment&scope=one",
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/stays/properties/build/quick-start/confirm" element={<PropertyConfirmPage />} />
          <Route path="/stays/properties/build/quick-start/other-listings" element={<div>Other listings</div>} />
          <Route path="/stays/properties/build/quick-start" element={<div>Scope</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyConfirmPage — One apartment confirmation", () => {
  it("shows the listing sentence and both actions", () => {
    renderConfirm();

    expect(screen.getByText("You're listing:")).toBeTruthy();
    expect(
      screen.getByText("One apartment where guests can book the entire place"),
    ).toBeTruthy();
    expect(screen.getByText("Does this sound like your property?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, I need to make a change" })).toBeTruthy();
  });

  it("moves to the other-listings screen without creating a draft", async () => {
    const user = userEvent.setup();
    renderConfirm();

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start/other-listings?group=apartment&scope=one",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("returns to the scope screen with the answer kept", async () => {
    const user = userEvent.setup();
    renderConfirm();

    await user.click(screen.getByRole("button", { name: "No, I need to make a change" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start?group=apartment&scope=one",
      );
    });
    expect(screen.getByText("Scope")).toBeTruthy();
  });

  it("redirects to the scope screen when opened without a valid answer", async () => {
    renderConfirm("/stays/properties/build/quick-start/confirm?group=apartment");

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start?group=apartment",
      );
    });
  });
});
