/**
 * Structured-cancellation helpers for the GetYourGuide-style wizard.
 *
 * The backend owns the taxonomy (GET /bookings/cancellation-reasons) — the
 * constants below are the static shape reference and the offline fallback for
 * the three category cards. Validation here mirrors
 * Expedition-Go-Backend-v2/src/core/services/cancellationReasons.js exactly;
 * server-side rules always win (400 { message } responses are surfaced as-is).
 */

export const CANCELLATION_CATEGORIES = [
  {
    key: "OPERATIONAL",
    title: "Operational issue",
    description:
      "Something on your side stopped the experience going ahead — guide, vehicle, venue or not enough travellers.",
  },
  {
    key: "FORCE_MAJEURE",
    title: "Force majeure",
    description:
      "A disruptive event outside your control — weather, natural disaster, government action or a safety incident.",
  },
  {
    key: "CUSTOMER_REQUESTED",
    title: "Customer requested",
    description: "The customer asked you to cancel this booking.",
  },
];

export const DEFAULT_FEE_PCT = 25;
export const DEFAULT_CHOICE_WINDOW_HOURS = 48;

export const EMPTY_CANCELLATION_FORM = {
  category: "",
  cancellationCode: "",
  agreedToTerms: false,
  explanation: "",
  evidenceUrl: "",
  customerRefundAgreed: null, // null = not answered yet (server needs a boolean)
  supplierNotes: "",
};

export function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}

/**
 * Merge the server taxonomy with the local category copy (the server only
 * sends category keys). Falls back to the static shape when the payload is
 * incomplete so the wizard always has something to render.
 */
export function normalizeTaxonomy(data) {
  const byCategory = data?.byCategory || {};
  const categories = CANCELLATION_CATEGORIES.map((meta) => ({
    ...meta,
    key: meta.key,
    reasons: byCategory[meta.key] || [],
  }));
  const feePct = Number(data?.feePct);
  const choiceWindowHours = Number(data?.choiceWindowHours);
  return {
    categories,
    reasons: data?.reasons || [],
    byCategory,
    systemCodes: data?.systemCodes || {},
    feePct: Number.isFinite(feePct) ? feePct : DEFAULT_FEE_PCT,
    choiceWindowHours: Number.isFinite(choiceWindowHours)
      ? choiceWindowHours
      : DEFAULT_CHOICE_WINDOW_HOURS,
  };
}

export function categoryMeta(categoryKey) {
  return CANCELLATION_CATEGORIES.find((c) => c.key === categoryKey) || null;
}

export function reasonLabel(code, taxonomy) {
  const reasons = taxonomy?.reasons || [];
  return reasons.find((r) => r.code === code)?.label || code || "";
}

/**
 * Client-side validation mirroring the server rules:
 *  - cancellationCode from the taxonomy (always required)
 *  - agreedToTerms === true (always required)
 *  - OPERATIONAL         → explanation ≥ 10 chars
 *  - FORCE_MAJEURE       → explanation ≥ 20 chars + http(s) evidenceUrl
 *  - CUSTOMER_REQUESTED  → customerRefundAgreed must be true or false
 *
 * @returns {{ errors: Record<string, string>, isValid: boolean }}
 */
export function validateCancellationForm(form = {}) {
  const errors = {};
  const code = String(form.cancellationCode || "").trim();
  const explanation = String(form.explanation || "").trim();
  const evidenceUrl = String(form.evidenceUrl || "").trim();

  if (!code) {
    errors.cancellationCode = "Choose a reason for the cancellation.";
  }
  if (form.agreedToTerms !== true) {
    errors.agreedToTerms = "Please accept the cancellation terms to continue.";
  }

  if (form.category === "OPERATIONAL") {
    if (explanation.length < 10) {
      errors.explanation =
        "Add at least 10 characters explaining what happened (10 required).";
    }
  } else if (form.category === "FORCE_MAJEURE") {
    if (explanation.length < 20) {
      errors.explanation =
        "Add at least 20 characters describing the event (20 required).";
    }
    if (!evidenceUrl || !isHttpUrl(evidenceUrl)) {
      errors.evidenceUrl =
        "Paste a valid http(s) link to evidence (weather report, news article or official notice).";
    }
  } else if (form.category === "CUSTOMER_REQUESTED") {
    if (typeof form.customerRefundAgreed !== "boolean") {
      errors.customerRefundAgreed =
        "Tell us whether you agree to refund the customer.";
    }
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}

/**
 * Build the PATCH /bookings/:id/status (and cancel-batch) body fields from
 * wizard state. Empty optional strings are trimmed/omitted so the zod schema
 * never trips over blank evidence links.
 */
export function cancellationPayload(form = {}) {
  const payload = {
    cancellationCode: String(form.cancellationCode || "").trim(),
    agreedToTerms: form.agreedToTerms === true,
    explanation: String(form.explanation || "").trim(),
    supplierNotes: String(form.supplierNotes || "").trim(),
  };
  const evidenceUrl = String(form.evidenceUrl || "").trim();
  if (evidenceUrl) payload.evidenceUrl = evidenceUrl;
  if (typeof form.customerRefundAgreed === "boolean") {
    payload.customerRefundAgreed = form.customerRefundAgreed;
  }
  if (!payload.supplierNotes) delete payload.supplierNotes;
  return payload;
}

/** Human copy for a refund status returned by the cancel endpoints. */
export function refundStatusLabel(status) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "SUCCEEDED":
      return "Completed";
    case "FAILED":
      return "Failed — our team has been notified";
    case "NOT_APPLICABLE":
      return "Not applicable";
    default:
      return status ? String(status).replace(/_/g, " ").toLowerCase() : "—";
  }
}
