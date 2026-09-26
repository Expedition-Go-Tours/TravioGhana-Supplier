import { describe, expect, it } from "vitest";

import {
  COUNTRIES,
  buildPayoutMethodPayload,
  describePayoutRoute,
  formatBranchCode,
  formatIban,
  formatMobileNumber,
  formatRoutingNumber,
  formatSortCode,
  formatSwiftCode,
  getCountryBankSpec,
  initialPayoutMethodForm,
  maskTail,
} from "../payoutMethodForm";

describe("getCountryBankSpec", () => {
  it("asks a Ghanaian supplier for an account number, bank and branch code", () => {
    const spec = getCountryBankSpec("GH");

    expect(spec.identifiers).toEqual(["accountName", "accountNumber", "bankName", "branchCode"]);
    expect(spec.currency).toBe("GHS");
  });

  it("requires the account holder name on every bank rail", () => {
    for (const code of ["GH", "GB", "DE", "US", "IN", "AU", "NG", "ZM"]) {
      expect(getCountryBankSpec(code).identifiers).toContain("accountName");
    }
  });

  it("asks a UK supplier for a sort code and account number, not a bare IBAN", () => {
    const spec = getCountryBankSpec("GB");

    expect(spec.identifiers).toEqual(["accountName", "sortCode", "accountNumber"]);
    expect(spec.optionalIdentifiers).toContain("iban");
    expect(spec.currency).toBe("GBP");
  });

  it("asks a eurozone supplier only for an IBAN — not an account number as well", () => {
    const spec = getCountryBankSpec("DE");

    expect(spec.identifiers).toEqual(["accountName", "iban"]);
    expect(spec.identifiers).not.toContain("accountNumber");
    expect(spec.identifiers).not.toContain("bankName");
    expect(spec.isSepa).toBe(true);
    expect(spec.currency).toBe("EUR");
  });

  it("asks a US supplier for an ABA routing number", () => {
    const spec = getCountryBankSpec("US");

    expect(spec.identifiers).toEqual(["accountName", "routingNumber", "accountNumber"]);
  });

  it("renames branchCode to the local name so no schema change is needed", () => {
    expect(getCountryBankSpec("IN").branchCodeLabel).toBe("IFSC code");
    expect(getCountryBankSpec("AU").branchCodeLabel).toBe("BSB code");
    expect(getCountryBankSpec("CA").branchCodeLabel).toBe("Transit number");
  });

  it("falls back to an international wire for an unknown country", () => {
    const spec = getCountryBankSpec("ZM");

    expect(spec.identifiers).toContain("swiftCode");
    expect(spec.identifiers).toContain("accountNumber");
  });

  it("is case-insensitive", () => {
    expect(getCountryBankSpec("gh").identifiers).toEqual(getCountryBankSpec("GH").identifiers);
  });
});

describe("input formatting", () => {
  it("groups an IBAN in fours and upper-cases it", () => {
    expect(formatIban("de89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });

  it("groups a sort code as 12-34-56 and stops at six digits", () => {
    expect(formatSortCode("12345678")).toBe("12-34-56");
  });

  it("keeps a routing number to nine digits", () => {
    expect(formatRoutingNumber("0210000211234")).toBe("021000021");
  });

  it("upper-cases and caps a SWIFT/BIC at 11 characters", () => {
    expect(formatSwiftCode("deutdeff500")).toBe("DEUTDEFF500");
    expect(formatSwiftCode("DEUTDEFF500123")).toBe("DEUTDEFF500");
  });

  it("keeps a branch code to the backend's 20-character cap", () => {
    expect(formatBranchCode("200300")).toBe("200300");
    expect(formatBranchCode("x".repeat(40))).toHaveLength(20);
  });

  it("groups a mobile money number for readability", () => {
    expect(formatMobileNumber("0244000000")).toBe("02 44 00 00 00");
  });
});

describe("buildPayoutMethodPayload", () => {
  const base = { ...initialPayoutMethodForm({ countryCode: "GH" }), accountName: "Gideon Kwarteng" };

  it("omits empty fields rather than sending empty strings", () => {
    const payload = buildPayoutMethodPayload(base);

    // `bankCountry` is a bare z.string() with an /^[A-Z]{2}$/ refine upstream, so
    // an empty string would be rejected outright.
    expect(payload).toEqual({
      type: "BANK_TRANSFER",
      currency: "GHS",
      accountName: "Gideon Kwarteng",
      bankCountry: "GH",
    });
    expect("iban" in payload).toBe(false);
    expect("branchCode" in payload).toBe(false);
  });

  it("strips display formatting so a formatted number cannot breach the 32-char cap", () => {
    const payload = buildPayoutMethodPayload({
      ...base,
      accountNumber: "1234 5678 9012 3456 7890 1234 5678",
      bankName: "Ecobank",
      branchCode: "200-300",
    });

    expect(payload.accountNumber).toBe("1234567890123456789012345678");
    expect(payload.branchCode).toBe("200300");
  });

  it("upper-cases the country and lower-cases a PayPal email", () => {
    const bank = buildPayoutMethodPayload({ ...base, bankCountry: "de" });
    expect(bank.bankCountry).toBe("DE");

    const paypal = buildPayoutMethodPayload({
      type: "PAYPAL",
      paypalEmail: "Supplier@Example.COM",
      currency: "USD",
    });
    expect(paypal).toEqual({ type: "PAYPAL", currency: "USD", paypalEmail: "supplier@example.com" });
  });

  it("only sends the fields that belong to the chosen type", () => {
    const mobile = buildPayoutMethodPayload({
      type: "MOBILE_MONEY",
      accountName: "Gideon Kwarteng",
      mobileProvider: "MTN Mobile Money",
      mobileNumber: "024 400 0000",
      currency: "GHS",
      accountNumber: "should be dropped",
    });

    expect(mobile).toEqual({
      type: "MOBILE_MONEY",
      currency: "GHS",
      accountName: "Gideon Kwarteng",
      mobileProvider: "MTN Mobile Money",
      mobileNumber: "0244000000",
    });
  });

  it("carries the IBAN and BIC a UK supplier gives as an international account", () => {
    const payload = buildPayoutMethodPayload({
      ...base,
      bankCountry: "GB",
      sortCode: "12-34-56",
      accountNumber: "87654321",
      iban: "GB29 NWBK 6016 1331 9268 19",
      swiftCode: "NWBKGB2L",
    });

    expect(payload.sortCode).toBe("123456");
    expect(payload.iban).toBe("GB29NWBK60161331926819");
    expect(payload.swiftCode).toBe("NWBKGB2L");
  });

  it("only sets isDefault when the box is ticked", () => {
    expect(buildPayoutMethodPayload(base).isDefault).toBeUndefined();
    expect(buildPayoutMethodPayload({ ...base, isDefault: true }).isDefault).toBe(true);
  });
});

describe("describePayoutRoute", () => {
  it("calls a eurozone EUR payout a free SEPA transfer", () => {
    const route = describePayoutRoute({ type: "BANK_TRANSFER", bankCountry: "DE", currency: "EUR" });
    expect(route.title).toBe("SEPA transfer");
  });

  it("treats a currency matching the country as a local transfer", () => {
    expect(describePayoutRoute({ type: "BANK_TRANSFER", bankCountry: "GH", currency: "GHS" }).title).toBe(
      "Local transfer",
    );
    expect(describePayoutRoute({ type: "BANK_TRANSFER", bankCountry: "US", currency: "USD" }).title).toBe(
      "Local transfer",
    );
  });

  it("warns that a mismatched currency is an international wire", () => {
    const route = describePayoutRoute({ type: "BANK_TRANSFER", bankCountry: "GH", currency: "USD" });
    expect(route.title).toBe("International transfer");
    expect(route.detail).toMatch(/may charge a receiving fee/);
  });

  it("does not call a eurozone account on a non-EUR currency a local transfer", () => {
    expect(describePayoutRoute({ type: "BANK_TRANSFER", bankCountry: "DE", currency: "USD" }).title).toBe(
      "International transfer",
    );
  });

  it("describes the wallet and PayPal rails", () => {
    expect(describePayoutRoute({ type: "MOBILE_MONEY" }).title).toBe("Mobile money");
    expect(describePayoutRoute({ type: "PAYPAL" }).title).toBe("PayPal transfer");
  });
});

describe("helpers", () => {
  it("defaults the currency to the one the country settles in", () => {
    expect(initialPayoutMethodForm({ countryCode: "NG" }).currency).toBe("NGN");
    expect(initialPayoutMethodForm({ countryCode: "GB" }).currency).toBe("GBP");
    expect(initialPayoutMethodForm({ countryCode: "FR" }).currency).toBe("EUR");
  });

  it("lets the caller override the default currency", () => {
    expect(initialPayoutMethodForm({ countryCode: "GH", currency: "USD" }).currency).toBe("USD");
  });

  it("masks all but the last four characters", () => {
    expect(maskTail("1234567890")).toBe("•••• 7890");
    expect(maskTail("12-34-56")).toBe("•••• 3456");
    expect(maskTail("")).toBe("");
    expect(maskTail(undefined)).toBe("");
  });

  it("exposes a full, name-sorted country list with flags", () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
    expect(COUNTRIES.find((c) => c.code === "GH")).toMatchObject({ name: "Ghana", currency: "GHS" });
    expect(COUNTRIES.find((c) => c.code === "GH").flag).toBe("\u{1F1EC}\u{1F1ED}");
  });
});
