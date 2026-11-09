import { describe, expect, it } from "vitest";
import { mailtoHrefFor } from "../messageCustomer";

describe("mailtoHrefFor", () => {
  it("mails the relay address with the booking reference in the subject", () => {
    expect(mailtoHrefFor({
      customerId: "",
      contactEmail: "g-0123456789abcdef@messages.travioghana.com",
      bookingNumber: "TRG-71553418-2026-103",
    })).toBe(
      "mailto:g-0123456789abcdef@messages.travioghana.com?subject=Booking%20TRG-71553418-2026-103",
    );
  });

  it("falls back to the booking id when there is no reference", () => {
    expect(mailtoHrefFor({
      id: "b-1",
      contactEmail: "guest@relay.test",
    })).toBe("mailto:guest@relay.test?subject=Booking%20b-1");
  });

  it("returns null when the supplier has no address to mail", () => {
    expect(mailtoHrefFor({ customerId: "", contactEmail: "" })).toBeNull();
    expect(mailtoHrefFor(null)).toBeNull();
  });
});
