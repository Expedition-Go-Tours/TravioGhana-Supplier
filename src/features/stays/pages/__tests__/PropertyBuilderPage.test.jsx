/**
 * Regression coverage for the builder's boot states and the full-bleed
 * Location step:
 *   - `/stays/properties/build/new` must start a fresh draft. It used to be
 *     treated as an existing property ID, so the fetch 404'd and the page sat
 *     on its loading spinner forever.
 *   - a missing draft must show the not-found card, never spin forever.
 *   - the Location step (Basic Information) validates address/city/pin through
 *     its own Continue, then advances the builder.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// The Location step renders the full-bleed MapLibre canvas; the boot and
// validation tests only need it to exist, so render a stub.
vi.mock("@/features/stays/components/PropertyLocationMap", () => ({
  default: () => <div data-testid="location-map" />,
}));

import PropertyBuilderPage from "../PropertyBuilderPage";
import { staysMock } from "@/features/stays/mock/store";

// jsdom does not implement smooth scrolling; the builder resets the step
// scroll position on mount.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderBuilder(initialEntry) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/stays/properties/build/:id" element={<PropertyBuilderPage />} />
          <Route path="/stays/properties/build" element={<div>Chooser</div>} />
          <Route path="/stays/properties" element={<div>Properties list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PropertyBuilderPage boot states", () => {
  it("starts a fresh draft for /build/new and leaves the loading screen", async () => {
    renderBuilder("/stays/properties/build/new");

    expect(await screen.findByText("Create New Property", {}, { timeout: 5000 })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toMatch(
        /^\/stays\/properties\/build\/p-.+section=basic-information&step=location/,
      );
    });
  });

  it("shows a not-found card instead of buffering forever when the draft is gone", async () => {
    renderBuilder("/stays/properties/build/missing-draft");

    expect(await screen.findByText("Property not found", {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByRole("button", { name: /back to properties/i })).toBeTruthy();
  });
});

describe("PropertyBuilderPage — Location step", () => {
  it("requires a map pin before leaving the Location step", async () => {
    const user = userEvent.setup();
    const created = await staysMock.createProperty({
      name: "Pinless Property",
      city: "Accra",
      address: "12 Test Street",
    });
    renderBuilder(
      `/stays/properties/build/${created.id}?section=basic-information&step=location`,
    );

    expect(await screen.findByTestId("location-map")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Place the pin on the map to continue")).toBeTruthy();
  });

  it("shows Back beside Continue on the first step and reopens the category chain", async () => {
    const user = userEvent.setup();
    const created = await staysMock.createProperty({
      name: "Back Location",
      type: "Villa",
      step: 1,
    });
    renderBuilder(
      `/stays/properties/build/${created.id}?section=basic-information&step=location`,
    );

    expect(await screen.findByTestId("location-map")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        `/stays/properties/build?draft=${created.id}`,
      );
    });
  });

  it("continues to the next step once the draft has a pin", async () => {
    const user = userEvent.setup();
    const created = await staysMock.createProperty({
      name: "Pinned Property",
      city: "Accra",
      address: "12 Test Street",
      lat: 5.557,
      lng: -0.172,
      mapAddress: "Labone, Accra, Ghana",
    });
    renderBuilder(
      `/stays/properties/build/${created.id}?section=basic-information&step=location`,
    );

    expect(await screen.findByTestId("location-map")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toMatch(/step=channel-manager/);
    });
  });
});

describe("PropertyBuilderPage — sidebar navigation", () => {
  it("reopens the category chain for this draft when step 1 is clicked", async () => {
    const user = userEvent.setup();
    const created = await staysMock.createProperty({ name: "Step One", type: "Villa", step: 4 });
    renderBuilder(
      `/stays/properties/build/${created.id}?section=property-setup&step=languages`,
    );

    const stepOne = await screen.findByRole("button", { name: /Category & property type/ });
    await user.click(stepOne);

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        `/stays/properties/build?draft=${created.id}`,
      );
    });
  });

  it("navigates back to a completed step", async () => {
    const user = userEvent.setup();
    const created = await staysMock.createProperty({ name: "Stepped", type: "Villa", step: 4 });
    renderBuilder(
      `/stays/properties/build/${created.id}?section=property-setup&step=languages`,
    );

    const location = await screen.findByRole("button", { name: /Location/ });
    await user.click(location);

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toMatch(/step=location$/);
    });
  });
});

describe("PropertyBuilderPage — Channel manager step", () => {
  it("uses the step's own reference footer instead of the builder footer", async () => {
    const created = await staysMock.createProperty({ name: "Channel Property" });
    renderBuilder(
      `/stays/properties/build/${created.id}?section=basic-information&step=channel-manager`,
    );

    expect(await screen.findByText("Connect to a channel manager")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /save & continue/i })).toBeNull();
  });
});
