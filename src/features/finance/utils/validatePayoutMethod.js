/**
 * Client-side validation for the supplier "Add Payout Method" form.
 *
 * These rules mirror the backend `utils/payoutMethodValidation.js` zod schema so
 * the supplier fails fast on malformed input (e.g. a bad IBAN or short account
 * number) instead of round-tripping to the server. The backend remains the
 * source of truth — these are convenience checks only.
 */

export const BIC_REGEX = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

function ibanIsValid(value) {
  if (typeof value !== "string") return false
  const iban = value.toUpperCase().replace(/\s+/g, "")
  if (iban.length < 15 || iban.length > 34) return false
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55))
  if (!/^\d+$/.test(numeric)) return false
  let remainder = ""
  for (const ch of numeric) {
    remainder += ch
    remainder = String(parseInt(remainder, 10) % 97)
  }
  return parseInt(remainder, 10) === 1
}

const digitsOnly = (v) => (v || "").replace(/[\s-]/g, "")

const accountNumberValid = (v) => {
  if (!/^\d[\d\s-]{5,31}$/.test(v)) return false
  const d = digitsOnly(v)
  return d.length >= 6 && d.length <= 32
}

const routingValid = (v) => /^\d{8,11}$/.test(digitsOnly(v))

const sortCodeValid = (v) => /^\d{6}$/.test(digitsOnly(v))

const branchCodeValid = (v) => (v || "").trim().length <= 20

const branchNameValid = (v) => (v || "").trim().length <= 100

const countryValid = (v) => /^[A-Za-z]{2}$/.test((v || "").trim())

const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim())

const hasValue = (v) => typeof v === "string" && v.trim() !== ""

/**
 * Validate the payout method form object.
 * @param {{ type, accountName?, accountNumber?, bankName?, bankCountry?,
 *          iban?, swiftCode?, routingNumber?, sortCode?, branchCode?, branchName?,
 *          paypalEmail? }} form
 * @returns {{ ok: boolean, errors: Record<string, string> }}
 */
export function validatePayoutMethod(form) {
  const errors = {}
  const f = (obj, key, def = "") => (obj && typeof obj[key] === "string" ? obj[key] : def)

  if (form.type === "BANK_TRANSFER") {
    const accountName = f(form, "accountName")
    const accountNumber = f(form, "accountNumber")
    const bankName = f(form, "bankName")
    const bankCountry = f(form, "bankCountry")
    const iban = f(form, "iban")
    const swiftCode = f(form, "swiftCode")
    const routingNumber = f(form, "routingNumber")
    const sortCode = f(form, "sortCode")
    const branchCode = f(form, "branchCode")
    const branchName = f(form, "branchName")

    if (!hasValue(accountName)) errors.accountName = "Account name is required"
    else if (accountName.trim().length > 100) errors.accountName = "Account name is too long"

    if (!hasValue(bankName)) errors.bankName = "Bank name is required"
    else if (bankName.trim().length > 150) errors.bankName = "Bank name is too long"

    // At least one of account number or IBAN is required.
    if (!hasValue(accountNumber) && !hasValue(iban)) {
      errors.accountNumber = "Account number (or IBAN) is required"
    } else {
      if (hasValue(accountNumber) && !accountNumberValid(accountNumber)) {
        errors.accountNumber = "Account number must be 6–32 digits (spaces and dashes allowed)"
      }
      if (hasValue(iban) && !ibanIsValid(iban)) {
        errors.iban = "Invalid IBAN (failed mod-97 check)"
      }
    }

    if (hasValue(bankCountry) && !countryValid(bankCountry)) {
      errors.bankCountry = "Country must be a 2-letter ISO code (e.g. NG, GH, US)"
    }
    if (!hasValue(bankCountry) && (hasValue(iban) || hasValue(swiftCode))) {
      errors.bankCountry = "Country is required when providing an IBAN or SWIFT/BIC"
    }

    if (hasValue(swiftCode) && !BIC_REGEX.test(swiftCode.toUpperCase().replace(/\s+/g, ""))) {
      errors.swiftCode = "Invalid SWIFT/BIC code (e.g. DEUTDEFF)"
    }
    if (hasValue(routingNumber) && !routingValid(routingNumber)) {
      errors.routingNumber = "Routing number must be 8–11 digits"
    }
    if (hasValue(sortCode) && !sortCodeValid(sortCode)) {
      errors.sortCode = "Sort code must be 6 digits (e.g. 12-34-56)"
    }

    if (hasValue(branchCode) && !branchCodeValid(branchCode)) errors.branchCode = "Branch code must be at most 20 characters"
    if (hasValue(branchName) && !branchNameValid(branchName)) errors.branchName = "Branch name must be at most 100 characters"
  }

  if (form.type === "PAYPAL") {
    const paypalEmail = f(form, "paypalEmail")
    if (!hasValue(paypalEmail)) {
      errors.paypalEmail = "PayPal email is required"
    } else if (!emailValid(paypalEmail)) {
      errors.paypalEmail = "Invalid PayPal email address"
    }
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

export const validators = {
  ibanIsValid,
  BIC_REGEX,
  accountNumberValid,
  routingValid,
  sortCodeValid,
  countryValid,
  emailValid,
}
