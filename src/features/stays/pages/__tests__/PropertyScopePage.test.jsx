/**
 * The Quick start "How many apartments are you listing?" screen:
 *   - no default choice, Continue disabled until the path is answered;
 *   - One apartment navigates to the confirmation screen;
 *   - Multiple apartments reveals the address question + property count inline
 *     and carries those answers to the other-listings screen;
 *   - neither path creates a draft here.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyScopePage from "../PropertyScopePage";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderScope(initialEntry = "/stays/properties/build/quick-start?group=apartment") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/stays/properties/build/quick-start" element={<PropertyScopePage />} />
          <Route path="/stays/properties/build/quick-start/confirm" element={<div>Confirm</div>} />
          <Route path="/stays/properties/build/quick-start/other-listings" element={<div>Other listings</div>} />
          <Route path="/stays/properties/build" element={<div>Chooser</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyScopePage — quick-start intro", () => {
  it("asks the question with no default and a disabled Continue", () => {
    renderScope();

    expect(screen.getByText("How many apartments are you listing?")).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios.every((radio) => !radio.checked)).toBe(true);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("sends One apartment to the confirmation screen without creating a draft", async () => {
    const user = userEvent.setup();
    renderScope();

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByText("One apartment"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start/confirm?group=apartment&scope=one",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("reveals the address question for Multiple and carries its answers forward", async () => {
    const user = userEvent.setup();
    renderScope();

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByText("Multiple apartments"));
    expect(screen.getByText("Are these properties in the same address or building?")).toBeTruthy();
    expect(screen.getByLabelText("Number of properties").value).toBe("2");
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);

    await user.click(
      screen.getByText(/Yes, these apartments are at the same address or building/),
    );
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(false);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start/other-listings?group=apartment&scope=multiple&sameAddress=same&count=2",
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);
  });

  it("carries different addresses and a custom property count", async () => {
    const user = userEvent.setup();
    renderScope();

    await user.click(screen.getByText("Multiple apartments"));
    await user.click(
      screen.getByText(/No, these apartments are at different addresses or buildings/),
    );

    const countInput = screen.getByLabelText("Number of properties");
    await user.clear(countInput);
    await user.type(countInput, "5");

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start/other-listings?group=apartment&scope=multiple&sameAddress=different&count=5",
      );
    });
  });

  it("allows a count of 1 and keeps Continue disabled out of range", async () => {
    const user = userEvent.setup();
    renderScope();

    await user.click(screen.getByText("Multiple apartments"));
    await user.click(
      screen.getByText(/Yes, these apartments are at the same address or building/),
    );

    const countInput = screen.getByLabelText("Number of properties");
    await user.clear(countInput);
    await user.type(countInput, "0");
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);

    await user.clear(countInput);
    await user.type(countInput, "1");
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(false);

    await user.clear(countInput);
    await user.type(countInput, "101");
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("restores the One apartment answer when returning from a later step", () => {
    renderScope("/stays/properties/build/quick-start?group=apartment&scope=one");

    expect(screen.getByRole("radio", { name: /One apartment/ }).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(false);
  });

  it("restores the Multiple answers when returning from a later step", () => {
    renderScope(
      "/stays/properties/build/quick-start?group=apartment&scope=multiple&sameAddress=different&count=7",
    );

    expect(screen.getByRole("radio", { name: /Multiple apartments/ }).checked).toBe(true);
    expect(
      screen.getByRole("radio", { name: /different addresses or buildings/ }).checked,
    ).toBe(true);
    expect(screen.getByLabelText("Number of properties").value).toBe("7");
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(false);
  });

  it("goes back to the category chooser", async () => {
    const user = userEvent.setup();
    renderScope();

    await user.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/stays/properties/build");
    });
  });
});
