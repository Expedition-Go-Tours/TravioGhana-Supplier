import { describe, expect, it } from "vitest";

import { validatePayoutMethod, validators } from "../validatePayoutMethod";

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
});
