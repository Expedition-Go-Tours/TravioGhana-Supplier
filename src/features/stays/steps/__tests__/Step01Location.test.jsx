/**
 * STEP 3 — Location, the immersive map step inside the builder: the address
 * card over the MapLibre map, the Google Maps fallback that captures
 * coordinates, validation before continuing, and Back/Continue driving the
 * builder's navigation.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/maplibreWorker", () => ({}));

vi.mock("maplibre-gl", () => {
  class Map {
    on() {
      return this;
    }
    addControl() {
      return this;
    }
    remove() {}
    flyTo() {}
  }
  class Marker {
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
    on() {
      return this;
    }
    remove() {}
  }
  class NavigationControl {}
  return { Map, Marker, NavigationControl };
});

import Step01Location from "../Step01Location";

const REVERSE_ADDRESS = "12 Independence Ave, Accra, Greater Accra, Ghana";

function emptyProperty(overrides = {}) {
  return {
    address: "",
    apartment: "",
    country: "Ghana",
    city: "",
    postcode: "",
    region: "",
    lat: null,
    lng: null,
    mapAddress: "",
    ...overrides,
  };
}

function renderStep({ property = emptyProperty(), patch = vi.fn(), onBack = vi.fn(), onNext = vi.fn() } = {}) {
  render(
    <Step01Location property={property} patch={patch} onBack={onBack} onNext={onNext} />,
  );
  return { patch, onBack, onNext };
}

describe("Step01Location — immersive location step", () => {
  it("shows the address card and its controls over the map", () => {
    renderStep();

    expect(screen.getByText("Where is your property?")).toBeTruthy();
    expect(screen.getByText("Find your address")).toBeTruthy();
    expect(screen.getByText("Apartment or floor number (optional)")).toBeTruthy();
    expect(screen.getByText("Country/region")).toBeTruthy();
    expect(screen.getByText("City")).toBeTruthy();
    expect(screen.getByText("Post code / Zip code")).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: /update the address when moving the pin/i }).checked,
    ).toBe(true);
    expect(screen.getByText(/is the red pin location incorrect/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });

  it("patches the draft as the address is typed", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.type(screen.getByPlaceholderText("Roman Ridge"), "Roman");

    expect(patch).toHaveBeenCalledWith({ address: "Roman" });
  });

  it("requires an address, a city and a pin before continuing", async () => {
    const user = userEvent.setup();
    const { onNext } = renderStep();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Add your property's address")).toBeTruthy();
    expect(screen.getByText("Add the city or town")).toBeTruthy();
    expect(screen.getByText("Place the pin on the map to continue")).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("captures a pasted Google Maps link into the draft", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    await user.click(screen.getByRole("button", { name: /paste a google maps link/i }));
    fireEvent.change(screen.getByLabelText("Google Maps link"), {
      target: { value: "https://maps.google.com/?q=5.6037,-0.1870" },
    });
    await user.click(screen.getByRole("button", { name: /place pin/i }));

    expect(patch).toHaveBeenCalledWith({ lat: 5.6037, lng: -0.187 });
    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith(
        expect.objectContaining({
          address: REVERSE_ADDRESS,
          city: "Accra",
          region: "Greater Accra",
          country: "Ghana",
          mapAddress: REVERSE_ADDRESS,
        }),
      );
    });
  });

  it("continues through the builder once the location is complete", async () => {
    const user = userEvent.setup();
    const { onNext } = renderStep({
      property: emptyProperty({
        address: "12 Independence Ave",
        city: "Accra",
        lat: 5.6037,
        lng: -0.187,
      }),
    });

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("goes back through the builder", async () => {
    const user = userEvent.setup();
    const { onBack } = renderStep();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
