import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Wallet,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  quoteSupplierBooking,
  createSupplierBooking,
} from "../api";
import { formatDate, cn } from "@/lib/utils";

/**
 * Create booking — a supplier recording a booking for a customer (including a
 * walk-in who has never registered) and reporting money collected outside the
 * platform.
 *
 * Design contract: this is the dashboard's own language — the BookingDetailDrawer
 * chrome (right-side panel over a scrim), the product wizard's step rail, the
 * standard field recipe, sonner toasts. See
 * docs/supplier-created-bookings-ui-audit.md.
 *
 * The two honesty rules this flow owes the supplier:
 *  - the price shown is the SERVER's quote, recomputed whenever the party or
 *    date changes. The browser never computes or submits a total.
 *  - an offline collection is labelled "Recorded as collected", never "Paid":
 *    TravioAfrica does not verify it, and the drawer says so in the step where
 *    the supplier reports it.
 *
 * Uncertain responses: the idempotency key is minted once per attempt and kept
 * for the wizard's lifetime, so a retry after an ambiguous failure replays the
 * same booking rather than creating a second one. The failure state says so
 * instead of guessing.
 */

const STEPS = [
  { key: "experience", label: "Experience" },
  { key: "customer", label: "Customer" },
  { key: "collection", label: "Pricing & collection" },
  { key: "review", label: "Review" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "POS", label: "Card / POS (collected outside)" },
  { value: "OTHER", label: "Other" },
];

function newIdempotencyKey() {
  return `sbk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

function StepRail({ step }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              i < step
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : i === step
                  ? "bg-[#044b3b] text-white"
                  : "bg-slate-100 text-slate-500",
            )}
          >
            {i + 1}. {s.label}
          </span>
          {i < STEPS.length - 1 && <span className="text-slate-300">·</span>}
        </div>
      ))}
    </div>
  );
}

export default function CreateBookingDrawer({
  open,
  onClose,
  tours,
  onCreated,
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Minted once per attempt and held for the wizard's lifetime: a retry after
  // an uncertain response replays the same booking instead of a second one.
  const idempotencyKey = useRef(newIdempotencyKey()).current;

  const [form, setForm] = useState({
    tourId: "",
    optionId: "",
    travelDate: "",
    selectedTime: "",
    adults: 2,
    children: 0,
    infants: 0,
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    specialRequests: "",
    pickupAddress: "",
    pickupAreaName: "",
    method: "CASH",
    amount: "",
    externalRef: "",
    collectedAt: "",
  });
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [tourQuery, setTourQuery] = useState("");

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const selectedTour = tours.find((t) => t.id === form.tourId) || null;
  const travelers = useMemo(
    () => ({
      adults: Number(form.adults) || 0,
      children: Number(form.children) || 0,
      infants: Number(form.infants) || 0,
    }),
    [form.adults, form.children, form.infants],
  );
  const partySize = travelers.adults + travelers.children + travelers.infants;

  const filteredTours = useMemo(() => {
    const q = tourQuery.trim().toLowerCase();
    if (!q) return tours;
    return tours.filter((t) => String(t.title || "").toLowerCase().includes(q));
  }, [tours, tourQuery]);

  // The quote is the only price this flow may show. It is re-fetched whenever
  // an input that changes the price changes; the last request wins, so a fast
  // typing burst cannot leave a stale total on screen.
  const canQuote = form.tourId && form.travelDate && partySize > 0;
  useEffect(() => {
    if (!canQuote) return undefined;
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setQuoting(true);
      setError(null);
      try {
        const q = await quoteSupplierBooking({
          tourId: form.tourId,
          optionId: form.optionId || undefined,
          travelDate: form.travelDate,
          selectedTime: form.selectedTime || undefined,
          travelers,
        });
        if (!cancelled) setQuote(q);
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setError(err?.response?.data?.message || "We could not price this booking.");
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tourId, form.optionId, form.travelDate, form.selectedTime, form.adults, form.children, form.infants]);

  const outstanding = quote ? Math.max(0, quote.total - (Number(form.amount) || 0)) : null;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createSupplierBooking(
        {
          tourId: form.tourId,
          optionId: form.optionId || undefined,
          travelDate: form.travelDate,
          selectedTime: form.selectedTime || undefined,
          travelers,
          guest: {
            name: form.guestName,
            phone: form.guestPhone || undefined,
            email: form.guestEmail || undefined,
          },
          pickup: form.pickupAddress
            ? { address: form.pickupAddress, areaName: form.pickupAreaName || undefined }
            : undefined,
          specialRequests: form.specialRequests || undefined,
          collection: form.amount
            ? {
                amount: Number(form.amount),
                method: form.method,
                collectedAt: form.collectedAt ? new Date(form.collectedAt).toISOString() : undefined,
                externalRef: form.externalRef || undefined,
              }
            : undefined,
        },
        idempotencyKey,
      );
      toast.success(`Booking ${booking?.bookingNumber || ""} created`);
      onCreated?.(booking);
      onClose?.();
    } catch (err) {
      // Never claim a failure that may have been a success: the key above
      // resolves it on retry.
      setError(
        err?.response?.data?.message ||
          "We could not confirm this booking was created. Re-submitting is safe: it will not create a second booking.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create booking"
        className="relative ml-auto w-full sm:max-w-2xl h-full bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Create booking</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              For a customer, including a walk-in — prices come from the server.
            </p>
            <div className="mt-2 overflow-x-auto">
              <StepRail step={step} />
            </div>
          </div>
          <button
            type="button"
            aria-label="Close create booking"
            onClick={submitting ? undefined : onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Search size={15} className="text-slate-400" /> Experience
              </h3>
              <Field label="Tour">
                <input
                  type="search"
                  aria-label="Search your tours"
                  value={tourQuery}
                  onChange={(e) => setTourQuery(e.target.value)}
                  placeholder="Search your tours…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
                <div className="mt-2 max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-50">
                  {filteredTours.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set("tourId", t.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm",
                        form.tourId === t.id
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-800 hover:bg-slate-50",
                      )}
                    >
                      {t.title}
                    </button>
                  ))}
                  {filteredTours.length === 0 && (
                    <p className="px-3 py-3 text-xs text-slate-500">No tours match.</p>
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Activity date">
                  <input
                    type="date"
                    aria-label="Activity date"
                    value={form.travelDate}
                    onChange={(e) => set("travelDate", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </Field>
                <Field label="Departure time">
                  <input
                    type="time"
                    aria-label="Departure time"
                    value={form.selectedTime}
                    onChange={(e) => set("selectedTime", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["adults", "children", "infants"].map((k) => (
                  <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      aria-label={k}
                      value={form[k]}
                      onChange={(e) => set(k, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    />
                  </Field>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Users size={15} className="text-slate-400" /> Customer
              </h3>
              <Field label="Lead traveller name" hint="A walk-in does not need a TravioAfrica account.">
                <input
                  aria-label="Lead traveller name"
                  value={form.guestName}
                  onChange={(e) => set("guestName", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <input
                    aria-label="Phone"
                    value={form.guestPhone}
                    onChange={(e) => set("guestPhone", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </Field>
                <Field label="Email (optional)">
                  <input
                    type="email"
                    aria-label="Email"
                    value={form.guestEmail}
                    onChange={(e) => set("guestEmail", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </Field>
              </div>
              <Field label="Pickup address (optional)">
                <input
                  aria-label="Pickup address"
                  value={form.pickupAddress}
                  onChange={(e) => set("pickupAddress", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </Field>
              <Field label="Special requests (optional)">
                <textarea
                  aria-label="Special requests"
                  rows={3}
                  value={form.specialRequests}
                  onChange={(e) => set("specialRequests", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Wallet size={15} className="text-slate-400" /> Pricing & collection
              </h3>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Price (calculated by TravioAfrica)</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">
                  {quoting ? <Loader2 size={18} className="animate-spin inline" /> : quote ? `$${Number(quote.total).toFixed(2)}` : "—"}
                </p>
                {quote && !quote.available && (
                  <p className="text-xs text-amber-700 mt-1">{quote.unavailableReason || "No availability for that date."}</p>
                )}
              </div>

              <Field label="How was it paid?" hint="TravioAfrica does not verify offline payments.">
                <select
                  aria-label="Payment method"
                  value={form.method}
                  onChange={(e) => set("method", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount recorded as collected">
                  <input
                    type="number"
                    step="0.01"
                    aria-label="Amount collected"
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </Field>
                <Field label="Reference (optional)">
                  <input
                    aria-label="Payment reference"
                    value={form.externalRef}
                    onChange={(e) => set("externalRef", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </Field>
              </div>

              {quote && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
                  <p className="text-slate-500">
                    Recorded as collected{" "}
                    <strong className="text-slate-800 tabular-nums">${(Number(form.amount) || 0).toFixed(2)}</strong>
                  </p>
                  <p className="text-slate-500 mt-1">
                    Outstanding balance{" "}
                    <strong className="text-slate-800 tabular-nums">${(outstanding ?? 0).toFixed(2)}</strong>
                  </p>
                  <p className="text-slate-400 mt-2">
                    TravioAfrica does not verify offline payments. A reported collection is
                    not a platform payment.
                  </p>
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Review</h3>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-50 text-sm">
                <div className="px-3 py-2"><span className="text-xs text-slate-500 block">Experience</span>{selectedTour?.title}</div>
                <div className="px-3 py-2"><span className="text-xs text-slate-500 block">When</span>{formatDate(form.travelDate)}{form.selectedTime ? ` · ${form.selectedTime}` : ""}</div>
                <div className="px-3 py-2"><span className="text-xs text-slate-500 block">Party</span>{partySize} traveller{partySize === 1 ? "" : "s"}</div>
                <div className="px-3 py-2"><span className="text-xs text-slate-500 block">Customer</span>{form.guestName}</div>
                <div className="px-3 py-2">
                  <span className="text-xs text-slate-500 block">Price</span>
                  <span className="tabular-nums">{quote ? `$${Number(quote.total).toFixed(2)}` : "—"}</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">Calculated by TravioAfrica.</span>
                </div>
                <div className="px-3 py-2">
                  <span className="text-xs text-slate-500 block">Collection</span>
                  {form.amount
                    ? `${PAYMENT_METHODS.find((m) => m.value === form.method)?.label} — $${Number(form.amount).toFixed(2)} recorded as collected`
                    : "Unpaid reservation"}
                </div>
              </div>
              <p className="text-xs text-slate-500 flex items-start gap-1.5">
                <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
                Submitting is safe to repeat: if the response is uncertain, re-submit
                with the same attempt will not create a second booking.
              </p>
            </section>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={14} className="inline" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && (!form.tourId || !form.travelDate || partySize < 1)}
              className="px-5 py-2 bg-[#044b3b] text-white rounded-lg text-sm font-semibold hover:bg-[#033629] disabled:opacity-50"
            >
              Continue <ChevronRight size={14} className="inline" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !quote || !quote.available}
              className="px-5 py-2 bg-[#044b3b] text-white rounded-lg text-sm font-semibold hover:bg-[#033629] disabled:opacity-50 inline-flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <CheckCircle2 size={14} /> Create booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
