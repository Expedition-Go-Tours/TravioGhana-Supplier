import { useContext, useState, useCallback } from "react";
import {
  ChevronDown,
  Users,
  MapPinned,
  MessageCircle,
  AlertTriangle,
  Loader2,
  Check,
  Clock,
  Zap,
  CalendarDays,
  CreditCard,
  Ban,
  Tag,
  Info,
  RefreshCw,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "@/components/shared/StatusBadge";
import { BOOKING_STATUSES } from "@/lib/constants";
import { TeamRoleContext } from "@/contexts/teamRoleContext";
import { formatCurrency, formatDate, formatTravelDate, formatTime, cn } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";
import {
  formatPartySummary,
  getTravelerDetails,
} from "../lib/formatTravelers";
import { pickupDisplay } from "../lib/pickupHelpers";
import {
  PendingCancellationBadge,
  WithdrawCancellationButton,
} from "./PendingCancellationBadge";
import BookingAttentionPanel, { AttentionBadge } from "./BookingAttention";

const STATUS_ACTIONS = {
  PENDING: [
    { value: "CONFIRMED", label: "Accept booking", variant: "primary" },
    { value: "CANCELLED", label: "Cancel", variant: "danger" },
  ],
  CONFIRMED: [
    // Both of these are post-activity states — the backend refuses to complete
    // a future booking and no-show is only meaningful after the date — so the
    // card filters them out until the activity date has passed.
    { value: "COMPLETED", label: "Mark completed", variant: "primary" },
    { value: "NO_SHOW", label: "Mark no-show", variant: "secondary" },
    { value: "CANCELLED", label: "Cancel", variant: "danger" },
  ],
  COMPLETED: [
    // Refunds on a delivered trip are a REQUEST (admin approves and the
    // supplier's balance pays). The label says "request" on purpose.
    { value: "REFUND_REQUEST", label: "Request refund", variant: "secondary" },
  ],
  NO_SHOW: [
    { value: "REFUND_REQUEST", label: "Request refund", variant: "secondary" },
  ],
  CANCELLED: [],
  REFUNDED: [],
};

const PAYMENT_META = {
  SUCCEEDED: {
    label: "Paid",
    hint: "Payment completed",
    icon: Check,
    styles: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  RESERVE_LATER: {
    // Payment status is authoritative: a reservation is not paid until Stripe
    // settles it. Never phrase this as if the money had already been taken.
    label: "Payment unconfirmed",
    hint: "Reserved; no successful charge yet",
    icon: Clock,
    styles: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  FAILED: {
    label: "Payment failed",
    hint: "No charge was made",
    icon: Ban,
    styles: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  REFUNDED: {
    label: "Refunded",
    hint: "Charge was returned",
    icon: CreditCard,
    styles: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
};

// Which storefront the customer booked through. Three entities: Travio Ghana,
// Expedition Go, Travio Africa. Visible so a supplier can tell at a glance
// which platform a booking came in via.
const SOURCE_META = {
  GHANA: { label: "Travio Ghana", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  EXPEDITION: { label: "Expedition Go", className: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  TRAVIO_AFRICA: { label: "Travio Africa", className: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
};

function SourceBadge({ source }) {
  const meta = SOURCE_META[String(source || "").toUpperCase()] || {
    label: source || "—",
    className: "bg-gray-50 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        meta.className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function PaymentStatus({ paymentStatus, paymentTiming }) {
  const key =
    paymentStatus === "SUCCEEDED"
      ? "SUCCEEDED"
      : paymentStatus === "FAILED"
        ? "FAILED"
        : paymentStatus === "REFUNDED"
          ? "REFUNDED"
          : paymentTiming === "later"
            ? "RESERVE_LATER"
            : paymentStatus;
  const meta = PAYMENT_META[key] || {
    label: key || "Unknown",
    hint: "",
    icon: CreditCard,
    styles: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  };
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg border",
        meta.styles
      )}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon size={15} /> {meta.label}
      </span>
      {meta.hint && (
        <span className="hidden sm:inline text-xs opacity-80">
          {meta.hint}
        </span>
      )}
    </div>
  );
}

/**
 * One block of the expanded panel. Hairlines — not cards — separate the
 * sections, and every block shares the same micro-label so the eye can run
 * down one column instead of re-reading seven different headings.
 */
function PanelSection({ label, children }) {
  return (
    <section className="py-3.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** A label/value cell, identical in shape to the drawer's Fact. */
function PanelFact({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

export default function BookingCard({
  booking,
  onStatusUpdate,
  isUpdating,
  isHighlighted,
  onMessageCustomer,
  onWithdrawRequest,
  onOpenDetail,
  onPaymentLinkAction,
  onRefresh,
  mutationError,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  // The server is the authority, but a view-only teammate should not be shown
  // money-moving buttons that can only end in a 403.
  const teamRole = useContext(TeamRoleContext);
  const canManage = !teamRole || teamRole.hasPermission?.("bookings.manage") !== false;
  const canRequestRefund = !teamRole || teamRole.hasPermission?.("bookings.refund.request") !== false;
  const canSeeRevenue = !teamRole
    || teamRole.hasPermission?.("bookings.revenue.view") !== false
    || teamRole.hasPermission?.("earnings.view") !== false;
  // The API sends a dash when there is no separate booker; "Booked by —" is
  // noise, and repeating the lead traveler's own name says nothing.
  const leadName = (booking.leadTravelerName || "").trim();
  const bookerName = (booking.customerName || "").trim();
  const showBooker = Boolean(
    bookerName
    && bookerName !== "—"
    && bookerName !== "-"
    && bookerName.toLowerCase() !== leadName.toLowerCase()
  );
  const isPayLater = booking.paymentTiming === 'later';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const travelDatePassed = new Date(booking.travelDate) < today;
  // Reserve-now-pay-later bookings start PENDING with no money captured; payment
  // is the gate, so don't offer a manual "Accept booking" until the charge lands.
  // A PAID PENDING booking (pay-later charged, or a manual-confirmation tour)
  // is awaiting the supplier's acceptance, so the Accept action must be shown.
  const payLaterUnpaid = isPayLater && booking.status === 'PENDING' && booking.paymentStatus !== 'SUCCEEDED';
  const actions = (canManage ? (STATUS_ACTIONS[booking.status] || []) : []).filter(
    (a) => !(payLaterUnpaid && a.value === 'CONFIRMED')
  ).filter(
    (a) => !(travelDatePassed && a.value === 'CONFIRMED')
  ).filter(
    // Post-activity states: only after the activity date has passed.
    (a) => !((a.value === 'COMPLETED' || a.value === 'NO_SHOW') && !travelDatePassed)
  ).filter((a) => a.value !== 'REFUND_REQUEST' || canRequestRefund);
  const pickup = booking.pickup || {};
  // The card and the detail panel must read the same snapshot the same way:
  // exact street address first, then the short label, legacy place and zone.
  const pickupInfo = pickupDisplay(pickup);
  const pickupDeferred =
    booking.pickupDeferred ||
    pickup.pickupLater ||
    pickup.skipValidation ||
    pickup.status === "deferred";
  const partySummary = formatPartySummary(booking.travelersRaw);
  const travelerDetails = getTravelerDetails(booking.travelersRaw);
  // The lead traveler is already named above; repeating them as the only
  // participant chip reads as though the rest of the party is missing.
  const otherTravelers = travelerDetails.filter(
    (d) => (d.name || "").trim().toLowerCase() !== leadName.toLowerCase()
  );
  const guestCount = booking.travelers;
  // One compact payment cue for the collapsed row. The expanded panel explains
  // the state in full; this only flags the two states a supplier must not miss.
  const paymentChip =
    booking.paymentStatus === "FAILED"
      ? { label: "Payment failed", className: "border-red-200 bg-red-50 text-red-700" }
      : payLaterUnpaid
        ? { label: "Payment unconfirmed", className: "border-amber-200 bg-amber-50 text-amber-700" }
        : null;

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleExpand();
      }
    },
    [toggleExpand]
  );

  return (
    <div
      id={`booking-${booking.id}`}
      className={cn(
        "bg-white rounded-xl border transition-all duration-200 overflow-hidden",
        isHighlighted
          ? "border-emerald-400 ring-2 ring-emerald-200/60 shadow-lg shadow-emerald-200/30"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      )}
    >
      {/* ===== COLLAPSED HEADER — mobile (stacked) ===== */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpand}
        onKeyDown={handleKeyDown}
        className="block cursor-pointer select-none px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/30 sm:hidden"
        aria-expanded={isExpanded}
      >
        {/* Row 1: thumbnail + title/party + status */}
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
            {booking.tourPhoto ? (
              <OptimizedImage
                src={booking.tourPhoto}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <Package size={20} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex-1 min-w-0 text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">
                {booking.tourName}
              </h3>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <StatusBadge
                  status={booking.status}
                  label={BOOKING_STATUSES[booking.status]?.label || booking.status}
                  size="sm"
                />
                <AttentionBadge attention={booking.attention} />
              </div>
            </div>
            {partySummary && (
              <p className="mt-0.5 text-[13px] text-slate-500 truncate">
                {partySummary}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: key facts — date·time · travelers · ref */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5 text-xs text-slate-500">
          <span className="flex items-center gap-1 min-w-0">
            <CalendarDays size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">
              {formatTravelDate(booking.travelDate)}
              {booking.selectedTime && ` · ${formatTime(booking.selectedTime)}`}
            </span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Users size={12} className="shrink-0 text-slate-400" />
            {guestCount} traveler{guestCount !== 1 ? "s" : ""}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
            {booking.bookingNumber}
          </span>
        </div>

        {/* Row 3: price + chips + chevron */}
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
          {canSeeRevenue && (
            <p className="text-base font-bold text-slate-900 whitespace-nowrap shrink-0">
              {formatCurrency(booking.total, booking.currency)}
            </p>
          )}
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-1.5">
            {booking.attention ? null : booking.paymentStatus === 'FAILED' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200/60 text-[10px] font-semibold text-red-700 whitespace-nowrap">
                <Ban size={10} className="shrink-0" /> Payment failed
              </span>
            ) : payLaterUnpaid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/60 text-[10px] font-semibold text-amber-700 whitespace-nowrap">
                <Clock size={10} className="shrink-0" /> Payment unconfirmed
              </span>
            ) : null}
            {canSeeRevenue && booking.discount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200/60 text-[10px] font-semibold text-red-700 whitespace-nowrap">
                <Tag size={10} className="shrink-0" />
                <span className="truncate max-w-[100px]">
                  {booking.offerName || 'Discount'}
                </span>
              </span>
            )}
            <SourceBadge source={booking.source} />
          </div>
          <ChevronDown
            size={20}
            className={cn(
              "text-slate-400 transition-transform duration-200 shrink-0",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* ===== COLLAPSED HEADER — desktop (horizontal) ===== */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpand}
        onKeyDown={handleKeyDown}
        className="hidden cursor-pointer select-none items-center gap-4 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/30 sm:flex sm:px-5"
        aria-expanded={isExpanded}
      >
        {/* Tour cover photo */}
        <div className="w-[64px] h-[64px] sm:w-[76px] sm:h-[76px] rounded-xl overflow-hidden shrink-0 bg-slate-100">
          {booking.tourPhoto ? (
            <OptimizedImage
              src={booking.tourPhoto}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <Package size={24} />
            </div>
          )}
        </div>

        {/* Text column: tour name → options → dates → ref + participants */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">
            {booking.tourName}
          </h3>

          {/* Options names (party breakdown) */}
          <p className="text-[13px] text-slate-500 leading-snug">
            {partySummary || `${guestCount} traveler${guestCount !== 1 ? "s" : ""}`}
          </p>

          {/* Tour date + booking date */}
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400">
            <CalendarDays size={12} className="shrink-0" />
            <span className="whitespace-nowrap">
              {formatTravelDate(booking.travelDate)}
              {booking.selectedTime && ` · ${formatTime(booking.selectedTime)}`}
            </span>
            <span className="text-slate-300">·</span>
            <span className="whitespace-nowrap">
              Booked {formatDate(booking.bookingDate)}
            </span>
          </p>

          {/* Booking reference + participants */}
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400">
            <span className="font-mono text-[11px] text-slate-500">
              {booking.bookingNumber}
            </span>
            <SourceBadge source={booking.source} />
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Users size={12} className="shrink-0" />
              {guestCount} traveler{guestCount !== 1 ? "s" : ""}
            </span>
            <span className="text-slate-300">·</span>
            <span className={`flex items-center gap-1 whitespace-nowrap ${booking.instantConfirmation ? "text-emerald-600" : "text-amber-600"}`}>
              {booking.instantConfirmation ? <Zap size={12} className="shrink-0" /> : <Clock size={12} className="shrink-0" />}
              {booking.instantConfirmation ? "Instant confirmation" : "Manual confirmation"}
            </span>
          </p>
        </div>

        {/* Right column: status + price + chevron */}
        <div className="ml-1 flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <AttentionBadge attention={booking.attention} />
            <StatusBadge
              status={booking.status}
              label={BOOKING_STATUSES[booking.status]?.label || booking.status}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2">
            {paymentChip && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  paymentChip.className
                )}
              >
                {paymentChip.label}
              </span>
            )}
            {canSeeRevenue && (
              <p className="text-base font-bold tabular-nums text-slate-900">
                {formatCurrency(booking.total, booking.currency)}
              </p>
            )}
          </div>
          {canSeeRevenue && booking.discount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200/60 text-[11px] font-semibold text-red-700 whitespace-nowrap">
              <Tag size={10} />
              {booking.offerName || 'Discount'}
              {booking.offerPromoCode && (
                <span className="ml-0.5 px-1 py-px rounded bg-red-100 text-red-800 font-mono text-[10px]">
                  {booking.offerPromoCode}
                </span>
              )}
            </span>
          )}
        </div>

        <ChevronDown
          size={20}
          className={cn(
            "text-slate-400 transition-transform duration-200 shrink-0 ml-1",
            isExpanded && "rotate-180"
          )}
        />
      </div>

      {/* ===== PENDING APPROVAL BANNER ===== */}
      {booking.pendingCancellation && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-amber-50 border-t border-amber-200/60">
          <PendingCancellationBadge
            pendingCancellation={booking.pendingCancellation}
          />
          <WithdrawCancellationButton
            requestId={booking.pendingCancellation.id}
            onWithdraw={onWithdrawRequest}
          />
        </div>
      )}

      {/* ===== EXPANDED DETAILS ===== */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5">
              {/* Server-authoritative attention is shown before any payment
                  summary so an unpaid booking cannot look successful. */}
              <BookingAttentionPanel
                attention={booking.attention}
                onAction={onPaymentLinkAction ? (payload) => onPaymentLinkAction(booking, payload) : undefined}
                onRefresh={onRefresh}
                variant="card"
              />

              {mutationError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5" role="alert">
                  <p className="text-sm font-medium text-red-800">{mutationError.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {mutationError.retry && onStatusUpdate && mutationError.status && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onStatusUpdate(booking.id, mutationError.status);
                          onRefresh?.();
                        }}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Try again
                      </button>
                    )}
                    {onRefresh && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRefresh();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                      >
                        <RefreshCw size={12} /> Refresh booking
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Warning: past-date PENDING ── */}
              {booking.status === 'PENDING' && travelDatePassed && (
                <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-red-200/60 bg-red-50 px-3 py-2.5">
                  <AlertTriangle size={15} className="shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">
                    Activity date has passed. This booking will be auto-cancelled if not confirmed soon.
                  </p>
                </div>
              )}

              {/* Money, the reservation, the people and the logistics used to
                  be seven equally-weighted bands split by hairlines — a supplier
                  scanning for one fact had to read all of them. They are cards
                  now, two up on wide screens, with every figure about money kept
                  inside the single Payment card. */}
              {/* A spec sheet, not a board of cards. Cards inside this card
                  gave every block its own border and left four icon tiles and
                  a lot of dead space fighting the row above; two free columns
                  left holes wherever one side was shorter. Full-width rows
                  sharing one label column stay aligned whatever the content. */}
              <div className="mt-1 divide-y divide-slate-100">
                {/* ── Payment ── */}
                <PanelSection label="Payment">
                  <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
                    <PanelFact label="Status">
                      <PaymentStatus paymentStatus={booking.paymentStatus} paymentTiming={booking.paymentTiming} />
                    </PanelFact>
                    {canSeeRevenue && (
                      <PanelFact label="Total charged">
                        <span className="text-base font-bold tabular-nums text-slate-900">
                          {formatCurrency(booking.total, booking.currency)}
                        </span>
                      </PanelFact>
                    )}
                    {canSeeRevenue && booking.discount > 0 && (
                      <>
                        {booking.subtotal > 0 && (
                          <PanelFact label="Subtotal">
                            <span className="tabular-nums">{formatCurrency(booking.subtotal, booking.currency)}</span>
                          </PanelFact>
                        )}
                        <PanelFact label="Discount">
                          <span className="tabular-nums text-red-600">
                            −{formatCurrency(booking.discount, booking.currency)}
                          </span>
                        </PanelFact>
                        {booking.offerName && (
                          <PanelFact label="Applied offer">
                            <span className="text-xs text-slate-600">
                              {booking.offerName}
                              {booking.offerDiscountType === 'PERCENTAGE' && booking.offerDiscountPct && (
                                <span className="ml-1 font-medium text-red-600">({booking.offerDiscountPct}% off)</span>
                              )}
                              {booking.offerDiscountType === 'FIXED' && booking.offerDiscountFix && (
                                <span className="ml-1 font-medium text-red-600">({formatCurrency(booking.offerDiscountFix, booking.currency)} off)</span>
                              )}
                            </span>
                          </PanelFact>
                        )}
                        <PanelFact label="Total paid">
                          <span className="tabular-nums">{formatCurrency(booking.total, booking.currency)}</span>
                        </PanelFact>
                      </>
                    )}
                  </div>
                </PanelSection>

                {/* ── The reservation ── */}
                <PanelSection label="Booking details">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    <PanelFact label="Reference">
                      <span className="break-all font-mono">{booking.bookingNumber}</span>
                      <div className="mt-1">
                        <SourceBadge source={booking.source} />
                      </div>
                    </PanelFact>
                    <PanelFact label="Purchased">{formatDate(booking.bookingDate)}</PanelFact>
                    <PanelFact label="Activity date">{formatTravelDate(booking.travelDate)}</PanelFact>
                    <PanelFact label="Travelers">
                      {partySummary || `${guestCount} traveler${guestCount !== 1 ? "s" : ""}`}
                    </PanelFact>
                  </div>

                  {booking.status === 'CANCELLED' && (
                    <div className="mt-3 rounded-lg bg-red-50 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-700">
                        <Ban size={12} /> Cancellation
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
                        {(booking.cancellationReasonLabel || booking.cancellationReason) && (
                          <div className={booking.cancellationNote ? "sm:col-span-1" : "sm:col-span-2"}>
                            <p className="text-[11px] text-slate-500">Reason</p>
                            <p className="text-sm text-slate-800">
                              {booking.cancellationReasonLabel || booking.cancellationReason}
                            </p>
                          </div>
                        )}
                        {booking.cancellationNote && (
                          <div className="sm:col-span-2">
                            <p className="text-[11px] text-slate-500">Customer note</p>
                            <p className="text-sm italic text-slate-800">{booking.cancellationNote}</p>
                          </div>
                        )}
                        {booking.cancelledAt && (
                          <div>
                            <p className="text-[11px] text-slate-500">Cancelled on</p>
                            <p className="text-sm text-slate-800">{formatDate(booking.cancelledAt)}</p>
                          </div>
                        )}
                        {booking.refundStatus && booking.refundStatus !== 'NOT_APPLICABLE' && (
                          <div>
                            <p className="text-[11px] text-slate-500">Refund</p>
                            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              booking.refundStatus === 'SUCCEEDED' ? 'bg-emerald-100 text-emerald-700' :
                              booking.refundStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                              booking.refundStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {booking.refundStatus === 'SUCCEEDED' ? 'Processed' :
                               booking.refundStatus === 'PENDING' ? 'Pending' :
                               booking.refundStatus === 'FAILED' ? 'Failed' : booking.refundStatus}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </PanelSection>

                {/* ── The people ── */}
                <PanelSection label="Lead traveler">
                  <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {booking.customerPhoto ? (
                        <OptimizedImage
                          src={booking.customerPhoto}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                          {(booking.leadTravelerName || "?").charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {booking.leadTravelerName}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {booking.contactEmail && (
                            <span className="truncate text-xs text-slate-500">{booking.contactEmail}</span>
                          )}
                          {booking.contactPhone && (
                            <span className="text-xs text-slate-500">{booking.contactPhone}</span>
                          )}
                        </div>
                        {showBooker && (
                          <p className="mt-0.5 text-xs text-slate-400">Booked by {bookerName}</p>
                        )}
                      </div>
                    </div>

                    {(otherTravelers.length > 0 || guestCount > 1) && (
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400">
                          Participants{guestCount > 1 ? ` · ${guestCount} travelers` : ""}
                        </p>
                        {otherTravelers.length > 0 ? (
                          /* A one-column table of names was a table for no reason;
                             chips read as a party and wrap on a phone. */
                          <ul className="mt-1.5 flex flex-wrap gap-1.5">
                            {otherTravelers.map((d, i) => (
                              <li
                                key={i}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {d.name || `Traveler ${i + 1}`}
                              </li>
                            ))}
                          </ul>
                        ) : guestCount > 1 ? (
                          <p className="mt-1 text-xs text-slate-400">No other travelers named</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </PanelSection>

                {/* ── Logistics ── */}
                <PanelSection label="Pickup">
                  {pickupDeferred ? (
                    /* No amber fill: a full-width tinted block for one line of
                       status read as an alert where there is nothing to fix
                       urgently. An icon and a sentence, held to a reading
                       width, say the same thing quietly. */
                    <div className="flex items-start gap-2">
                      <Clock size={14} className="mt-0.5 shrink-0 text-amber-500" />
                      <div className="max-w-md">
                        <p className="text-sm font-medium text-slate-800">Awaiting pickup details</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          The customer chose to arrange pickup later. Set the time and location in the Pickup Planner.
                        </p>
                      </div>
                    </div>
                  ) : pickupInfo.hasLocation ? (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-sm text-slate-700">
                        <MapPinned size={14} className="shrink-0 text-slate-400" />
                        {pickupInfo.primary}
                      </p>
                      {pickupInfo.secondary && (
                        <p className="flex items-start gap-1.5 pl-[22px] text-sm text-slate-500">
                          {pickupInfo.secondary}
                        </p>
                      )}
                      {pickupInfo.zone && pickupInfo.zone !== pickupInfo.primary && (
                        <p className="flex items-start gap-1.5 pl-[22px] text-sm text-slate-500">
                          Zone: {pickupInfo.zone}
                        </p>
                      )}
                      {pickup.time && (
                        <p className="flex items-center gap-1.5 pl-[22px] text-sm text-slate-500">
                          Pickup time: {formatTime(pickup.time)}
                        </p>
                      )}
                      {pickup.instructions && (
                        <p className="flex items-start gap-1.5 pl-[22px] text-sm text-slate-500">
                          {pickup.instructions}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-400">
                      No pickup details provided
                    </p>
                  )}
                </PanelSection>

                {/* ── What the customer asked for ── */}
                {(booking.specialRequests || booking.supplierNotes) && (
                  <PanelSection label="Requests & notes">
                    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                      {booking.specialRequests && (
                        <PanelFact label="Special requests">
                          <span className="font-normal text-slate-600">{booking.specialRequests}</span>
                        </PanelFact>
                      )}
                      {booking.supplierNotes && (
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
                          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                              Supplier note
                            </p>
                            <p className="mt-0.5 text-xs text-amber-800">{booking.supplierNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </PanelSection>
                )}
              </div>

              {/* ── Actions ──
                  Status changes lead, on the left; the two things that leave
                  this card (chat, full detail) sit opposite them. */}
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-200/70 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                {actions.map((action) => (
                  <button
                    key={action.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusUpdate(booking.id, action.value);
                    }}
                    disabled={isUpdating}
                    className={cn(
                      // A full-width target on a phone; compact in the row on
                      // desktop, where these sit beside the secondary actions.
                      "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:w-auto sm:py-2",
                      action.variant === "primary"
                        ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                        : action.variant === "danger"
                          ? "border border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {isUpdating && (
                      <Loader2 size={13} className="animate-spin" />
                    )}
                    {action.label}
                  </button>
                ))}
                <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessageCustomer(booking);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    <MessageCircle size={13} /> Message customer
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail?.(booking);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    <Info size={13} /> View details
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}