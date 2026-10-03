/**
 * The Quick start "Where else is your property listed?" screen:
 *   - Continue stays disabled until at least one choice is made;
 *   - "My property isn't listed on any other websites" is exclusive;
 *   - continuing creates the draft with every answer collected by the intro
 *     screens and opens the builder's Location step (under Basic Information);
 *   - returning from the builder restores the ticked sites.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import PropertyOtherListingsPage from "../PropertyOtherListingsPage";
import { staysMock } from "../../mock/store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderOtherListings(
  initialEntry = "/stays/properties/build/quick-start/other-listings?group=apartment&scope=one",
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route
            path="/stays/properties/build/quick-start/other-listings"
            element={<PropertyOtherListingsPage />}
          />
          <Route path="/stays/properties/build/quick-start/confirm" element={<div>Confirm</div>} />
          <Route path="/stays/properties/build/quick-start" element={<div>Scope</div>} />
          <Route path="/stays/properties/build/:id" element={<div>Builder</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function continueToBuilder() {
  await waitFor(() => {
    expect(screen.getByTestId("location").textContent).toMatch(
      /^\/stays\/properties\/build\/p-.+\?section=basic-information&step=location$/,
    );
  });
  return screen.getByTestId("location").textContent.match(/\/build\/(p-[^?]+)/)[1];
}

describe("PropertyOtherListingsPage — quick-start closing question", () => {
  it("lists the sites plus the exclusive none option with Continue disabled", () => {
    renderOtherListings();

    expect(screen.getByText("Where else is your property listed?")).toBeTruthy();
    expect(screen.getByText(/importing it directly to TravioGhana/)).toBeTruthy();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(5);
    expect(checkboxes.every((box) => !box.checked)).toBe(true);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });

  it("creates the draft with the chosen sites and opens the builder's Location step", async () => {
    const user = userEvent.setup();
    renderOtherListings();

    await user.click(screen.getByRole("checkbox", { name: "Airbnb" }));
    await user.click(screen.getByRole("checkbox", { name: "Vrbo" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const id = await continueToBuilder();
    const created = await staysMock.getProperty(id);
    expect(created.type).toBe("Apartment");
    expect(created.listingScope).toBe("One property");
    expect(created.otherListings).toEqual(["Airbnb", "Vrbo"]);
    expect(created.noOtherListings).toBe(false);
  });

  it("updates the existing draft instead of creating one when editing", async () => {
    const user = userEvent.setup();
    const existing = await staysMock.createProperty({
      name: "Existing",
      type: "Apartment",
      step: 6,
    });
    renderOtherListings(
      `/stays/properties/build/quick-start/other-listings?group=apartment&scope=multiple&sameAddress=same&count=3&draft=${existing.id}`,
    );

    const before = (await staysMock.listProperties()).length;
    await user.click(screen.getByRole("checkbox", { name: "Airbnb" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        `/stays/properties/build/${existing.id}`,
      );
    });
    expect((await staysMock.listProperties()).length).toBe(before);

    const updated = await staysMock.getProperty(existing.id);
    expect(updated.listingScope).toBe("Multiple properties");
    expect(updated.sameAddress).toBe(true);
    expect(updated.propertyCount).toBe(3);
    expect(updated.otherListings).toEqual(["Airbnb"]);
    // Editing keeps the draft's progress.
    expect(updated.step).toBe(6);
  });

  it("keeps the none option exclusive in both directions", async () => {
    const user = userEvent.setup();
    renderOtherListings();

    const airbnb = screen.getByRole("checkbox", { name: "Airbnb" });
    const none = screen.getByRole("checkbox", {
      name: "My property isn't listed on any other websites",
    });

    await user.click(airbnb);
    await user.click(none);
    expect(airbnb.checked).toBe(false);
    expect(none.checked).toBe(true);

    await user.click(airbnb);
    expect(airbnb.checked).toBe(true);
    expect(none.checked).toBe(false);

    // And picking none again clears the site before continuing.
    await user.click(none);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const id = await continueToBuilder();
    const created = await staysMock.getProperty(id);
    expect(created.otherListings).toEqual([]);
    expect(created.noOtherListings).toBe(true);
  });

  it("carries the Multiple answers into the draft", async () => {
    const user = userEvent.setup();
    renderOtherListings(
      "/stays/properties/build/quick-start/other-listings?group=apartment&scope=multiple&sameAddress=same&count=3",
    );

    await user.click(screen.getByRole("checkbox", { name: "TripAdvisor" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const id = await continueToBuilder();
    const created = await staysMock.getProperty(id);
    expect(created.listingScope).toBe("Multiple properties");
    expect(created.sameAddress).toBe(true);
    expect(created.propertyCount).toBe(3);
    expect(created.otherListings).toEqual(["TripAdvisor"]);
  });

  it("accepts a count of 1 for a Multiple listing", async () => {
    const user = userEvent.setup();
    renderOtherListings(
      "/stays/properties/build/quick-start/other-listings?group=apartment&scope=multiple&sameAddress=same&count=1",
    );

    // A count of 1 is valid: the page renders instead of redirecting.
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Airbnb" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const id = await continueToBuilder();
    const created = await staysMock.getProperty(id);
    expect(created.propertyCount).toBe(1);
  });

  it("restores the ticked sites when returning from the builder", () => {
    renderOtherListings(
      "/stays/properties/build/quick-start/other-listings?group=apartment&scope=one&listings=Airbnb%2CVrbo",
    );

    expect(screen.getByRole("checkbox", { name: "Airbnb" }).checked).toBe(true);
    expect(screen.getByRole("checkbox", { name: "Vrbo" }).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(false);
  });

  it("redirects to the scope screen when the earlier answers are missing", async () => {
    renderOtherListings("/stays/properties/build/quick-start/other-listings?group=apartment");

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start?group=apartment",
      );
    });
  });

  it("redirects when a Multiple listing is missing its answers", async () => {
    renderOtherListings(
      "/stays/properties/build/quick-start/other-listings?group=apartment&scope=multiple&sameAddress=same",
    );

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start?group=apartment",
      );
    });
  });

  it("goes back to the previous step for both paths", async () => {
    const user = userEvent.setup();
    const { unmount } = renderOtherListings();

    await user.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start/confirm?group=apartment&scope=one",
      );
    });
    unmount();

    renderOtherListings(
      "/stays/properties/build/quick-start/other-listings?group=apartment&scope=multiple&sameAddress=different&count=4",
    );
    await user.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/stays/properties/build/quick-start?group=apartment&scope=multiple&sameAddress=different&count=4",
      );
    });
  });
});
