import { describe, expect, it } from "vitest";
import {
  CANCELLATION_CATEGORIES,
  DEFAULT_CHOICE_WINDOW_HOURS,
  DEFAULT_FEE_PCT,
  EMPTY_CANCELLATION_FORM,
  cancellationPayload,
  isHttpUrl,
  normalizeTaxonomy,
  reasonLabel,
  refundStatusLabel,
  validateCancellationForm,
} from "../lib/cancellationReasons";

const validOperational = {
  category: "OPERATIONAL",
  cancellationCode: "GUIDE_UNAVAILABLE",
  agreedToTerms: true,
  explanation: "Our guide fell ill and no replacement was available.",
  evidenceUrl: "",
  customerRefundAgreed: null,
};

const validForceMajeure = {
  category: "FORCE_MAJEURE",
  cancellationCode: "WEATHER",
  agreedToTerms: true,
  explanation: "A severe storm warning closed the harbour for two days.",
  evidenceUrl: "https://weather.example.com/storm-warning",
  customerRefundAgreed: null,
};

const validCustomerRequested = {
  category: "CUSTOMER_REQUESTED",
  cancellationCode: "CUSTOMER_REQUESTED_CANCEL",
  agreedToTerms: true,
  explanation: "",
  evidenceUrl: "",
  customerRefundAgreed: true,
};

describe("validateCancellationForm", () => {
  it("accepts a fully valid operational cancellation", () => {
    expect(validateCancellationForm(validOperational)).toEqual({
      errors: {},
      isValid: true,
    });
  });

  it("requires a reason code and the terms acknowledgement", () => {
    const { errors, isValid } = validateCancellationForm({
      ...validOperational,
      cancellationCode: "",
      agreedToTerms: false,
    });
    expect(isValid).toBe(false);
    expect(errors.cancellationCode).toBeTruthy();
    expect(errors.agreedToTerms).toBeTruthy();
  });

  it("requires at least 10 characters for OPERATIONAL explanations", () => {
    const short = validateCancellationForm({ ...validOperational, explanation: "Too short" });
    expect(short.isValid).toBe(false);
    expect(short.errors.explanation).toMatch(/10/);

    const edge = validateCancellationForm({
      ...validOperational,
      explanation: "0123456789", // exactly 10
    });
    expect(edge.isValid).toBe(true);
  });

  it("requires a 20+ character explanation AND an http(s) evidence link for FORCE_MAJEURE", () => {
    const tooShort = validateCancellationForm({
      ...validForceMajeure,
      explanation: "Storm damage here",
      evidenceUrl: "",
    });
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.errors.explanation).toMatch(/20/);
    expect(tooShort.errors.evidenceUrl).toBeTruthy();

    const badProtocol = validateCancellationForm({
      ...validForceMajeure,
      evidenceUrl: "ftp://example.com/report",
    });
    expect(badProtocol.isValid).toBe(false);
    expect(badProtocol.errors.evidenceUrl).toBeTruthy();

    expect(validateCancellationForm(validForceMajeure).isValid).toBe(true);
  });

  it("requires an explicit yes/no refund answer for CUSTOMER_REQUESTED", () => {
    const unanswered = validateCancellationForm({
      ...validCustomerRequested,
      customerRefundAgreed: null,
    });
    expect(unanswered.isValid).toBe(false);
    expect(unanswered.errors.customerRefundAgreed).toBeTruthy();

    expect(
      validateCancellationForm({ ...validCustomerRequested, customerRefundAgreed: false }).isValid
    ).toBe(true);
    expect(validateCancellationForm(validCustomerRequested).isValid).toBe(true);
  });
});

describe("cancellationPayload", () => {
  it("sends the structured fields and trims blanks", () => {
    const payload = cancellationPayload({
      ...validOperational,
      explanation: "  Our guide fell ill and no replacement was available.  ",
      supplierNotes: "   ",
    });
    expect(payload).toEqual({
      cancellationCode: "GUIDE_UNAVAILABLE",
      agreedToTerms: true,
      explanation: "Our guide fell ill and no replacement was available.",
    });
    expect(payload.supplierNotes).toBeUndefined();
    expect(payload.evidenceUrl).toBeUndefined();
    expect(payload.customerRefundAgreed).toBeUndefined();
  });

  it("keeps evidenceUrl and a false refund answer when provided", () => {
    const payload = cancellationPayload({ ...validCustomerRequested, customerRefundAgreed: false });
    expect(payload.customerRefundAgreed).toBe(false);

    const fm = cancellationPayload(validForceMajeure);
    expect(fm.evidenceUrl).toBe("https://weather.example.com/storm-warning");
  });

  it("never coerces an unanswered refund question to a boolean", () => {
    const payload = cancellationPayload({
      ...validCustomerRequested,
      customerRefundAgreed: null,
    });
    expect("customerRefundAgreed" in payload).toBe(false);
  });
});

describe("normalizeTaxonomy", () => {
  it("merges server categories/reasons and keeps server fee + choice window", () => {
    const taxonomy = normalizeTaxonomy({
      reasons: [{ code: "GUIDE_UNAVAILABLE", category: "OPERATIONAL", label: "Guide or staff unavailable" }],
      byCategory: {
        OPERATIONAL: [{ code: "GUIDE_UNAVAILABLE", label: "Guide or staff unavailable" }],
      },
      feePct: 30,
      choiceWindowHours: 72,
    });
    expect(taxonomy.feePct).toBe(30);
    expect(taxonomy.choiceWindowHours).toBe(72);
    expect(taxonomy.categories).toHaveLength(CANCELLATION_CATEGORIES.length);
    expect(taxonomy.categories[0].reasons).toHaveLength(1);
    expect(reasonLabel("GUIDE_UNAVAILABLE", taxonomy)).toBe("Guide or staff unavailable");
  });

  it("falls back to the 25% / 48h defaults when the payload omits them", () => {
    const taxonomy = normalizeTaxonomy(null);
    expect(taxonomy.feePct).toBe(DEFAULT_FEE_PCT);
    expect(taxonomy.choiceWindowHours).toBe(DEFAULT_CHOICE_WINDOW_HOURS);
    expect(taxonomy.categories.every((c) => c.reasons.length === 0)).toBe(true);
    expect(EMPTY_CANCELLATION_FORM.agreedToTerms).toBe(false);
  });
});

describe("isHttpUrl / refundStatusLabel", () => {
  it("only accepts http(s) links", () => {
    expect(isHttpUrl("https://example.com/x")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("example.com")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });

  it("maps refund states to customer-facing copy", () => {
    expect(refundStatusLabel("SUCCEEDED")).toBe("Completed");
    expect(refundStatusLabel("PENDING")).toBe("Pending");
    expect(refundStatusLabel("FAILED")).toMatch(/notified/);
    expect(refundStatusLabel("")).toBe("—");
  });
});
