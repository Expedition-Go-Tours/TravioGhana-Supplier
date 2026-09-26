import { describe, expect, it } from "vitest";

import { validatePayoutForm, validatePayoutMethod, validators } from "../validatePayoutMethod";

const bank = {
  type: "BANK_TRANSFER",
  accountName: "Gideon Kwarteng",
  accountNumber: "1234567890",
  bankName: "Ecobank Ghana",
  bankCountry: "GH",
};

const mobile = {
  type: "MOBILE_MONEY",
  accountName: "Gideon Kwarteng",
  mobileProvider: "MTN Mobile Money",
  mobileNumber: "0244000000",
  currency: "GHS",
};

describe("validatePayoutMethod", () => {
  it("accepts a complete bank transfer", () => {
    expect(validatePayoutMethod(bank).ok).toBe(true);
  });

  it("accepts a complete mobile money method", () => {
    expect(validatePayoutMethod(mobile).ok).toBe(true);
  });

  it("accepts a complete PayPal method", () => {
    expect(validatePayoutMethod({ type: "PAYPAL", paypalEmail: "supplier@example.com" }).ok).toBe(true);
  });

  it("requires provider, wallet holder and a valid number for mobile money", () => {
    const { ok, errors } = validatePayoutMethod({ type: "MOBILE_MONEY" });

    expect(ok).toBe(false);
    expect(errors.mobileProvider).toBe("Mobile money provider is required");
    expect(errors.mobileNumber).toBe("Mobile money number is required");
    expect(errors.accountName).toBe("Wallet holder name is required");
  });

  it("rejects a mobile number that is not 9-15 digits", () => {
    expect(validatePayoutMethod({ ...mobile, mobileNumber: "02440000" }).errors.mobileNumber).toBe(
      "Enter a valid mobile money number (9-15 digits)"
    );
    expect(validatePayoutMethod({ ...mobile, mobileNumber: "abc" }).errors.mobileNumber).toBe(
      "Enter a valid mobile money number (9-15 digits)"
    );
    // International format with separators is accepted.
    expect(validatePayoutMethod({ ...mobile, mobileNumber: "+233 24 400 0000" }).ok).toBe(true);
  });

  it("does not apply bank or PayPal rules to mobile money", () => {
    const { errors } = validatePayoutMethod(mobile);
    expect(errors.accountNumber).toBeUndefined();
    expect(errors.bankName).toBeUndefined();
    expect(errors.paypalEmail).toBeUndefined();
  });

  it("exposes the mobile number helper alongside the other validators", () => {
    expect(validators.mobileNumberValid("0244000000")).toBe(true);
    expect(validators.mobileNumberValid("024-400-0000")).toBe(true);
    expect(validators.mobileNumberValid("12345")).toBe(false);
  });

  it("does not demand a bank name when an IBAN already carries one", () => {
    const { errors } = validatePayoutMethod({
      type: "BANK_TRANSFER",
      accountName: "Gideon Kwarteng",
      iban: "DE89370400440532013000",
      bankCountry: "DE",
    });

    expect(errors.bankName).toBeUndefined();
    expect(errors.accountNumber).toBeUndefined();
  });
});

describe("validatePayoutForm", () => {
  const ghana = {
    type: "BANK_TRANSFER",
    accountName: "Gideon Kwarteng",
    accountNumber: "1234567890",
    bankName: "Ecobank Ghana",
    branchCode: "200300",
    bankCountry: "GH",
    currency: "GHS",
  };

  it("accepts a complete Ghanaian account", () => {
    expect(validatePayoutForm(ghana)).toEqual({ ok: true, errors: {} });
  });

  it("requires the branch code a Ghanaian bank needs to route the transfer", () => {
    const { ok, errors } = validatePayoutForm({ ...ghana, branchCode: "" });

    expect(ok).toBe(false);
    expect(errors.branchCode).toBe("Branch code is required for Ghana");
  });

  it("requires the sort code the UK rail needs", () => {
    const { ok, errors } = validatePayoutForm({
      type: "BANK_TRANSFER",
      accountName: "Gideon Kwarteng",
      accountNumber: "87654321",
      bankCountry: "GB",
      currency: "GBP",
    });

    expect(ok).toBe(false);
    expect(errors.sortCode).toBe("Sort code is required for United Kingdom");
  });

  it("requires an IBAN in the eurozone", () => {
    const { ok, errors } = validatePayoutForm({
      type: "BANK_TRANSFER",
      accountName: "Gideon Kwarteng",
      bankCountry: "DE",
      currency: "EUR",
    });

    expect(ok).toBe(false);
    expect(errors.iban).toBe("IBAN is required for Germany");
  });

  it("rejects a bad IBAN that clears the presence check", () => {
    const { errors } = validatePayoutForm({
      type: "BANK_TRANSFER",
      accountName: "Gideon Kwarteng",
      iban: "DE00370400440532013000",
      bankCountry: "DE",
      currency: "EUR",
    });

    expect(errors.iban).toBe("Invalid IBAN (failed mod-97 check)");
  });

  it("names the country instead of asking for an ISO code by hand", () => {
    const { errors } = validatePayoutForm({ ...ghana, bankCountry: "" });

    expect(errors.bankCountry).toBe("Choose the country your bank account is held in");
  });

  it("requires a currency to be a 3-letter code", () => {
    expect(validatePayoutForm({ ...ghana, currency: "" }).errors.currency).toBe(
      "Choose the currency you want to be paid in",
    );
  });

  it("applies no bank rules to mobile money or PayPal", () => {
    const mobile = validatePayoutForm({
      type: "MOBILE_MONEY",
      accountName: "Gideon Kwarteng",
      mobileProvider: "MTN Mobile Money",
      mobileNumber: "0244000000",
      currency: "GHS",
    });
    expect(mobile.ok).toBe(true);

    const paypal = validatePayoutForm({
      type: "PAYPAL",
      paypalEmail: "supplier@example.com",
      currency: "USD",
    });
    expect(paypal.ok).toBe(true);
  });
});
