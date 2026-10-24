import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  MessageCircle,
  CalendarDays,
  Users,
  Mail,
  Phone,
  MapPinned,
  CreditCard,
  Check,
  Ban,
  Star,
  StickyNote,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/shared/StatusBadge";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { BOOKING_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate, formatTime, cn } from "@/lib/utils";
import { fetchBookingDetail, fetchBookingCollections, updateBookingNotes, rescheduleBooking } from "../api";
import {
  formatPartySummary,
  formatTravelerDetails,
} from "../lib/formatTravelers";
import { pickupDisplay } from "../lib/pickupHelpers";

/**
 * Booking detail panel — the GYG-style slide-over that opens from a booking
 * row. The list rows carry what the list needs; this fetches the booking in
 * full (customer contact, applied offer, the customer's review, cancellation
 * detail) from `GET /supplier/bookings/:id`.
 *
 * Truthfulness rules it must keep:
 *  - a failed fetch shows an error with Retry; it never falls back to a stale
 *    row and calls it "the booking";
 *  - the notes editor is dirty-tracked and only says "Saved" after the server
 *    confirms;
 *  - destructive actions route through the caller's existing handlers so the
 *    cancellation wizard and its approval gate are unchanged.
 */

function Section({ title, icon: Icon, children }) {
  return (
    <section className="py-4 border-b border-slate-100 last:border-b-0">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 mb-2.5">
        {Icon && <Icon size={15} className="text-slate-400" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Fact({ label, children }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

function NotesEditor({ booking, onSaved }) {
  const [value, setValue] = useState(booking.supplierNotes || "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  // The draft is compared against the last SERVER-ACKNOWLEDGED value, not the
  // prop: after a save the caller refetches the booking, and comparing against
  // the freshly-loaded prop would have flipped the label back to "Unsaved
  // changes" the moment the save succeeded.
  const [baseline, setBaseline] = useState(booking.supplierNotes || "");
  const [lastSeenNotes, setLastSeenNotes] = useState(booking.supplierNotes || "");
  if (lastSeenNotes !== (booking.supplierNotes || "")) {
    setLastSeenNotes(booking.supplierNotes || "");
    setBaseline(booking.supplierNotes || "");
  }
  const dirty = value !== baseline;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await updateBookingNotes(booking.id, value);
      setBaseline(value);
      setSavedAt(new Date());
      toast.success("Note saved");
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save the note");
    } finally {
      setSaving(false);
    }
  }, [booking.id, value, onSaved]);

  return (
    <div>
      <label htmlFor="booking-supplier-notes" className="sr-only">
        Supplier notes
      </label>
      <textarea
        id="booking-supplier-notes"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Private notes for your team — the customer never sees these."
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
      />
      <div className="flex items-center justify-between gap-2 mt-2">
        <p className="text-xs text-slate-500">
          {dirty
            ? "Unsaved changes"
            : savedAt
              ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Only your team can see this."}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            dirty && !saving
              ? "bg-[#044b3b] text-white hover:bg-[#033629]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save note
        </button>
      </div>
    </div>
  );
}

// The earliest date a supplier may move a booking to (tomorrow). Computed at
// module load: render must stay pure (react-hooks/purity).
const MIN_RESCHEDULE_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

/**
 * Move one booking to another date/time.
 *
 * The server owns the rules (same price or no move; capacity without this
 * booking's own travellers; payout still pending) and its refusal is shown as
 * written — the supplier must never be nudged into a move that changes what
 * the customer paid. Two steps, so a date typed into a box cannot fire.
 */
function RescheduleForm({ booking, onMoved }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState(booking.selectedTime || "");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(date) && !submitting;

  const submit = async () => {
    setSubmitting(true);
    try {
      const response = await rescheduleBooking(booking.id, {
        travelDate: date,
        selectedTime: time,
        reason,
      });
      const movedTo = response.data?.data?.booking?.travelDate;
      toast.success(
        movedTo
          ? `Booking moved to ${formatDate(movedTo)}`
          : "Booking moved",
      );
      setConfirming(false);
      setDate("");
      setReason("");
      onMoved?.();
    } catch (err) {
      // The server's refusal is the truth here (price would change, date full,
      // payout began) — show it exactly as given.
      toast.error(err.response?.data?.message || "Failed to move this booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="reschedule-date" className="text-xs text-slate-500 block mb-1">
            New activity date
          </label>
          <input
            id="reschedule-date"
            type="date"
            min={MIN_RESCHEDULE_DATE}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>
        <div>
          <label htmlFor="reschedule-time" className="text-xs text-slate-500 block mb-1">
            Start time (optional)
          </label>
          <input
            id="reschedule-time"
            type="time"
            value={time || ""}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="reschedule-reason" className="text-xs text-slate-500 block mb-1">
          Reason (kept in your team notes)
        </label>
        <input
          id="reschedule-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. vehicle breakdown"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        The price never changes on a move. If the new date is priced differently,
        the move is refused and you'll see both figures.
      </p>

      {confirming ? (
        <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Move booking {booking.bookingNumber} from{" "}
            <strong>{formatDate(booking.travelDate)}</strong>
            {booking.selectedTime ? ` · ${formatTime(booking.selectedTime)}` : ""} to{" "}
            <strong>{formatDate(date)}</strong>
            {time ? ` · ${formatTime(time)}` : ""}?
          </p>
          <p className="text-xs text-amber-800 mt-1">
            The customer is notified straight away.
          </p>
          <div className="flex gap-2 mt-2.5">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-[#044b3b] text-white hover:bg-[#033629] disabled:bg-slate-200 disabled:text-slate-400"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Yes, move it
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white border border-transparent"
            >
              Keep current date
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!canSubmit}
          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          <CalendarDays size={14} /> Move this booking
        </button>
      )}
    </div>
  );
}

function StatusActions({ booking, onStatusUpdate, isUpdating, onChanged }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const travelDatePassed = new Date(booking.travelDate) < today;
  const payLaterUnpaid =
    booking.paymentTiming === "later" &&
    booking.status === "PENDING" &&
    booking.paymentStatus !== "SUCCEEDED";

  const actions = [];
  if (booking.status === "PENDING") {
    actions.push({
      value: "CONFIRMED",
      label: "Accept booking",
      variant: "primary",
      disabled: payLaterUnpaid || travelDatePassed,
      disabledReason: payLaterUnpaid
        ? "This booking reserves now and pays later — accept it once the charge lands."
        : travelDatePassed
          ? "The activity date has passed; confirm nothing. Cancel it instead."
          : null,
    });
    actions.push({ value: "CANCELLED", label: "Cancel booking", variant: "danger" });
  } else if (booking.status === "CONFIRMED") {
    actions.push({
      value: "COMPLETED",
      label: "Mark completed",
      variant: "primary",
      disabled: !travelDatePassed,
      disabledReason: "A future booking cannot be marked completed.",
    });
    actions.push({
      value: "NO_SHOW",
      label: "Mark no-show",
      variant: "secondary",
      disabled: !travelDatePassed,
      disabledReason: "No-show can only be recorded after the activity date.",
    });
    actions.push({ value: "CANCELLED", label: "Cancel booking", variant: "danger" });
  }

  if (actions.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No further actions for a {String(booking.status).toLowerCase()} booking.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <div key={action.value} className="contents">
            <button
              type="button"
              disabled={isUpdating || action.disabled}
              title={action.disabled ? action.disabledReason : undefined}
              onClick={() => {
                onStatusUpdate(booking.id, action.value);
                onChanged?.();
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors",
                action.variant === "primary" &&
                  "bg-[#044b3b] text-white hover:bg-[#033629] disabled:bg-slate-200 disabled:text-slate-400",
                action.variant === "secondary" &&
                  "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:text-slate-400",
                action.variant === "danger" &&
                  "bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:text-slate-400"
              )}
            >
              {action.value === "COMPLETED" && <CheckCircle2 size={14} />}
              {action.value === "NO_SHOW" && <Ban size={14} />}
              {action.label}
            </button>
          </div>
        ))}
      </div>
      {actions
        .filter((action) => action.disabled && action.disabledReason)
        .map((action) => (
          <p key={action.value} className="text-xs text-slate-500">
            {action.disabledReason}
          </p>
        ))}
    </div>
  );
}

export default function BookingDetailDrawer({
  bookingId,
  onClose,
  onMessageCustomer,
  onStatusUpdate,
  isUpdating,
}) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  // Only the newest fetch may land: the panel can be pointed at another
  // booking (URL navigation) while a load is still out.
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchBookingDetail(bookingId);
      if (loadSeqRef.current !== requestId) return;
      setBooking(detail);
    } catch (err) {
      if (loadSeqRef.current !== requestId) return;
      setError(err.response?.data?.message || err.message || "Failed to load this booking");
    } finally {
      if (loadSeqRef.current === requestId) setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    // Deferred so the load's first state write is not synchronous in the
    // effect body (react-hooks/set-state-in-effect).
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Dialog semantics: Escape closes, focus starts on the close button and is
  // returned to the trigger by the caller, and the panel traps nothing behind
  // it visually (the overlay is inert to clicks on the page).
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pickup = booking?.pickup || null;
  // A storefront pickup snapshot stores `address` as an object. Never render
  // raw snapshot fields: the shared helper resolves them to strings in the same
  // priority the Pickup Planner uses.
  const pickupInfo = pickupDisplay(pickup);

  // The commission ledger exists only for money the supplier collected
  // offline. It is fetched with the collection history — "recorded as
  // collected" is the money, commission is what the platform is owed on top of
  // it, and the two must never be conflated on screen.
  const [ledger, setLedger] = useState(null);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (!booking || booking.origin !== "SUPPLIER_CREATED") {
        if (!cancelled) setLedger(null);
        return;
      }
      try {
        const data = await fetchBookingCollections(booking.id);
        if (!cancelled) setLedger(data);
      } catch {
        // A failed read shows "unavailable" rather than a made-up zero.
        if (!cancelled) setLedger({ error: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [booking]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Booking ${booking?.bookingNumber || bookingId}`}
        className="relative w-full sm:max-w-xl h-full bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Booking</p>
            <h2 className="text-lg font-bold text-slate-900 font-mono truncate">
              {booking?.bookingNumber || bookingId}
            </h2>
            {booking && (
              <div className="mt-1">
                <StatusBadge
                  status={booking.status}
                  label={BOOKING_STATUSES[booking.status]?.label || booking.status}
                  size="sm"
                />
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close booking details"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {loading && (
            <div className="py-16 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#044b3b]" />
            </div>
          )}

          {!loading && error && (
            <div className="py-14 text-center">
              <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
              <p className="text-sm font-semibold text-slate-800 mb-1">
                We couldn't load this booking
              </p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#044b3b] text-white hover:bg-[#033629]"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && booking && (
            <>
              <Section title="Activity" icon={CalendarDays}>
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {booking.tourPhoto ? (
                      <OptimizedImage
                        src={booking.tourPhoto}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{booking.tourName}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(booking.travelDate)}
                      {booking.selectedTime && ` · ${formatTime(booking.selectedTime)}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatPartySummary(booking.travelersRaw) ||
                        `${booking.travelers} traveler${booking.travelers !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTravelerDetails(booking.travelersRaw)}
                    </p>
                  </div>
                </div>
              </Section>

              <Section title="Customer" icon={Users}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Fact label="Lead traveller">{booking.leadTravelerName || booking.customerName}</Fact>
                  <Fact label="Booked by">{booking.customerName}</Fact>
                  <Fact label="Contact">
                    <a
                      href={`mailto:${booking.customerEmail}`}
                      className="inline-flex items-center gap-1 text-[#044b3b] hover:underline break-all"
                    >
                      <Mail size={13} /> {booking.customerEmail}
                    </a>
                  </Fact>
                  <Fact label="Phone">
                    {booking.customerPhone ? (
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="inline-flex items-center gap-1 text-[#044b3b] hover:underline"
                      >
                        <Phone size={13} /> {booking.customerPhone}
                      </a>
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </Fact>
                </div>
                <button
                  type="button"
                  onClick={() => onMessageCustomer?.(booking)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <MessageCircle size={14} /> Message customer
                </button>
              </Section>

              <Section title="Payment" icon={CreditCard}>
                <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                  {booking.subtotal > 0 && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-slate-600">Subtotal</span>
                      <span>{formatCurrency(booking.subtotal, booking.currency)}</span>
                    </div>
                  )}
                  {booking.discount > 0 && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-slate-600">
                        Discount{booking.offerName ? ` · ${booking.offerName}` : ""}
                      </span>
                      <span className="text-red-600">
                        −{formatCurrency(booking.discount, booking.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 bg-slate-50">
                    <span className="font-semibold text-slate-800">Total charged</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(booking.total, booking.currency)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {booking.paymentStatus === "SUCCEEDED"
                    ? "Paid in full."
                    : booking.paymentStatus === "PROCESSING"
                      ? "The payment is still processing — no money is confirmed yet."
                      : booking.paymentTiming === "later"
                        ? "Reserved now, pays later — no charge has been taken yet."
                        : booking.paymentStatus === "FAILED"
                          ? "The payment attempt failed; no money was taken."
                          : booking.paymentStatus === "REFUNDED"
                            ? "The charge was returned to the customer."
                            : booking.paymentStatus === "PENDING"
                              ? "No charge has been taken yet."
                              : "Payment status unknown."}
                </p>
              </Section>

              {booking.origin === "SUPPLIER_CREATED" && (
                <Section title="Commission on money collected" icon={CreditCard}>
                  {!ledger || ledger.error ? (
                    <p className="text-sm text-slate-500">
                      {ledger?.error ? "Commission could not be loaded right now." : "Loading…"}
                    </p>
                  ) : (
                    <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                      <div className="flex justify-between px-3 py-2">
                        <span className="text-slate-600">Recorded as collected</span>
                        <span className="tabular-nums">
                          {formatCurrency(ledger.collected || 0, ledger.currency || booking.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-3 py-2">
                        <span className="text-slate-600">
                          Commission ({(Number(ledger.commission?.rate || 0) * 100).toFixed(2)}%)
                        </span>
                        <span className="tabular-nums">
                          {formatCurrency(ledger.commission?.accrued || 0, ledger.currency || booking.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-3 py-2">
                        <span className="text-slate-600">Already settled</span>
                        <span className="tabular-nums">
                          {formatCurrency(ledger.commission?.settled || 0, ledger.currency || booking.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-3 py-2 bg-slate-50">
                        <span className="font-semibold text-slate-800">Still to settle</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {formatCurrency(ledger.commission?.open || 0, ledger.currency || booking.currency)}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    The platform never collected this money — you did. Commission is charged only on
                    what you record as collected, and settles from your next payout or invoice.
                  </p>
                </Section>
              )}

              {pickup && (
                <Section title="Pickup" icon={MapPinned}>
                  <p className="text-sm text-slate-800">
                    {pickupInfo.primary || "Pickup not selected yet."}
                  </p>
                  {pickupInfo.secondary && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {pickupInfo.secondary}
                    </p>
                  )}
                  {pickupInfo.zone && pickupInfo.zone !== pickupInfo.primary && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Zone: {pickupInfo.zone}
                    </p>
                  )}
                </Section>
              )}

              {booking.status === "CANCELLED" && (
                <Section title="Cancellation" icon={Ban}>
                  <div className="space-y-1.5 text-sm">
                    <Fact label="Reason">
                      {booking.cancellationReason || <span className="text-slate-400">Not recorded</span>}
                    </Fact>
                    {booking.cancellationNote && (
                      <Fact label="Customer note">{booking.cancellationNote}</Fact>
                    )}
                    <Fact label="Cancelled">
                      {booking.cancelledAt ? formatDate(booking.cancelledAt) : "—"}
                    </Fact>
                    <Fact label="Refund">
                      {booking.refundStatus || <span className="text-slate-400">Not applicable</span>}
                    </Fact>
                  </div>
                </Section>
              )}

              {booking.review && (
                <Section title="Customer review" icon={Star}>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        className={
                          star <= (booking.review.rating || 0)
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200"
                        }
                      />
                    ))}
                    <span className="ml-1 text-xs text-slate-500">
                      {booking.review.rating}/5
                    </span>
                  </div>
                  {booking.review.comment && (
                    <p className="mt-2 text-sm text-slate-700">{booking.review.comment}</p>
                  )}
                </Section>
              )}

              {["PENDING", "CONFIRMED"].includes(booking.status) && (
                <Section title="Change date" icon={CalendarDays}>
                  <RescheduleForm booking={booking} onMoved={() => load()} />
                </Section>
              )}

              <Section title="Notes for your team" icon={StickyNote}>
                <NotesEditor
                  booking={booking}
                  onSaved={() => load()}
                />
              </Section>
            </>
          )}
        </div>

        {/* Sticky action bar */}
        {!loading && !error && booking && (
          <div className="border-t border-slate-200 px-5 py-4 bg-white">
            <StatusActions
              booking={booking}
              onStatusUpdate={(id, status) => {
                onStatusUpdate?.(id, status);
                // The caller owns the mutation; re-read after it settles so the
                // panel never claims a status the server did not apply.
                setTimeout(() => load(), 400);
              }}
              isUpdating={isUpdating}
            />
          </div>
        )}
      </div>
    </div>
  );
}
