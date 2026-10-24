/**
 * The list card must read a pickup snapshot exactly like the detail panel and
 * the Pickup Planner.
 *
 * Storefront snapshots store the exact address in `address.address`, a short
 * label in `address.name`, and the service zone separately. An older card read
 * `areaName` first, so it told the supplier "Cantonments, La" when the driver
 * had been given a street address — and it printed the street address a second
 * time below. These tests walk the raw API row through `mapBookingRow`, because
 * that is the only path the bookings page uses.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mapBookingRow } from "../api";
import BookingCard from "../components/BookingCard";

const apiBooking = {
  id: "b-pickup-1",
  bookingNumber: "TRG-90123456-2026-02",
  customer: {
    id: "u-1",
    name: "Ama Serwaa",
    email: "ama@example.com",
    phone: "+233201234567",
    photoURL: "",
  },
  guest: null,
  tour: { id: "t-1", title: "Shai Hills Safari", coverPhoto: "", photos: [] },
  travelDate: "2026-11-04T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  grossAmount: 420,
  currency: "USD",
  status: "CONFIRMED",
  paymentTiming: "now",
  paymentStatus: "SUCCEEDED",
  travelers: 1,
  selectedTime: "09:00",
  pickup: {
    mode: "area",
    time: "08:15",
    status: "selected",
    areaName: "Cantonments, La",
    pickupLater: false,
    instructions: "",
    address: {
      lat: 5.5555469,
      lng: -0.1705662,
      name: "Suncity",
      address: "Suncity, Omanye Street, Accra, Ghana",
    },
  },
};

const noop = () => {};

async function renderMapped(rawBooking) {
  const user = userEvent.setup();
  render(
    <BookingCard
      booking={mapBookingRow(rawBooking)}
      onStatusUpdate={noop}
      onMessageCustomer={noop}
      onWithdrawRequest={noop}
    />
  );
  // Both responsive headers are in the jsdom tree; expanding the first reveals
  // the same body either way.
  await user.click(screen.getAllByRole("button", { expanded: false })[0]);
  return user;
}

describe("BookingCard — pickup detail, through the real mapper", () => {
  it("shows the exact street address before the service zone", async () => {
    await renderMapped(apiBooking);

    expect(
      screen.getByText("Suncity, Omanye Street, Accra, Ghana")
    ).toBeTruthy();
    expect(screen.getByText("Suncity")).toBeTruthy();
    expect(screen.getByText("Zone: Cantonments, La")).toBeTruthy();
    // The old card rendered the zone as the headline and the street address
    // again as a detail; neither misleading duplicate should come back.
    expect(screen.queryByText("[object Object]")).toBeNull();
  });

  it("keeps a zone-only pickup readable", async () => {
    await renderMapped({
      ...apiBooking,
      pickup: {
        mode: "area",
        time: "08:15",
        status: "selected",
        areaName: "Cantonments, La",
      },
    });

    expect(screen.getByText("Cantonments, La")).toBeTruthy();
    expect(screen.queryByText(/^Zone:/)).toBeNull();
  });
});
