import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyDetailsView from "../PropertyDetailsView";

const property = {
  id: "prop-1",
  name: "Akwaaba Coast Hotel",
  type: "Hotel",
  bookingType: "Individual rooms",
  listingScope: "One property",
  operating: "Open now",
  status: "Live",
  city: "Accra",
  region: "Greater Accra",
  country: "Ghana",
  address: "12 Independence Ave",
  postcode: "GA-123",
  lat: 5.557,
  lng: -0.172,
  mapAddress: "Labone, Accra, Ghana",
  shortDescription: "A quiet base near the coast",
  description: "A comfortable base for discovering Accra.",
  photos: [
    "https://example.com/photo-1.jpg",
    "https://example.com/photo-2.jpg",
  ],
  facilities: ["Free WiFi", "Air conditioning"],
  services: { breakfast: "Yes", parking: "Yes, free" },
  languages: ["English", "Twi"],
  rooms: [
    {
      id: "r1",
      kind: "Deluxe Room",
      name: "Deluxe King Room",
      count: 6,
      adults: 2,
      children: 1,
      beds: "1 king bed",
      size: 38,
      price: 750,
      weekend: 850,
      bathroom: "Private",
      meal: "Breakfast included",
      amenities: ["Desk", "Flat-screen TV"],
    },
  ],
  ratePlans: [
    {
      id: "plan-r1",
      roomId: "r1",
      name: "Standard rate",
      price: 750,
      weekend: 850,
      cancellation: "Free cancellation",
      freeCancellationHours: 24,
      bookingCutoffHours: 2,
      minStay: 1,
      maxStay: 30,
      meal: "Breakfast included",
    },
  ],
  sleeping: {
    bedrooms: [{ id: "b1", name: "Bedroom 1", doubleBeds: 1, singleBeds: 0 }],
    livingRoomBeds: 1,
    otherSpacesBeds: 0,
  },
  maxGuests: 4,
  bathrooms: 2,
  size: 80,
  sizeUnit: "square metres",
  checkin: "14:00",
  checkinEnd: "18:00",
  checkoutStart: "08:00",
  checkout: "11:00",
  smoking: "No smoking",
  parties: "Not allowed",
  pets: "Not allowed",
  children: "Welcome",
  cots: "Not available",
  bookingPreference: "instant",
  payments: { mode: "Online when they book" },
  channelManager: { connected: true, name: "SiteMinder" },
  hostProfile: {
    property: { included: true, about: "A garden villa with a shaded terrace." },
    host: { included: true, name: "Ama", about: "Ama has hosted guests for ten years." },
    neighbourhood: { included: false, about: "" },
    none: false,
  },
  ratePlanSettings: {
    standard: {
      cancellation: "Free up to 1 day before arrival",
      twoGuests: 29,
      oneGuest: 26.1,
    },
    child: { free: true, maxAge: 17 },
    nonRefundable: { discount: 10 },
    weekly: { discount: 15, minNights: 7 },
  },
  startMode: "asap",
  start: "",
  calendarWindow: "365 days",
  calendarImport: { mode: "import", url: "" },
  longStays: "Yes",
  currency: "GHS",
  pricePerNight: "750",
};

const FIVE_PHOTOS = Array.from(
  { length: 5 },
  (_, index) => `https://example.com/gallery-${index + 1}.jpg`,
);

function renderView({ canEdit = true, onEdit = vi.fn(), overrides = {} } = {}) {
  render(
    <PropertyDetailsView
      property={{ ...property, ...overrides }}
      onEdit={onEdit}
      canEdit={canEdit}
    />,
  );
  return { onEdit };
}

describe("PropertyDetailsView", () => {
  it("shows the full property details", () => {
    renderView();

    expect(screen.getByText("A quiet base near the coast")).toBeTruthy();
    expect(screen.getByText("A comfortable base for discovering Accra.")).toBeTruthy();
    expect(screen.getByText("Deluxe King Room")).toBeTruthy();
    expect(screen.getByText("Standard rate")).toBeTruthy();
    expect(screen.getByText("Free WiFi")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.getByText("Breakfast included")).toBeTruthy();
    expect(screen.getByText("No smoking")).toBeTruthy();
    expect(screen.getByText("A garden villa with a shaded terrace.")).toBeTruthy();
    expect(screen.getByText(/12 Independence Ave/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open in Google Maps/ })).toBeTruthy();
  });

  it("renders the overview facts in the summary card", () => {
    renderView();

    const heading = screen.getByRole("heading", { name: "Overview" });
    const overview = within(heading.closest("section"));

    expect(heading.querySelector("svg")).toBeNull();
    expect(overview.getAllByTestId("overview-fact-icon")).toHaveLength(6);
    expect(overview.getByText("Live")).toBeTruthy();
    expect(overview.getByText("Individual rooms")).toBeTruthy();
    expect(overview.getByText("Guests")).toBeTruthy();
    expect(overview.getByText("Bedrooms")).toBeTruthy();
    expect(overview.getByText("Bathrooms")).toBeTruthy();
    expect(overview.getByText("Room types")).toBeTruthy();
    expect(overview.getByText("Size")).toBeTruthy();
    expect(overview.getByText("Nightly price")).toBeTruthy();
    expect(overview.getByText("4")).toBeTruthy();
    expect(overview.getByText("2")).toBeTruthy();
    expect(overview.getByText("80 square metres")).toBeTruthy();
    expect(overview.getByText("GHS 750")).toBeTruthy();
  });

  it("places listing and booking settings directly after About this property", () => {
    renderView();

    const headings = screen.getAllByRole("heading", { level: 3 });
    const about = headings.findIndex((heading) => heading.textContent.trim() === "About this property");
    const listing = headings.findIndex(
      (heading) => heading.textContent.trim() === "Listing and booking settings",
    );

    expect(about).toBeGreaterThanOrEqual(0);
    expect(listing).toBe(about + 1);
  });

  it("places amenities and services directly after Rooms", () => {
    renderView();

    const headings = screen.getAllByRole("heading", { level: 3 });
    const rooms = headings.findIndex((heading) => heading.textContent.trim() === "Rooms");
    const amenities = headings.findIndex(
      (heading) => heading.textContent.trim() === "Amenities and services",
    );

    expect(rooms).toBeGreaterThanOrEqual(0);
    expect(amenities).toBe(rooms + 1);
  });

  it("renders the five-photo mosaic and browses it in the lightbox", async () => {
    const user = userEvent.setup();
    renderView({ overrides: { photos: FIVE_PHOTOS } });

    expect(screen.getByTestId("preview-main-photo")).toHaveAttribute("src", FIVE_PHOTOS[0]);
    expect(screen.getByRole("button", { name: "View all 5 photos" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "View all 5 photos" }));

    const dialog = await screen.findByRole("dialog", {
      name: /Photos of Akwaaba Coast Hotel/i,
    });
    expect(within(dialog).getByText("1 / 5")).toBeTruthy();
    expect(within(dialog).getByRole("img", { name: /photo 1/i })).toHaveAttribute(
      "src",
      FIVE_PHOTOS[0],
    );

    await user.click(within(dialog).getByRole("button", { name: "Next photo" }));
    expect(within(dialog).getByText("2 / 5")).toBeTruthy();
    expect(within(dialog).getByRole("img", { name: /photo 2/i })).toHaveAttribute(
      "src",
      FIVE_PHOTOS[1],
    );

    await user.click(within(dialog).getByRole("button", { name: "Close photo viewer" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("uses a simple grid and opens the lightbox for fewer than five photos", async () => {
    const user = userEvent.setup();
    renderView();

    expect(screen.getByTestId("preview-main-photo")).toHaveAttribute("src", property.photos[0]);
    expect(screen.queryByRole("button", { name: /View all .* photos/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open photo 2" }));

    const dialog = await screen.findByRole("dialog", {
      name: /Photos of Akwaaba Coast Hotel/i,
    });
    expect(within(dialog).getByText("2 / 2")).toBeTruthy();
    expect(within(dialog).getByRole("img", { name: /photo 2/i })).toHaveAttribute(
      "src",
      property.photos[1],
    );

    await user.click(within(dialog).getByRole("button", { name: "Close photo viewer" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("deep-links every edit action to its builder step", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderView();

    const targets = [
      ["Edit photos", "/stays/properties/build/prop-1?section=photos&step=photos"],
      ["Edit property details", "/stays/properties/build/prop-1?section=property-setup&step=property-details"],
      ["Edit description", "/stays/properties/build/prop-1?section=property-setup&step=property-details"],
      ["Edit rooms", "/stays/properties/build/prop-1?section=property-setup&step=property-details"],
      ["Edit sleeping arrangements", "/stays/properties/build/prop-1?section=property-setup&step=property-details"],
      ["Edit pricing and rate plans", "/stays/properties/build/prop-1?section=pricing-calendar&step=rates"],
      ["Edit availability", "/stays/properties/build/prop-1?section=pricing-calendar&step=availability"],
      ["Edit house rules", "/stays/properties/build/prop-1?section=property-setup&step=house-rules"],
      ["Edit amenities", "/stays/properties/build/prop-1?section=property-setup&step=amenities"],
      ["Edit services", "/stays/properties/build/prop-1?section=property-setup&step=services"],
      ["Edit languages", "/stays/properties/build/prop-1?section=property-setup&step=languages"],
      ["Edit host profile", "/stays/properties/build/prop-1?section=property-setup&step=host-profile"],
      ["Edit location", "/stays/properties/build/prop-1?section=basic-information&step=location"],
      ["Edit property name", "/stays/properties/build/prop-1?section=property-setup&step=identity"],
      ["Edit type and category", "/stays/properties/build?draft=prop-1"],
      ["Edit booking type", "/stays/properties/build?draft=prop-1"],
      ["Edit listing scope", "/stays/properties/build?draft=prop-1"],
      ["Edit channel manager", "/stays/properties/build/prop-1?section=basic-information&step=channel-manager"],
      ["Edit booking preference", "/stays/properties/build/prop-1?section=property-setup&step=booking-preference"],
      ["Edit payments", "/stays/properties/build/prop-1?section=property-setup&step=payments"],
      ["Edit nightly price", "/stays/properties/build/prop-1?section=pricing-calendar&step=price-per-night"],
      ["Edit publish status", "/stays/properties/build/prop-1?section=review-submit&step=review"],
    ];

    for (const [label, path] of targets) {
      await user.click(screen.getByRole("button", { name: label }));
      expect(onEdit).toHaveBeenLastCalledWith(path);
    }
  });

  it("hides edit actions when the viewer cannot manage the property", () => {
    renderView({ canEdit: false });

    expect(screen.queryByRole("button", { name: "Edit photos" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit house rules" })).toBeNull();
    expect(screen.getByText("Deluxe King Room")).toBeTruthy();
  });

  it("shows useful empty states", () => {
    renderView({
      overrides: {
        photos: [],
        rooms: [],
        facilities: [],
        languages: [],
        hostProfile: {},
        address: "",
        city: "",
        region: "",
        country: "",
        postcode: "",
        mapAddress: "",
        lat: null,
        lng: null,
      },
    });

    expect(screen.getByText("No photos uploaded yet")).toBeTruthy();
    expect(screen.getByText("No room types configured yet.")).toBeTruthy();
    expect(screen.getByText("No amenities selected.")).toBeTruthy();
    expect(screen.getByText("No languages selected.")).toBeTruthy();
    expect(screen.getByText("No host profile provided yet.")).toBeTruthy();
    expect(screen.getByText("No address provided yet.")).toBeTruthy();
  });
});
