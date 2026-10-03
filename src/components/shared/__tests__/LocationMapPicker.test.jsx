/**
 * The manual fallback: when the search can't find a property, the supplier can
 * paste a Google Maps link (coordinates are captured automatically) or type the
 * name and latitude/longitude. Every pin is reverse-geocoded for the address
 * parts, and the coordinates entered always win over the reverse response.
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

import LocationMapPicker from "../LocationMapPicker";

const REVERSE_ADDRESS = "12 Independence Ave, Accra, Greater Accra, Ghana";

describe("LocationMapPicker manual coordinates", () => {
  it("emits the pin with the typed location name and the reverse-geocoded address parts", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LocationMapPicker onSelect={onSelect} allowManualCoordinates />);

    await user.click(screen.getByRole("button", { name: /can't find your location/i }));
    await user.type(screen.getByLabelText("Location name"), "Kwame's Homestay");
    await user.type(screen.getByLabelText("Latitude"), "5.6037");
    await user.type(screen.getByLabelText("Longitude"), "-0.187");
    await user.click(screen.getByRole("button", { name: /place pin/i }));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        formatted: "Kwame's Homestay",
        city: "Accra",
        country: "Ghana",
        region: "Greater Accra",
        latitude: 5.6037,
        longitude: -0.187,
      });
    });
    expect(screen.getByText("Kwame's Homestay")).toBeTruthy();
  });

  it("falls back to the reverse-geocoded address when no name is typed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LocationMapPicker onSelect={onSelect} allowManualCoordinates />);

    await user.click(screen.getByRole("button", { name: /can't find your location/i }));
    await user.type(screen.getByLabelText("Latitude"), "5.6");
    await user.type(screen.getByLabelText("Longitude"), "-0.18");
    await user.click(screen.getByRole("button", { name: /place pin/i }));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          formatted: REVERSE_ADDRESS,
          latitude: 5.6,
          longitude: -0.18,
        }),
      );
    });
  });

  it("captures the coordinates from a pasted Google Maps link", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LocationMapPicker onSelect={onSelect} allowManualCoordinates />);

    await user.click(screen.getByRole("button", { name: /can't find your location/i }));
    fireEvent.change(screen.getByLabelText("Google Maps link"), {
      target: {
        value:
          "https://www.google.com/maps/place/Roman+Ridge/@5.61,-0.19,17z/data=!3d5.6037!4d-0.1870",
      },
    });

    expect(screen.getByLabelText("Latitude").value).toBe("5.6037");
    expect(screen.getByLabelText("Longitude").value).toBe("-0.187");

    await user.click(screen.getByRole("button", { name: /place pin/i }));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        formatted: "Roman Ridge",
        city: "Accra",
        country: "Ghana",
        region: "Greater Accra",
        latitude: 5.6037,
        longitude: -0.187,
      });
    });
  });

  it("explains short Google links instead of failing silently", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LocationMapPicker onSelect={onSelect} allowManualCoordinates />);

    await user.click(screen.getByRole("button", { name: /can't find your location/i }));
    fireEvent.change(screen.getByLabelText("Google Maps link"), {
      target: { value: "https://maps.app.goo.gl/abc123" },
    });

    expect(screen.getByText(/short google links can't be read here/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /place pin/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("rejects out-of-range coordinates with a message and does not emit", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LocationMapPicker onSelect={onSelect} allowManualCoordinates />);

    await user.click(screen.getByRole("button", { name: /can't find your location/i }));
    await user.type(screen.getByLabelText("Latitude"), "120");
    await user.type(screen.getByLabelText("Longitude"), "0");
    await user.click(screen.getByRole("button", { name: /place pin/i }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/latitude between -90 and 90/i)).toBeTruthy();
  });

  it("shows the saved pin label and coordinates for an existing property", () => {
    render(
      <LocationMapPicker
        onSelect={() => {}}
        initialLat={5.557}
        initialLng={-0.172}
        initialFormatted="Labone, Accra, Ghana"
      />,
    );

    expect(screen.getByText("Labone")).toBeTruthy();
    expect(screen.getByText("5.55700, -0.17200")).toBeTruthy();
  });
});
