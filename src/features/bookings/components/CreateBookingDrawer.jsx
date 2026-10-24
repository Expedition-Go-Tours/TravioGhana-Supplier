import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Search,
  Users,
  User,
  Baby,
  Wallet,
  CheckCircle2,
  Info,
  Banknote,
  Smartphone,
  Building2,
  CreditCard,
  Ellipsis,
  CalendarDays,
  Clock3,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  ShieldCheck,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import DatePicker from "@/components/forms/DatePicker";
import AmPmTimePicker from "@/components/shared/AmPmTimePicker";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { useModalDialog } from "@/components/shared/useModalDialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { quoteSupplierBooking, createSupplierBooking } from "../api";

/**
 * Create booking — a supplier recording a booking for a customer (including a
 * walk-in who has never registered) and reporting money collected outside the
 * platform.
 *
 * Design: the dashboard's own language, raised a level — the BookingDetailDrawer
 * chrome, the products page's framer-motion conventions, the app's date picker
 * (a real calendar, not a native input), the AM/PM time picker. Two columns on
 * desktop: the work on the left, a live summary rail on the right, so the price
 * and the party are never out of sight.
 *
 * The two honesty rules this flow owes the supplier:
 *  - the price shown is the SERVER's quote, recomputed whenever the party or
 *    date changes. The browser never computes or submits a total.
 *  - a supplier-collected payment is labelled "Recorded as collected", never
 *    "Paid": TravioGhana does not verify it, and the step says so where the
 *    supplier reports it.
 *
 * Uncertain responses: the idempotency key is minted once per attempt and kept
 * for the drawer's lifetime, so a retry after an ambiguous failure replays the
 * same booking rather than creating a second one. The failure state says so.
 */

const STEPS = [
  { key: "experience", label: "Experience", hint: "Where and when" },
  { key: "customer", label: "Customer", hint: "Who is going" },
  { key: "collection", label: "Payment", hint: "What was collected" },
  { key: "review", label: "Review", hint: "Check and create" },
];

const METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote, hint: "Handed over in person" },
  { value: "MOBILE_MONEY", label: "Mobile money", icon: Smartphone, hint: "MTN, Telecel, AirtelTigo" },
  { value: "BANK_TRANSFER", label: "Bank transfer", icon: Building2, hint: "Paid into your account" },
  { value: "POS", label: "Card / POS", icon: CreditCard, hint: "Your own terminal" },
  { value: "OTHER", label: "Other", icon: Ellipsis, hint: "Anything else" },
];

const PARTY = [
  { key: "adults", label: "Adults", hint: "Ages 13+", icon: User, min: 1 },
  { key: "children", label: "Children", hint: "Ages 3–12", icon: Users, min: 0 },
  { key: "infants", label: "Infants", hint: "Under 3", icon: Baby, min: 0 },
];

const stepVariants = {
  enter: (direction) => ({ x: direction > 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
  exit: (direction) => ({ x: direction > 0 ? -28 : 28, opacity: 0, transition: { duration: 0.14, ease: "easeIn" } }),
};

function newIdempotencyKey() {
  return `sbk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function Field({ label, hint, icon: Icon, children }) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
        {Icon && <Icon size={13} className="text-slate-400" />}
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1.5">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors";

function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
        <Icon size={15} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Pill({ tone = "slate", children }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export default function CreateBookingDrawer({ open, onClose, tours = [], onCreated }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const idempotencyKey = useRef(newIdempotencyKey()).current;

  const [form, setForm] = useState({
    tourId: "",
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
    method: "CASH",
    amount: "",
    externalRef: "",
  });
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [tourQuery, setTourQuery] = useState("");
  const [touched, setTouched] = useState(false);

  const { panelRef, closeRef } = useModalDialog({
    open,
    onClose,
    enabled: !submitting,
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const selectedTour = tours.find((t) => t.id === form.tourId) || null;
  const quoteCurrency = quote?.currency || "USD";
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
  const canQuote = Boolean(form.tourId && form.travelDate && partySize > 0);
  useEffect(() => {
    if (!open || !canQuote) return undefined;
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setQuoting(true);
      setError(null);
      try {
        const q = await quoteSupplierBooking({
          tourId: form.tourId,
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
  }, [open, form.tourId, form.travelDate, form.selectedTime, form.adults, form.children, form.infants]);

  const collected = Number(form.amount) || 0;
  const total = quote?.total ?? 0;
  const outstanding = Math.max(0, Math.round((total - collected) * 100) / 100);
  const overCollected = Boolean(quote) && collected > total + 0.005;
  const youReceive = quote ? total - (quote.commission?.amount || 0) : 0;
  const collectedPct = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0;

  const go = (next) => {
    if (submitting) return;
    setTouched(true);
    setDirection(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  };

  const stepOneValid = Boolean(form.tourId && form.travelDate && partySize >= 1);
  const stepTwoValid = Boolean(form.guestName.trim());

  const canSubmit = Boolean(
    quote
    && quote.available
    && !overCollected
    && !submitting
    // No credit: the commission this booking would owe must already be covered
    // by earnings the platform holds. The server refuses the same request.
    && quote.cover?.sufficient !== false,
  );

  const submit = async () => {
    if (submitting) return;
    setTouched(true);
    if (!stepTwoValid) {
      setDirection(-1);
      setStep(1);
      setError("A name is required so the tour guide knows who is coming.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createSupplierBooking(
        {
          tourId: form.tourId,
          travelDate: form.travelDate,
          selectedTime: form.selectedTime || undefined,
          travelers,
          guest: {
            name: form.guestName.trim(),
            phone: form.guestPhone || undefined,
            email: form.guestEmail || undefined,
          },
          pickup: form.pickupAddress
            ? { address: form.pickupAddress }
            : undefined,
          specialRequests: form.specialRequests || undefined,
          collection: collected > 0
            ? {
                amount: collected,
                method: form.method,
                externalRef: form.externalRef || undefined,
              }
            : undefined,
        },
        idempotencyKey,
      );
      setCreated(booking);
      toast.success(`Booking ${booking?.bookingNumber || ""} created`);
      onCreated?.();
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={submitting ? undefined : onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.9 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-booking-title"
        tabIndex={-1}
        className="create-booking-drawer relative ml-auto flex h-full w-full max-w-[58rem] flex-col bg-slate-50 shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 pb-0 pt-4 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="create-booking-title" className="text-lg font-bold tracking-tight text-slate-900">
                Create booking
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                For a customer, including a walk-in — the price comes from TravioGhana, never from this screen.
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close create booking"
              onClick={submitting ? undefined : onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
              disabled={submitting}
            >
              <X size={18} />
            </button>
          </div>

          {/* Step rail */}
          <div className="mt-4 flex items-end gap-2" role="list">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="listitem"
                  aria-current={active ? "step" : undefined}
                  onClick={() => (i < step || (i === step + 1 && stepOneValid)) && go(i)}
                  disabled={i > step + 1 || submitting}
                  className="group min-w-0 flex-1 pb-3 text-left"
                >
                  <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={false}
                      animate={{ scaleX: done || active ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      style={{ originX: 0 }}
                      className={cn("absolute inset-0 rounded-full", done ? "bg-emerald-400" : "bg-[#044b3b]")}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                        done
                          ? "bg-emerald-100 text-emerald-700"
                          : active
                            ? "bg-[#044b3b] text-white"
                            : "bg-slate-100 text-slate-400",
                      )}
                    >
                      {done ? <CheckCircle2 size={10} /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "truncate text-[11px] font-semibold",
                        active ? "text-slate-900" : done ? "text-emerald-700" : "text-slate-400",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.section
                key={created ? "success" : STEPS[step].key}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="mx-auto max-w-xl space-y-5"
              >
                {created ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.05 }}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60"
                    >
                      <CheckCircle2 size={30} strokeWidth={2.2} />
                    </motion.div>
                    <h3 className="mt-5 text-lg font-bold text-slate-900">Booking created</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {created.bookingNumber && (
                        <>
                          Reference{" "}
                          <span className="font-mono text-xs font-semibold text-slate-700">{created.bookingNumber}</span>
                        </>
                      )}
                    </p>
                    <div className="mt-5 w-full max-w-sm space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-left">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">Reservation</span>
                        <Pill tone="emerald">Confirmed with you</Pill>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">Platform payment</span>
                        <Pill tone="slate">Not collected online</Pill>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">Recorded as collected</span>
                        <span className="text-xs font-semibold tabular-nums text-slate-800">
                          {collected > 0 ? formatCurrency(collected, quoteCurrency) : "Nothing yet"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[#044b3b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#033629]"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          role="alert"
                          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                        >
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {step === 0 && (
                      <div className="space-y-5">
                        <SectionTitle
                          icon={Sparkles}
                          title="Choose the experience"
                          sub="Your own tours. Dates and times are checked against live availability."
                        />

                        <div className="relative">
                          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="search"
                            aria-label="Search your tours"
                            value={tourQuery}
                            onChange={(e) => setTourQuery(e.target.value)}
                            placeholder="Search your tours…"
                            className={cn(inputClass, "pl-9")}
                          />
                        </div>

                        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                          {filteredTours.map((t) => {
                            const selected = form.tourId === t.id;
                            const src = t.coverPhoto || t.photos?.find((p) => p);
                            return (
                              <motion.button
                                key={t.id}
                                type="button"
                                onClick={() => set("tourId", t.id)}
                                aria-pressed={selected}
                                aria-label={t.title}
                                whileTap={{ scale: 0.995 }}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                                  selected
                                    ? "border-emerald-300 bg-emerald-50/70 ring-2 ring-emerald-500/15"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                                )}
                              >
                                <span className="relative h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                  {src ? (
                                    <OptimizedImage src={src} width={112} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-slate-300">
                                      <Package size={18} />
                                    </span>
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-slate-800">{t.title}</span>
                                  <span className="mt-0.5 block text-[11px] text-slate-500">
                                    {(() => {
                                      const meta = t.categorization?.duration || t.duration;
                                      return typeof meta === "string" && meta.trim() ? meta : "Experience";
                                    })()}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    selected
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-slate-300 bg-white text-transparent",
                                  )}
                                >
                                  <CheckCircle2 size={12} />
                                </span>
                              </motion.button>
                            );
                          })}
                          {filteredTours.length === 0 && (
                            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                              No tours match that search.
                            </p>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                <CalendarDays size={13} className="text-slate-400" /> Activity date
                              </span>
                              {form.travelDate && (
                                <span className="text-[11px] font-semibold text-emerald-700">{formatDate(form.travelDate)}</span>
                              )}
                            </div>
                            <DatePicker
                              inline
                              className="create-booking-calendar"
                              value={form.travelDate}
                              onChange={(value) => set("travelDate", value)}
                              minDate={new Date()}
                              aria-label="Activity date"
                            />
                          </div>

                          <div className="flex min-w-0 flex-col gap-3">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <Clock3 size={13} className="text-slate-400" /> Departure time
                            </span>
                            <AmPmTimePicker value={form.selectedTime} onChange={(v) => set("selectedTime", v)} />
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <Users size={13} className="text-slate-400" /> Travellers
                            </span>
                            <div className="divide-y divide-slate-100">
                              {PARTY.map(({ key, label, hint, icon: Icon, min }) => (
                                <div key={key} className="flex items-center justify-between gap-2 py-1.5">
                                  <span className="flex min-w-0 items-center gap-2">
                                    <Icon size={13} className="text-slate-400" />
                                    <span className="min-w-0">
                                      <span className="block text-xs font-medium text-slate-700">{label}</span>
                                      <span className="block text-[10px] text-slate-400">{hint}</span>
                                    </span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      aria-label={`Remove ${key}`}
                                      onClick={() => set(key, Math.max(min, Number(form[key]) - 1))}
                                      disabled={Number(form[key]) <= min}
                                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30"
                                    >
                                      <Minus size={11} />
                                    </button>
                                    <span aria-label={key} className="w-5 text-center text-xs font-semibold tabular-nums text-slate-800">
                                      {form[key]}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`Add ${key}`}
                                      onClick={() => set(key, Math.min(60, Number(form[key]) + 1))}
                                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                                    >
                                      <Plus size={11} />
                                    </button>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 1 && (
                      <div className="space-y-5">
                        <SectionTitle
                          icon={User}
                          title="Who is going?"
                          sub="A walk-in does not need a TravioGhana account. We never create one for them."
                        />
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                            {(form.guestName || "?").trim().slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {form.guestName || "New customer"}
                            </p>
                            <p className="text-[11px] text-slate-500">Walk-in / phone booking</p>
                          </div>
                        </div>

                        <Field label="Lead traveller name" icon={User}>
                          <input
                            aria-label="Lead traveller name"
                            autoComplete="off"
                            value={form.guestName}
                            onChange={(e) => set("guestName", e.target.value)}
                            placeholder="e.g. Kwame Mensah"
                            className={cn(inputClass, touched && !stepTwoValid && "border-red-300")}
                          />
                        </Field>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Phone" icon={Smartphone} hint="Optional, but the driver will want it.">
                            <input
                              aria-label="Phone"
                              inputMode="tel"
                              value={form.guestPhone}
                              onChange={(e) => set("guestPhone", e.target.value)}
                              placeholder="+233 20 000 0000"
                              className={inputClass}
                            />
                          </Field>
                          <Field label="Email" icon={Info} hint="Optional. No account is created or matched.">
                            <input
                              type="email"
                              aria-label="Email"
                              value={form.guestEmail}
                              onChange={(e) => set("guestEmail", e.target.value)}
                              placeholder="name@example.com"
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        <Field label="Pickup address" icon={MapPin} hint="Optional. Leave blank if they make their own way.">
                          <input
                            aria-label="Pickup address"
                            value={form.pickupAddress}
                            onChange={(e) => set("pickupAddress", e.target.value)}
                            placeholder="Hotel, landmark, or street address"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Special requests" icon={Info}>
                          <textarea
                            aria-label="Special requests"
                            rows={3}
                            value={form.specialRequests}
                            onChange={(e) => set("specialRequests", e.target.value)}
                            placeholder="Dietary needs, accessibility, anything the guide should know"
                            className={cn(inputClass, "resize-none")}
                          />
                        </Field>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-5">
                        <SectionTitle
                          icon={Wallet}
                          title="Payment"
                          sub="What you have already collected. This is a record, not a charge."
                        />

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-slate-400">Price, calculated by TravioGhana</p>
                              <div className="mt-1 h-8">
                                {quoting ? (
                                  <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                                    <Loader2 size={14} className="animate-spin" /> Updating…
                                  </span>
                                ) : (
                                  <AnimatePresence mode="popLayout" initial={false}>
                                    <motion.span
                                      key={quote?.total ?? "none"}
                                      initial={{ y: 8, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      exit={{ y: -8, opacity: 0 }}
                                      transition={{ duration: 0.16 }}
                                      className="inline-block text-2xl font-bold tracking-tight tabular-nums text-slate-900"
                                    >
                                      {quote ? formatCurrency(total, quoteCurrency) : "—"}
                                    </motion.span>
                                  </AnimatePresence>
                                )}
                              </div>
                              {quote && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  You receive {formatCurrency(youReceive, quoteCurrency)} once the full price is
                                  collected. Commission applies to money you collect, not to the booking itself.
                                </p>
                              )}
                            </div>
                            {quote && (
                              <Pill tone={quote.available ? "emerald" : "amber"}>
                                {quote.available ? "Available" : "Unavailable"}
                              </Pill>
                            )}
                          </div>
                          {quote && !quote.available && (
                            <p className="mt-2 text-xs text-amber-700">
                              {quote.unavailableReason || "No availability for that date. Pick another date or party size."}
                            </p>
                          )}
                          {quote && quote.available && quote.cover && !quote.cover.sufficient && (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              <p className="font-medium">
                                Commission is not extended on credit.
                              </p>
                              <p className="mt-0.5">
                                This booking needs {formatCurrency(quote.cover.required, quoteCurrency)} of cover;
                                you have {formatCurrency(quote.cover.available, quoteCurrency)} available
                                {quote.cover.shortfall > 0
                                  ? ` — ${formatCurrency(quote.cover.shortfall, quoteCurrency)} short`
                                  : ""}.
                                Settle your balance or wait for an eligible payout before recording this booking.
                              </p>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <Wallet size={13} className="text-slate-400" /> How was it paid?
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {METHODS.map(({ value, label, icon: Icon, hint }) => {
                              const active = form.method === value;
                              return (
                                <motion.button
                                  key={value}
                                  type="button"
                                  onClick={() => set("method", value)}
                                  aria-pressed={active}
                                  whileTap={{ scale: 0.99 }}
                                  className={cn(
                                    "flex items-start gap-2 rounded-xl border p-2.5 text-left transition-all",
                                    value === "OTHER" && "col-span-2",
                                    active
                                      ? "border-emerald-300 bg-emerald-50/70 ring-2 ring-emerald-500/15"
                                      : "border-slate-200 bg-white hover:border-slate-300",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                      active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500",
                                    )}
                                  >
                                    <Icon size={14} />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold text-slate-800">{label}</span>
                                    <span className="block truncate text-[10px] text-slate-500">{hint}</span>
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Recorded as collected" icon={Banknote}>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                {quoteCurrency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                aria-label="Amount collected"
                                value={form.amount}
                                onChange={(e) => set("amount", e.target.value)}
                                placeholder="0.00"
                                className={cn(inputClass, "pl-12 tabular-nums")}
                              />
                            </div>
                            {overCollected ? (
                              <span className="mt-1.5 block text-[11px] font-medium text-amber-700">
                                More than the booking total. Record only what you actually collected.
                              </span>
                            ) : (
                              quote && (
                                <button
                                  type="button"
                                  onClick={() => set("amount", String(total))}
                                  className="mt-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                                >
                                  Use the full {formatCurrency(total, quoteCurrency)}
                                </button>
                              )
                            )}
                          </Field>
                          <Field label="Reference" icon={Smartphone} hint="MoMo or bank reference, if there is one.">
                            <input
                              aria-label="Payment reference"
                              value={form.externalRef}
                              onChange={(e) => set("externalRef", e.target.value)}
                              placeholder="e.g. MM-9921"
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Recorded as collected</span>
                            <span className="font-semibold tabular-nums text-slate-800">
                              {formatCurrency(collected, quoteCurrency)}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              initial={false}
                              animate={{ width: `${collectedPct}%` }}
                              transition={{ type: "spring", damping: 26, stiffness: 260 }}
                              className="h-full rounded-full bg-emerald-500"
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Outstanding balance</span>
                            <span className="font-semibold tabular-nums text-slate-800">
                              {formatCurrency(outstanding, quoteCurrency)}
                            </span>
                          </div>
                          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
                            <ShieldCheck size={12} className="mt-0.5 shrink-0" />
                            TravioGhana does not verify offline payments. A reported collection is not a platform payment.
                          </p>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-4">
                        <SectionTitle icon={CheckCircle2} title="Review" sub="Nothing is charged online. This creates a reservation." />

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <div className="flex items-center gap-3 border-b border-slate-100 p-3">
                            <span className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {(selectedTour?.coverPhoto || selectedTour?.photos?.find((p) => p)) && (
                                <OptimizedImage
                                  src={selectedTour.coverPhoto || selectedTour.photos.find((p) => p)}
                                  width={112}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">{selectedTour?.title}</p>
                              <p className="text-[11px] text-slate-500">
                                {form.travelDate ? formatDate(form.travelDate) : "No date"}
                                {form.selectedTime ? ` · ${form.selectedTime}` : ""}
                              </p>
                            </div>
                          </div>
                          <dl className="divide-y divide-slate-100 text-sm">
                            {[
                              ["Party", `${partySize} traveller${partySize === 1 ? "" : "s"}`],
                              ["Customer", form.guestName || "—"],
                              ["Phone", form.guestPhone || "Not given"],
                              form.guestEmail ? ["Email", form.guestEmail] : null,
                              ["Pickup", form.pickupAddress || "Making their own way"],
                              form.specialRequests ? ["Requests", form.specialRequests] : null,
                            ].filter(Boolean).map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between gap-3 px-3 py-2">
                                <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
                                <dd className="truncate text-xs font-medium text-slate-800" title={value}>{value}</dd>
                              </div>
                            ))}
                            <div className="flex items-center justify-between gap-3 px-3 py-2">
                              <dt className="text-xs text-slate-500">Price</dt>
                              <dd className="text-xs font-semibold tabular-nums text-slate-900">
                                {quote ? formatCurrency(total, quoteCurrency) : "—"}
                                <span className="ml-1 font-normal text-slate-400">calculated by TravioGhana</span>
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-3 py-2">
                              <dt className="text-xs text-slate-500">Collection</dt>
                              <dd className="text-right text-xs font-medium text-slate-800">
                                {collected > 0
                                  ? `${METHODS.find((m) => m.value === form.method)?.label} · ${formatCurrency(collected, quoteCurrency)} recorded as collected`
                                  : "Unpaid reservation"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="space-y-1.5 rounded-lg bg-slate-100/70 p-3">
                          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                            <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
                            Submitting is safe to repeat: if the response is uncertain, re-submit — it will not create a second booking.
                          </p>
                          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                            <Wallet size={13} className="mt-0.5 shrink-0 text-slate-400" />
                            Commission is taken from money you collect and netted from your next payout. An unpaid
                            reservation carries no commission.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.section>
            </AnimatePresence>
          </div>

          {/* Summary rail */}
          {!created && (
            <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-200 bg-white p-5 lg:flex">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">This booking</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Package size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {selectedTour?.title || "No experience yet"}
                    </p>
                    <p className="text-[10px] text-slate-400">Experience</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <CalendarDays size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {form.travelDate ? formatDate(form.travelDate) : "No date yet"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {form.selectedTime ? `Departs ${form.selectedTime}` : "Date and time"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Users size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {partySize} traveller{partySize === 1 ? "" : "s"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {[travelers.adults && `${travelers.adults} adult${travelers.adults === 1 ? "" : "s"}`,
                        travelers.children && `${travelers.children} child${travelers.children === 1 ? "" : "ren"}`,
                        travelers.infants && `${travelers.infants} infant${travelers.infants === 1 ? "" : "s"}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="my-4 h-px bg-slate-100" />

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
                <div className="mt-1 h-7">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.p
                      key={quote?.total ?? "none"}
                      initial={{ y: 6, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -6, opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="text-lg font-bold tabular-nums text-slate-900"
                    >
                      {quote ? formatCurrency(total, quoteCurrency) : "—"}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">Calculated by TravioGhana</p>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Collected</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {formatCurrency(collected, quoteCurrency)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    initial={false}
                    animate={{ width: `${collectedPct}%` }}
                    transition={{ type: "spring", damping: 26, stiffness: 260 }}
                    className="h-full rounded-full bg-emerald-500"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Outstanding</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {formatCurrency(outstanding, quoteCurrency)}
                  </span>
                </div>
              </div>

              <p className="mt-auto pt-4 text-[10px] leading-relaxed text-slate-400">
                Offline collections are recorded, not verified. The platform is not the payment processor here.
              </p>
            </aside>
          )}
        </div>

        {/* Footer */}
        {!created && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3.5 sm:px-7">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go(step - 1)}
                disabled={step === 0 || submitting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div className="flex items-center gap-3">
                {quote && (
                  <span className="text-sm font-semibold tabular-nums text-slate-800 lg:hidden">
                    {formatCurrency(total, quoteCurrency)}
                  </span>
                )}
                <span className="hidden text-[11px] text-slate-400 md:block">
                  Step {step + 1} of {STEPS.length} · {STEPS[step].hint}
                </span>
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => go(step + 1)}
                    disabled={(step === 0 && !stepOneValid) || (step === 1 && !stepTwoValid && touched)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#044b3b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#033629] disabled:opacity-40"
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#044b3b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#033629] disabled:opacity-40"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Create booking
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
