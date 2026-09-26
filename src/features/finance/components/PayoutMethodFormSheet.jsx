import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Info,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountryCombobox from "./CountryCombobox";
import { validatePayoutForm } from "../utils/validatePayoutMethod";
import {
  MOBILE_MONEY_PROVIDERS,
  PAYOUT_CURRENCIES,
  PAYOUT_METHOD_TYPES,
  buildPayoutMethodPayload,
  describePayoutRoute,
  fieldCopy,
  formatAccountNumber,
  formatBranchCode,
  formatIban,
  formatMobileNumber,
  formatRoutingNumber,
  formatSortCode,
  formatSwiftCode,
  getCountryBankSpec,
  initialPayoutMethodForm,
  maskTail,
} from "../config/payoutMethodForm";

const TYPE_ICONS = { building: Landmark, smartphone: Smartphone, wallet: Wallet };

/** Reading order. A field is rendered if the country's rail requires it. */
const FIELD_ORDER = [
  "accountName",
  "sortCode",
  "routingNumber",
  "accountNumber",
  "iban",
  "swiftCode",
  "bankName",
  "branchName",
  "branchCode",
  "bankAddress",
];

const NUMERIC = new Set(["accountNumber", "sortCode", "routingNumber"]);
const UPPERCASE = new Set(["iban", "swiftCode", "sortCode", "routingNumber", "branchCode"]);

const FORMATTERS = {
  accountNumber: formatAccountNumber,
  iban: formatIban,
  swiftCode: formatSwiftCode,
  sortCode: formatSortCode,
  routingNumber: formatRoutingNumber,
  branchCode: formatBranchCode,
};

const AUTO_COMPLETE = {
  accountName: "name",
  bankName: "organization",
  mobileNumber: "tel",
  paypalEmail: "email",
};

const PLACEHOLDERS = {
  accountName: "e.g. Gideon Kwarteng",
  accountNumber: "e.g. 1234567890",
  iban: "e.g. DE89 3704 0044 0532 0130 00",
  swiftCode: "e.g. DEUTDEFF",
  sortCode: "e.g. 12-34-56",
  routingNumber: "e.g. 021000021",
  bankName: "e.g. Ecobank Ghana",
  branchName: "e.g. Accra Main",
  branchCode: "e.g. 200300",
  bankAddress: "e.g. 10 Independence Ave, Accra",
  mobileNumber: "e.g. 024 400 0000",
  paypalEmail: "e.g. name@example.com",
};

/**
 * The supplier "add payout method" form.
 *
 * One component, used by both the Finance page and the Settings page, so the
 * two can no longer drift apart. It is a side sheet on desktop and a full-screen
 * sheet on mobile rather than an inline panel, because the form is a focused
 * task with a definite end — and because the old arrangement put the Cancel
 * button in the page toolbar, nowhere near the thing it cancels.
 */
export default function PayoutMethodFormSheet({ open, ...props }) {
  return (
    <AnimatePresence>
      {open && <PayoutMethodFormSheetBody {...props} />}
    </AnimatePresence>
  );
}

/**
 * Mounted only while the sheet is open, so its state is always a clean slate —
 * no effect is needed to reset the form between openings.
 */
function PayoutMethodFormSheetBody({
  onClose,
  onSubmit,
  defaultCountry = "GH",
  defaultCurrency,
  title = "Add payout method",
  submitLabel = "Save payout method",
}) {
  const uid = useId();
  const [form, setForm] = useState(() => initialPayoutMethodForm({ countryCode: defaultCountry, currency: defaultCurrency }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [otherProvider, setOtherProvider] = useState(false);
  const [defaultOn, setDefaultOn] = useState(false);
  const closeRef = useRef(null);
  // Escape must not close the sheet mid-save, but the listener must not be torn
  // down and re-added every time `saving` flips.
  const savingRef = useRef(false);
  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  const spec = getCountryBankSpec(form.bankCountry);
  const route = describePayoutRoute(form);
  const maskedTail = maskTail(form.accountNumber || form.iban || form.mobileNumber);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !savingRef.current) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  /** Re-run validation, but only surface the error for the field being left. */
  const validateOne = (key) => {
    const { errors: found } = validatePayoutForm(form);
    setErrors((prev) => ({ ...prev, [key]: found[key] }));
  };

  const visibleFields =
    form.type === "BANK_TRANSFER"
      ? FIELD_ORDER.filter(
          (f) => spec.identifiers.includes(f) || spec.optionalIdentifiers.includes(f) || f === "accountName",
        )
      : [];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    const { ok, errors: found } = validatePayoutForm(form);
    setErrors(found);
    if (!ok) {
      const first = document.getElementById(`${uid}-${Object.keys(found)[0]}`);
      first?.focus?.();
      return;
    }

    setSaving(true);
    try {
      await onSubmit(buildPayoutMethodPayload({ ...form, isDefault: defaultOn }));
    } catch (err) {
      // The backend reports zod issues as `body.<field>: <message>`.
      const match = String(err?.response?.data?.message || "").match(/^body\.(\w+):\s*(.*)$/);
      if (match) {
        setErrors((prev) => ({ ...prev, [match[1]]: match[2] }));
        document.getElementById(`${uid}-${match[1]}`)?.focus?.();
      } else {
        setFormError(err?.response?.data?.message || "We couldn't save that. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
    >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-[540px]"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
              <p className="mt-0.5 text-sm text-slate-500">We'll pay you on the schedule you've chosen.</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
              className="-mr-1 shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-7">
              {formError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1 — how you want to be paid */}
              <fieldset className="space-y-3">
                <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  How do you want to be paid?
                </legend>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {PAYOUT_METHOD_TYPES.map((type) => {
                    const Icon = TYPE_ICONS[type.icon];
                    const isActive = form.type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, type: type.value }));
                          setErrors({});
                          setOtherProvider(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all sm:flex-col sm:items-start sm:gap-2 sm:p-3.5",
                          isActive
                            ? "border-emerald-500 bg-emerald-50/60"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
                          )}
                        >
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1 sm:flex-none">
                          <span className={cn("block text-sm font-semibold", isActive ? "text-emerald-800" : "text-slate-800")}>
                            {type.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{type.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* 2 — the details */}
              <fieldset className="space-y-4">
                <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {form.type === "BANK_TRANSFER" ? "Your bank details" : form.type === "MOBILE_MONEY" ? "Your wallet" : "Your PayPal"}
                </legend>

                {form.type === "BANK_TRANSFER" && (
                  <>
                    <Field
                      id={`${uid}-bankCountry`}
                      label="Country of your bank account"
                      help="This decides which details we ask for below."
                      error={errors.bankCountry}
                    >
                      {(props) => (
                        <CountryCombobox
                          id={props.id}
                          value={form.bankCountry}
                          onChange={(code) => {
                            const next = getCountryBankSpec(code);
                            setForm((prev) => ({ ...prev, bankCountry: code, currency: next.currency }));
                            setErrors({});
                          }}
                          invalid={Boolean(errors.bankCountry)}
                          describedBy={props.describedBy}
                        />
                      )}
                    </Field>

                    {visibleFields.map((field) => (
                      <Field
                        key={field}
                        id={`${uid}-${field}`}
                        label={fieldCopy(field, spec).label}
                        help={fieldCopy(field, spec).help}
                        error={errors[field]}
                        optional={!spec.identifiers.includes(field)}
                      >
                        {(props) => (
                          <input
                            id={props.id}
                            aria-invalid={Boolean(errors[field]) || undefined}
                            aria-describedby={props.describedBy}
                            required={!props.optional}
                            value={form[field]}
                            onChange={(e) => set(field, FORMATTERS[field] ? FORMATTERS[field](e.target.value) : e.target.value)}
                            onBlur={() => validateOne(field)}
                            placeholder={PLACEHOLDERS[field]}
                            autoComplete={AUTO_COMPLETE[field] || "off"}
                            inputMode={NUMERIC.has(field) ? "numeric" : undefined}
                            autoCapitalize={UPPERCASE.has(field) ? "characters" : undefined}
                            spellCheck={false}
                            className={inputClass(Boolean(errors[field]))}
                          />
                        )}
                      </Field>
                    ))}
                  </>
                )}

                {form.type === "MOBILE_MONEY" && (
                  <>
                    <Field id={`${uid}-mobileProvider`} label="Mobile money provider" error={errors.mobileProvider}>
                      {(props) => (
                        <Select
                          value={otherProvider ? "__other__" : form.mobileProvider}
                          onValueChange={(value) => {
                            if (value === "__other__") {
                              setOtherProvider(true);
                              set("mobileProvider", "");
                            } else {
                              setOtherProvider(false);
                              set("mobileProvider", value);
                            }
                          }}
                        >
                          <SelectTrigger
                            id={props.id}
                            aria-invalid={Boolean(errors.mobileProvider) || undefined}
                            aria-describedby={props.describedBy}
                            className={selectClass(Boolean(errors.mobileProvider))}
                          >
                            <SelectValue placeholder="Choose your network" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {MOBILE_MONEY_PROVIDERS.map((provider) => (
                              <SelectItem key={provider} value={provider}>
                                {provider}
                              </SelectItem>
                            ))}
                            <SelectItem value="__other__">Another provider…</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </Field>

                    {otherProvider && (
                      <Field id={`${uid}-customProvider`} label="Provider name" error={errors.mobileProvider}>
                        {(props) => (
                          <input
                            id={props.id}
                            value={form.mobileProvider}
                            onChange={(e) => set("mobileProvider", e.target.value)}
                            placeholder="e.g. Chipper Cash"
                            className={inputClass(Boolean(errors.mobileProvider))}
                          />
                        )}
                      </Field>
                    )}

                    <Field
                      id={`${uid}-mobileNumber`}
                      label="Mobile money number"
                      help="The number registered to the wallet."
                      error={errors.mobileNumber}
                    >
                      {(props) => (
                        <input
                          id={props.id}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          aria-invalid={Boolean(errors.mobileNumber) || undefined}
                          aria-describedby={props.describedBy}
                          value={form.mobileNumber}
                          onChange={(e) => set("mobileNumber", formatMobileNumber(e.target.value))}
                          onBlur={() => validateOne("mobileNumber")}
                          placeholder={PLACEHOLDERS.mobileNumber}
                          className={inputClass(Boolean(errors.mobileNumber))}
                        />
                      )}
                    </Field>

                    <Field
                      id={`${uid}-walletHolder`}
                      label="Wallet holder name"
                      help="Must match the name on the wallet."
                      error={errors.accountName}
                    >
                      {(props) => (
                        <input
                          id={props.id}
                          autoComplete="name"
                          aria-invalid={Boolean(errors.accountName) || undefined}
                          aria-describedby={props.describedBy}
                          value={form.accountName}
                          onChange={(e) => set("accountName", e.target.value)}
                          onBlur={() => validateOne("accountName")}
                          placeholder={PLACEHOLDERS.accountName}
                          className={inputClass(Boolean(errors.accountName))}
                        />
                      )}
                    </Field>
                  </>
                )}

                {form.type === "PAYPAL" && (
                  <Field
                    id={`${uid}-paypalEmail`}
                    label="PayPal email"
                    help="Payouts are sent to the email on your PayPal account."
                    error={errors.paypalEmail}
                  >
                    {(props) => (
                      <input
                        id={props.id}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        aria-invalid={Boolean(errors.paypalEmail) || undefined}
                        aria-describedby={props.describedBy}
                        value={form.paypalEmail}
                        onChange={(e) => set("paypalEmail", e.target.value)}
                        onBlur={() => validateOne("paypalEmail")}
                        placeholder={PLACEHOLDERS.paypalEmail}
                        className={inputClass(Boolean(errors.paypalEmail))}
                      />
                    )}
                  </Field>
                )}

                <Field id={`${uid}-currency`} label="Currency" error={errors.currency} help="What you'd like to be paid in.">
                  {(props) => (
                    <Select value={form.currency} onValueChange={(value) => set("currency", value)}>
                      <SelectTrigger
                        id={props.id}
                        aria-invalid={Boolean(errors.currency) || undefined}
                        aria-describedby={props.describedBy}
                        className={selectClass(Boolean(errors.currency))}
                      >
                        <SelectValue placeholder="Choose a currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYOUT_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} — {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              </fieldset>

              {/* 3 — what happens next */}
              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-emerald-900">{route.title}</p>
                    <p className="mt-0.5 text-emerald-800/80">{route.detail}</p>
                    {maskedTail && (
                      <p className="mt-1 text-xs text-emerald-800/70">
                        to <span className="font-mono">{maskedTail}</span>
                      </p>
                    )}
                  </div>
                </div>
                <p className="flex items-start gap-2 border-t border-emerald-100 pt-3 text-xs leading-relaxed text-emerald-800/80">
                  <Lock size={13} className="mt-0.5 shrink-0" />
                  <span>
                    We check new details before your first payout. If you edit them later, the account goes back
                    to pending until we've re-checked it.
                  </span>
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={defaultOn}
                  onChange={(e) => setDefaultOn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
                />
                <span className="text-sm">
                  <span className="font-semibold text-slate-800">Make this my default</span>
                  <span className="mt-0.5 block text-xs text-slate-500">We'll pay this account unless you change it.</span>
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {saving ? "Saving…" : submitLabel}
              </button>
            </div>
          </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Field primitives
// ─────────────────────────────────────────────────────────────

const inputClass = (invalid) =>
  cn(
    "w-full rounded-xl border bg-white px-3.5 py-2.5 font-mono text-sm text-slate-800 transition-all placeholder:font-sans placeholder:text-slate-400",
    "focus:outline-none focus:ring-2",
    invalid
      ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
      : "border-slate-200 focus:border-emerald-400 focus:ring-emerald-500/20",
  );

const selectClass = (invalid) =>
  cn(
    "font-normal",
    invalid ? "border-red-300 ring-1 ring-red-100" : "",
  );

/**
 * Label above, help below, error in place of the help — and a render prop so
 * each control can own its own markup without the label being decoupled from it.
 */
function Field({ id, label, help, error, optional, children }) {
  const uid = useId();
  const helpId = help ? `${uid}-help` : undefined;
  const errorId = error ? `${uid}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {optional && <span className="shrink-0 text-[11px] font-medium text-slate-400">Optional</span>}
      </label>
      {children({ id, describedBy, optional })}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        help && (
          <p id={helpId} className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {help}
          </p>
        )
      )}
    </div>
  );
}
