/**
 * `mapBookingRow`'s storefront inference.
 *
 * A supplier's booking list shows which storefront each booking came through,
 * and the API already sends that as `source`. The prefix fallback is only for
 * rows where it doesn't — and it used to test for `"GHA"`, a prefix no brand has
 * ever minted. Ghana's prefix is `TRG` (backend `config/brands.js` →
 * `bookingPrefix`), Expedition's is `EXP`, Travio Africa's is `AFR`, so that
 * branch could only ever return its else-value.
 *
 * The fallback is a safety net rather than the main path: `Booking.source` is a
 * required enum, so the tests below pin both halves — that the prefix is read
 * correctly when `source` is absent, and that a present `source` still wins
 * rather than being second-guessed by the number.
 */
import { describe, expect, it } from "vitest";

import { mapBookingRow } from "../api";

/** A row as the API sends it, minus the fields each case wants to vary. */
const apiRow = (overrides = {}) => ({
  id: "b-1",
  bookingNumber: "TRG-90123456-2026-01",
  customer: { name: "Ama Serwaa", email: "ama@example.com" },
  tour: { title: "Shai Hills Safari" },
  travelDate: "2026-11-04",
  createdAt: "2026-10-01",
  grossAmount: 200,
  currency: "USD",
  ...overrides,
});

describe("mapBookingRow storefront inference", () => {
  it("reads a Ghana reference as GHANA when the API sends no source", () => {
    // The regression: "GHA" matched nothing, so this used to come back
    // EXPEDITION — a Travio Ghana booking mislabelled as Expedition Go.
    const row = apiRow({ bookingNumber: "TRG-90123456-2026-01" });
    delete row.source;

    expect(mapBookingRow(row).source).toBe("GHANA");
  });

  it("reads an Expedition reference as EXPEDITION", () => {
    // Ghana suppliers can also be published to the Expedition sub-store, so both
    // prefixes reach this dashboard and the else-branch has to be right too.
    const row = apiRow({ bookingNumber: "EXP-90123456-2026-01" });
    delete row.source;

    expect(mapBookingRow(row).source).toBe("EXPEDITION");
  });

  it("lets an explicit source win over the prefix", () => {
    // `source` is a required enum on Booking, so it is the field the API always
    // sends. The fallback must never override it — including when the two
    // disagree, which a re-minted or legacy reference could produce.
    const row = apiRow({
      source: "EXPEDITION",
      bookingNumber: "TRG-90123456-2026-01",
    });

    expect(mapBookingRow(row).source).toBe("EXPEDITION");
  });

  it("passes a GHANA source through untouched", () => {
    const row = apiRow({ source: "GHANA", bookingNumber: "EXP-90123456-2026-01" });

    expect(mapBookingRow(row).source).toBe("GHANA");
  });

  it("does not mistake the Travio Africa prefix for Expedition", () => {
    // Guards the shape of the fix. A prefix list would be the wrong fix here:
    // this dashboard's bookings are scoped by tour supplier, so an AFR number
    // can never arrive, and inventing a third branch would only be untestable.
    const row = apiRow({ bookingNumber: "AFR-90123456-2026-01" });
    delete row.source;

    expect(mapBookingRow(row).source).toBe("EXPEDITION");
  });

  it("survives a row with no booking number at all", () => {
    // The rest of the mapper is defensive about missing fields, and the prefix
    // read is optional-chained for the same reason. `bookingNumber` is a
    // required column so the API always sends it, but a mapper that threw would
    // take the whole list down over one malformed row rather than falling back
    // to a default like everything around it does.
    const row = apiRow();
    delete row.source;
    delete row.bookingNumber;

    expect(() => mapBookingRow(row)).not.toThrow();
    expect(mapBookingRow(row).source).toBe("EXPEDITION");
  });
});