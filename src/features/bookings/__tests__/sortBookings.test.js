import { describe, expect, it } from "vitest";
import { sortBookings } from "../lib/sortBookings";

const booking = (id, over = {}) => ({
  id,
  bookingDate: "2026-11-01T09:00:00.000Z",
  refundedAt: null,
  cancelledAt: null,
  ...over,
});

describe("sortBookings", () => {
  it("puts the most recent refund first, even when the booking is older", () => {
    const rows = [
      booking("old-refund", { bookingDate: "2026-09-01T09:00:00.000Z", refundedAt: "2026-11-05T10:00:00.000Z" }),
      booking("new-booking", { bookingDate: "2026-11-04T09:00:00.000Z", refundedAt: "2026-11-04T12:00:00.000Z" }),
      booking("middle", { bookingDate: "2026-10-20T09:00:00.000Z", refundedAt: "2026-11-03T10:00:00.000Z" }),
    ];

    expect(sortBookings(rows, "REFUNDS").map((row) => row.id)).toEqual([
      "old-refund",
      "new-booking",
      "middle",
    ]);
  });

  it("falls back to the cancellation date while a refund is still pending", () => {
    const rows = [
      booking("pending-old", { cancelledAt: "2026-10-01T09:00:00.000Z" }),
      booking("refunded", { refundedAt: "2026-10-15T09:00:00.000Z" }),
      booking("pending-new", { cancelledAt: "2026-11-02T09:00:00.000Z" }),
    ];

    expect(sortBookings(rows, "REFUNDS").map((row) => row.id)).toEqual([
      "pending-new",
      "refunded",
      "pending-old",
    ]);
  });

  it("keeps newest-booking order on the other tabs", () => {
    const rows = [
      booking("a", { bookingDate: "2026-10-01T09:00:00.000Z" }),
      booking("b", { bookingDate: "2026-11-02T09:00:00.000Z" }),
    ];

    expect(sortBookings(rows, "PENDING").map((row) => row.id)).toEqual(["b", "a"]);
  });
});
