/**
 * `mapBookingRow` — cancellation detail pass-through.
 *
 * The supplier bookings endpoint returns raw Prisma Booking rows, so
 * `cancellationReason`, `cancellationNote`, `cancelledAt` and `refundStatus`
 * are all present in the payload. `mapBookingRow` is an explicit whitelist
 * rather than a spread, which means a field only survives if it is listed
 * here — and these four were not. Every read of them in `BookingCard`
 * therefore evaluated to `undefined` and the entire "Cancellation" section
 * silently rendered nothing, on every cancelled booking, in production.
 *
 * That class of bug is invisible to a component test alone: a hand-written
 * fixture passed straight to `BookingCard` carries the fields whether or not
 * the mapper forwards them. These tests hold the mapper's end of the seam, and
 * `BookingCard.cancellation.test.jsx` holds the other.
 */
import { describe, expect, it } from "vitest";

import { mapBookingRow } from "../api";

/** A cancelled booking exactly as the API serialises it. */
const cancelledRow = {
  id: "b-cancel-1",
  bookingNumber: "TRG-90123456-2026-01",
  customer: { name: "Ama Serwaa", email: "ama@example.com" },
  tour: { title: "Shai Hills Safari" },
  travelDate: "2026-11-04",
  createdAt: "2026-10-01",
  grossAmount: 420,
  currency: "USD",
  status: "CANCELLED",
  cancellationReason: "WEATHER",
  cancellationNote: "Forecast said the whole week would be washed out.",
  cancelledAt: "2026-10-02T09:15:00.000Z",
  refundStatus: "SUCCEEDED",
};

describe("mapBookingRow — cancellation detail", () => {
  it("forwards the reason, note, cancelled-at and refund status", () => {
    // The regression. Before these four were mapped, every one of these came
    // back undefined and BookingCard's cancellation section rendered nothing.
    const row = mapBookingRow(cancelledRow);

    expect(row.cancellationReason).toBe("WEATHER");
    expect(row.cancellationNote).toBe(
      "Forecast said the whole week would be washed out."
    );
    expect(row.cancelledAt).toBe("2026-10-02T09:15:00.000Z");
    expect(row.refundStatus).toBe("SUCCEEDED");
  });

  it("keeps an empty note empty rather than inventing a placeholder", () => {
    // Most cancellations are a bare reason code with no free text. `note` is
    // used to decide the grid layout — a "" would count as truthy-ish in a
    // naive check and render an empty "Customer note" cell, so it must be null.
    const row = mapBookingRow({ ...cancelledRow, cancellationNote: "" });

    expect(row.cancellationNote).toBeNull();
  });

  it("defaults every cancellation field to null on a legacy row", () => {
    // Bookings cancelled before the reason/note columns existed, and rows the
    // sweeper cancelled without a reason. null is what BookingCard tests for,
    // so undefined would work by accident — pinning it keeps the contract honest.
    const legacy = { ...cancelledRow };
    delete legacy.cancellationReason;
    delete legacy.cancellationNote;
    delete legacy.cancelledAt;
    delete legacy.refundStatus;

    const row = mapBookingRow(legacy);

    expect(row.cancellationReason).toBeNull();
    expect(row.cancellationNote).toBeNull();
    expect(row.cancelledAt).toBeNull();
    expect(row.refundStatus).toBeNull();
  });

  it("preserves a NOT_APPLICABLE refund status", () => {
    // BookingCard hides the badge on NOT_APPLICABLE rather than blanking the
    // field, so the mapper must pass this value through instead of
    // normalising it to null and making the two cases indistinguishable.
    const row = mapBookingRow({ ...cancelledRow, refundStatus: "NOT_APPLICABLE" });

    expect(row.refundStatus).toBe("NOT_APPLICABLE");
  });

  it("does not disturb the surrounding booking fields", () => {
    // Guards the insert: the new keys sit immediately above `discount`, so a
    // bad edit here would corrupt an unrelated part of the card.
    const row = mapBookingRow(cancelledRow);

    expect(row.id).toBe("b-cancel-1");
    expect(row.status).toBe("CANCELLED");
    expect(row.discount).toBe(0);
    expect(row.tourName).toBe("Shai Hills Safari");
    expect(row.total).toBe(420);
  });
});