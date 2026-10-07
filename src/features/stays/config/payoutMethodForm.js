/**
 * Shared data + helpers behind the supplier "Add payout method" form.
 *
 * The Finance page and the Settings page both render the same
 * <PayoutMethodFormSheet />, so every decision about *which* fields a supplier
 * should be asked for lives here rather than in either page. That is what stops
 * the two copies from drifting apart again.
 *
 * The field set mirrors the backend contract in
 * Expedition-Go-Backend-v2/src/core/services/payoutMethodValidation.js:
 *   bankName, bankAddress, bankCountry, accountName, accountNumber,
 *   routingNumber, swiftCode, iban, sortCode, branchCode, branchName
 * plus mobileProvider/mobileNumber for wallets and paypalEmail for PayPal.
 *
 * The interaction model follows how GetYourGuide and Viator present bank
 * details: the supplier picks the country their account is held in, and only
 * the identifiers that country actually uses are asked for. Nobody is asked to
 * type a bare ISO-3166 code by hand.
 */

import { getCountries } from "libphonenumber-js";

/** Payout rails. `icon` is a key resolved to a lucide icon by the component. */
export const PAYOUT_METHOD_TYPES = [
  { value: "BANK_TRANSFER", label: "Bank transfer", desc: "Straight into your bank account", icon: "building" },
  { value: "MOBILE_MONEY", label: "Mobile money", desc: "MTN, Telecel or AT wallet", icon: "smartphone" },
  { value: "PAYPAL", label: "PayPal", desc: "Online payment platform", icon: "wallet" },
];

/** Mobile money networks the product supports. Anything else is typed in. */
export const MOBILE_MONEY_PROVIDERS = ["MTN Mobile Money", "Telecel Cash", "AT Money"];

/** Currencies a supplier can be paid out in. */
export const PAYOUT_CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "GHS", label: "Ghanaian Cedi" },
  { code: "NGN", label: "Nigerian Naira" },
  { code: "KES", label: "Kenyan Shilling" },
  { code: "ZAR", label: "South African Rand" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "AED", label: "UAE Dirham" },
  { code: "INR", label: "Indian Rupee" },
  { code: "JPY", label: "Japanese Yen" },
];

// ─────────────────────────────────────────────────────────────
// Countries
// ─────────────────────────────────────────────────────────────

let regionNames = null;
try {
  if (typeof Intl !== "undefined" && Intl.DisplayNames) {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  }
} catch {
  regionNames = null;
}

const countryName = (code) => {
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
};

/** 🇬🇭 from "GH" — regional indicator symbols, no dependency needed. */
const flagFor = (code) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
    : "";

/** Eurozone + EU members reached by SEPA credit transfers. */
const SEPA_COUNTRIES = new Set(
  "AD AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IS IT LI LT LU LV MT NL PL PT RO SE SI SK SM".split(" "),
);

/**
 * Countries that issue IBANs. SEPA is the bulk of it, plus the non-eurozone
 * IBAN countries a supplier is likely to bank in.
 */
const IBAN_COUNTRIES = new Set([...SEPA_COUNTRIES, "GB", "CH", "NO", "LI", "MC", "GI", "AD"]);

/**
 * Per-country defaults. Anything not listed falls back to `DEFAULT_SPEC`.
 *
 * `identifiers` are the fields required for a payout on that country's rail.
 * `branchCodeLabel` renames the backend's free 20-character `branchCode` to the
 * local name, so India gets "IFSC code" and Australia gets "BSB code" without a
 * schema change.
 */
const COUNTRY_SPECS = {
  GH: {
    currency: "GHS",
    identifiers: ["accountNumber", "bankName", "branchCode"],
    optionalIdentifiers: ["branchName", "bankAddress"],
    branchCodeLabel: "Branch code",
  },
  NG: {
    currency: "NGN",
    identifiers: ["accountNumber", "bankName"],
    optionalIdentifiers: ["branchCode", "branchName"],
    branchCodeLabel: "Branch code",
  },
  KE: {
    currency: "KES",
    identifiers: ["accountNumber", "bankName", "branchCode"],
    optionalIdentifiers: ["branchName"],
    branchCodeLabel: "Branch code",
  },
  ZA: {
    currency: "ZAR",
    identifiers: ["accountNumber", "bankName", "branchCode"],
    optionalIdentifiers: ["branchName"],
    branchCodeLabel: "Branch code",
  },
  GB: {
    currency: "GBP",
    identifiers: ["accountName", "sortCode", "accountNumber"],
    optionalIdentifiers: ["iban", "swiftCode", "branchName"],
    branchCodeLabel: "Branch code",
  },
  US: {
    currency: "USD",
    identifiers: ["accountName", "routingNumber", "accountNumber"],
    optionalIdentifiers: ["branchName", "bankAddress"],
  },
  CA: {
    currency: "CAD",
    identifiers: ["accountName", "routingNumber", "accountNumber"],
    optionalIdentifiers: ["branchName", "bankAddress"],
    branchCodeLabel: "Transit number",
  },
  IN: {
    currency: "INR",
    identifiers: ["accountName", "accountNumber", "bankName", "branchCode"],
    optionalIdentifiers: ["branchName"],
    branchCodeLabel: "IFSC code",
  },
  AU: {
    currency: "AUD",
    identifiers: ["accountName", "accountNumber", "bankName", "branchCode"],
    optionalIdentifiers: ["branchName"],
    branchCodeLabel: "BSB code",
  },
  IE: { currency: "EUR", identifiers: ["accountName", "iban"], optionalIdentifiers: ["branchName"] },
};

const DEFAULT_SPEC = {
  currency: "USD",
  identifiers: ["accountName", "accountNumber", "bankName", "swiftCode"],
  optionalIdentifiers: ["branchName", "branchCode"],
  branchCodeLabel: "Branch code",
};

const isSepa = (code) => SEPA_COUNTRIES.has(code);

/** The currency a country's own rail settles in. */
const homeCurrencyFor = (code) => {
  if (isSepa(code)) return "EUR";
  return COUNTRY_SPECS[code]?.currency || DEFAULT_SPEC.currency;
};

/**
 * All countries, alphabetical by name, for the country picker.
 * `currency` is the sensible default payout currency for that country.
 */
export const COUNTRIES = getCountries()
  .map((code) => ({
    code,
    name: countryName(code),
    flag: flagFor(code),
    currency: homeCurrencyFor(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Which identifiers to ask for on a given country's rail.
 *
 * A UK supplier is asked for a sort code and account number, because that is
 * what their banking app shows them, with the IBAN offered as optional. A
 * eurozone supplier is asked only for an IBAN, because that already encodes the
 * country, the bank, the branch and the account number — asking for an account
 * number as well is the kind of thing that makes people abandon a form halfway.
 *
 * @param {string} countryCode ISO-3166 alpha-2, e.g. "GH"
 */
export function getCountryBankSpec(countryCode) {
  const code = (countryCode || "").toUpperCase();
  const base = COUNTRY_SPECS[code] || DEFAULT_SPEC;

  if (IBAN_COUNTRIES.has(code)) {
    // The UK keeps a local domestic rail alongside its IBAN.
    if (code === "GB") {
      return buildSpec(code, "GBP", {
        usesIban: true,
        isSepa: false,
        identifiers: ["sortCode", "accountNumber"],
        optionalIdentifiers: ["iban", "swiftCode", "branchName"],
        branchCodeLabel: "Branch code",
      });
    }
    // Inside SEPA the BIC is optional; on a non-eurozone IBAN rail (Switzerland,
    // Norway…) the bank still needs it to route the wire.
    return buildSpec(code, homeCurrencyFor(code), {
      usesIban: true,
      isSepa: isSepa(code),
      identifiers: ["iban"],
      optionalIdentifiers: ["swiftCode", "branchName"],
      branchCodeLabel: base.branchCodeLabel,
    });
  }

  return buildSpec(code, homeCurrencyFor(code), {
    usesIban: false,
    isSepa: false,
    identifiers: base.identifiers,
    optionalIdentifiers: base.optionalIdentifiers || [],
    branchCodeLabel: base.branchCodeLabel,
  });
}

/**
 * The account holder's name is required on every bank rail — the backend needs
 * it to build the transfer instruction, and a mismatch between it and the bank
 * record is the single most common reason a payout bounces. Declaring it here
 * rather than in each country's entry keeps the "Optional" badge honest.
 */
function buildSpec(countryCode, currency, { identifiers, optionalIdentifiers, ...rest }) {
  return {
    countryCode,
    currency,
    identifiers: ["accountName", ...identifiers.filter((f) => f !== "accountName")],
    optionalIdentifiers: optionalIdentifiers.filter((f) => f !== "accountName"),
    ...rest,
  };
}

// ─────────────────────────────────────────────────────────────
// Field labels, placeholders and helper copy
// ─────────────────────────────────────────────────────────────

const FIELD_COPY = {
  accountName: {
    label: "Account holder name",
    help: "Exactly as your bank holds it — a mismatch makes the transfer bounce.",
  },
  accountNumber: {
    label: "Account number",
    help: "Between 6 and 32 digits. Spaces and dashes are fine.",
  },
  iban: {
    label: "IBAN",
    help: "Usually starts with two letters and two digits, then up to 30 more characters.",
  },
  sortCode: { label: "Sort code", help: "6 digits — we format it as 12-34-56 for you." },
  routingNumber: { label: "Routing number", help: "9 digits for US banks, 8 for some others." },
  swiftCode: { label: "SWIFT / BIC", help: "Usually 8 or 11 characters, e.g. DEUTDEFF." },
  branchCode: { label: "Branch code", help: "Found on your bank statement or in your banking app." },
  branchName: { label: "Bank branch", help: "Optional. Helps us reach the right branch." },
  bankName: { label: "Bank name", help: "The bank that holds the account." },
  bankAddress: { label: "Bank address", help: "Optional. Speeds up verification for international wires." },
};

export const fieldCopy = (key, spec) => {
  const copy = FIELD_COPY[key] || {};
  if (key === "branchCode" && spec?.branchCodeLabel) {
    return { ...copy, label: spec.branchCodeLabel };
  }
  return copy;
};

// ─────────────────────────────────────────────────────────────
// Input formatting
// ─────────────────────────────────────────────────────────────

const onlyAllowed = (value, pattern) => value.toUpperCase().replace(new RegExp(`[^${pattern}]`, "g"), "");
const onlyDigits = (value) => value.replace(/\D/g, "");

export const formatIban = (value) => onlyAllowed(value, "A-Z0-9").replace(/(.{4})(?=.)/g, "$1 ").trim();
export const formatSwiftCode = (value) => onlyAllowed(value, "A-Z0-9").slice(0, 11);
export const formatSortCode = (value) => onlyDigits(value).slice(0, 6).replace(/(\d{2})(?=\d)/g, "$1-");
export const formatRoutingNumber = (value) => onlyDigits(value).slice(0, 9);
export const formatAccountNumber = (value) => onlyDigits(value).slice(0, 32);
export const formatBranchCode = (value) => onlyAllowed(value, "A-Z0-9-").slice(0, 20);
export const formatMobileNumber = (value) => onlyDigits(value).slice(0, 15).replace(/(\d{2})(?=\d)/g, "$1 ");

/** Drop display formatting so the backend's 32-character cap can't be tripped. */
export const stripSeparators = (value) => (value || "").replace(/[\s-]/g, "");

/** "•••• 0008" — how a saved account number is shown in the list. */
export const maskTail = (value) => {
  const tail = (value || "").replace(/[\s-]/g, "").slice(-4);
  return tail ? `•••• ${tail}` : "";
};

// ─────────────────────────────────────────────────────────────
// Form state + payload
// ─────────────────────────────────────────────────────────────

/** A blank form, pre-filled with the sensible currency for `countryCode`. */
export function initialPayoutMethodForm({ countryCode = "GH", currency } = {}) {
  return {
    type: "BANK_TRANSFER",
    accountName: "",
    accountNumber: "",
    bankName: "",
    bankAddress: "",
    bankCountry: countryCode || "",
    iban: "",
    sortCode: "",
    routingNumber: "",
    swiftCode: "",
    branchCode: "",
    branchName: "",
    mobileProvider: "",
    mobileNumber: "",
    paypalEmail: "",
    currency: currency || homeCurrencyFor(countryCode) || "USD",
    isDefault: false,
  };
}

/**
 * Turn form state into the create/update payload.
 *
 * Empty fields are omitted rather than sent as "": the backend's `bankCountry`
 * is a bare `z.string()` with an `/^[A-Z]{2}$/` refine, so an empty string would
 * be rejected outright, and separators are stripped because `accountNumber` is
 * capped at 32 characters *including* the spaces we format in.
 */
export function buildPayoutMethodPayload(form) {
  const put = (key, value, transform = (v) => v) => {
    const next = typeof value === "string" ? value.trim() : value;
    if (next === "" || next === undefined || next === null) return {};
    return { [key]: transform(next) };
  };

  const payload = { type: form.type, ...put("currency", form.currency, (v) => v.toUpperCase()) };
  if (form.isDefault) payload.isDefault = true;

  if (form.type === "BANK_TRANSFER") {
    Object.assign(
      payload,
      put("accountName", form.accountName),
      put("bankName", form.bankName),
      put("bankAddress", form.bankAddress),
      put("bankCountry", form.bankCountry, (v) => v.toUpperCase()),
      put("accountNumber", form.accountNumber, stripSeparators),
      put("iban", form.iban, stripSeparators),
      put("sortCode", form.sortCode, stripSeparators),
      put("routingNumber", form.routingNumber, stripSeparators),
      put("swiftCode", form.swiftCode, stripSeparators),
      put("branchCode", form.branchCode, stripSeparators),
      put("branchName", form.branchName),
    );
  } else if (form.type === "MOBILE_MONEY") {
    Object.assign(
      payload,
      put("accountName", form.accountName),
      put("mobileProvider", form.mobileProvider),
      put("mobileNumber", form.mobileNumber, stripSeparators),
    );
  } else {
    Object.assign(payload, put("paypalEmail", form.paypalEmail, (v) => v.toLowerCase()));
  }

  return payload;
}

// ─────────────────────────────────────────────────────────────
// "What happens next" copy
// ─────────────────────────────────────────────────────────────

/**
 * Describe the rail the supplier's details will actually be paid on.
 *
 * GetYourGuide picks the rail silently from the bank country and currency; we
 * say it out loud instead, because a supplier who expects a free local transfer
 * and gets an international wire is a support ticket.
 */
export function describePayoutRoute(form) {
  if (form.type === "PAYPAL") {
    return { title: "PayPal transfer", detail: "Payouts go to this email address." };
  }
  if (form.type === "MOBILE_MONEY") {
    return {
      title: "Mobile money",
      detail: "Payouts land in your wallet, usually within minutes.",
    };
  }

  const code = (form.bankCountry || "").toUpperCase();
  const currency = (form.currency || "USD").toUpperCase();
  const spec = getCountryBankSpec(code);
  const currencyOf = COUNTRIES.find((c) => c.code === code)?.currency;

  if (spec.isSepa && currency === "EUR") {
    return { title: "SEPA transfer", detail: "No fee from us — usually next business day." };
  }
  if (currency && currency === currencyOf) {
    return { title: "Local transfer", detail: "No international fees — usually 1–2 business days." };
  }
  return {
    title: "International transfer",
    detail: "Your bank may charge a receiving fee, so we send the full amount.",
  };
}
