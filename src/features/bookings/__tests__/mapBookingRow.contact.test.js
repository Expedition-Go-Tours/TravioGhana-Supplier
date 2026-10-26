/**
 * `mapBookingRow`'s contact resolution.
 *
 * The phone a guest enters at checkout is required by the storefront
 * (`BookingPage` blocks the payment step without it) and is stored on the
 * booking row as `leadTravelerPhone`. The customer account's `phone` is a
 * separate, optional profile field that checkout never writes, so it is
 * usually empty.
 *
 * Every supplier view used to read `customerPhone` for the "who do I call"
 * number, which is why the drawer and the pickup manifest said "Not provided"
 * while the booking list showed a number: the list happened to read
 * `leadTravelerPhone`. These tests pin the single resolver so that cannot
 * recur, and keep `customerPhone` meaning strictly the account field so the
 * wrong read fails loudly rather than quietly returning a different person.
 */
import { describe, expect, it } from "vitest";

import { mapBookingRow } from "../api";

/** A row as the API sends it, minus the fields each case wants to vary. */
const apiRow = (overrides = {}) => ({
  id: "b-1",
  bookingNumber: "TRG-90123456-2026-01",
  customer: { name: "Ama Serwaa" },
  tour: { title: "Shai Hills Safari" },
  travelDate: "2026-11-04",
  createdAt: "2026-10-01",
  grossAmount: 200,
  currency: "USD",
  ...overrides,
});

describe("mapBookingRow contact resolution", () => {
  it("uses the checkout phone, not the account phone", () => {
    // The real regression: both fields arrive, only one is the guest the
    // supplier is driving. The account number is a different person.
    const row = mapBookingRow(apiRow({
      customer: { name: "Ama Serwaa", phone: "+233200000000" },
      leadTravelerPhone: "+233240000000",
    }));

    expect(row.contactPhone).toBe("+233240000000");
  });

  it("keeps customerPhone meaning strictly the account phone", () => {
    // Guard against the old read coming back: `customerPhone` must not
    // silently start returning the lead traveller's number, or views would
    // "work" while attributing the wrong person's number to the account.
    const row = mapBookingRow(apiRow({ leadTravelerPhone: "+233240000000" }));

    expect(row.customerPhone).toBe("");
    expect(row.contactPhone).toBe("+233240000000");
  });

  it("falls back to the account phone for legacy rows with no lead traveller", () => {
    const row = mapBookingRow(apiRow({
      customer: { name: "Ama Serwaa", phone: "+233200000000" },
    }));

    expect(row.contactPhone).toBe("+233200000000");
  });

  it("falls back to travelers.phoneNumber when the column was never populated", () => {
    // An API or draft-era booking can pass the server's required
    // `travelers.phoneNumber` check without the client mirroring it onto
    // `leadTraveler.phone`, leaving the column null while the number exists.
    const row = mapBookingRow(apiRow({
      travelers: { adults: 1, children: 0, infants: 0, phoneNumber: "+447723715044" },
    }));

    expect(row.contactPhone).toBe("+447723715044");
  });

  it("returns an empty contact rather than inventing one", () => {
    const row = mapBookingRow(apiRow());

    expect(row.contactPhone).toBe("");
    expect(row.contactEmail).toBe("");
  });

  it("resolves the email the same way, lead traveller first", () => {
    const row = mapBookingRow(apiRow({
      customer: { name: "Ama Serwaa", email: "relay@messages.travioghana.com" },
      leadTravelerEmail: "relay@messages.travioghana.com",
    }));

    expect(row.contactEmail).toBe("relay@messages.travioghana.com");
  });

  it("uses the account address when the booking has no lead traveller email", () => {
    // Legacy pay-now bookings have no lead traveller at all; the masked relay
    // lives on the account field, and the contact must still be reachable.
    const row = mapBookingRow(apiRow({
      customer: { name: "Ama Serwaa", email: "relay@messages.travioghana.com" },
    }));

    expect(row.contactEmail).toBe("relay@messages.travioghana.com");
  });
});
