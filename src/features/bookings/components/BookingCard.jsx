import { useState, useCallback } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "@/components/shared/StatusBadge";
import { BOOKING_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate, formatTime, cn } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";
import {
  formatPartySummary,
  formatTravelerDetails,
  getTravelerDetails,
} from "../lib/formatTravelers";

const STATUS_ACTIONS = {
  PENDING: [
    { value: "CONFIRMED", label: "Accept booking", variant: "primary" },
    { value: "CANCELLED", label: "Cancel", variant: "danger" },
  ],
  CONFIRMED: [
    { value: "CANCELLED", label: "Cancel", variant: "danger" },
  ],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
  NO_SHOW: [],
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
    label: "Reserve now, pay later",
    hint: "Reserved · charge due before the activity",
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

export default function BookingCard({
  booking,
  onStatusUpdate,
  isUpdating,
  isHighlighted,
  onMessageCustomer,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPayLater = booking.paymentTiming === 'later';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const travelDatePassed = new Date(booking.travelDate) < today;
  // Reserve-now-pay-later bookings start PENDING with no money captured; payment
  // is the gate, so don't offer a manual "Accept booking" until the charge lands.
  // A PAID PENDING booking (pay-later charged, or a manual-confirmation tour)
  // is awaiting the supplier's acceptance, so the Accept action must be shown.
  const payLaterUnpaid = isPayLater && booking.status === 'PENDING' && booking.paymentStatus !== 'SUCCEEDED';
  const actions = (STATUS_ACTIONS[booking.status] || []).filter(
    (a) => !(payLaterUnpaid && a.value === 'CONFIRMED')
  ).filter(
    (a) => !(travelDatePassed && a.value === 'CONFIRMED')
  );
  const pickup = booking.pickup || {};
  const partySummary = formatPartySummary(booking.travelersRaw);
  const travelerNames = formatTravelerDetails(booking.travelersRaw);
  const travelerDetails = getTravelerDetails(booking.travelersRaw);
  const guestCount = booking.travelers;

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
      {/* ===== COLLAPSED HEADER — GetYourGuide style ===== */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpand}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-4 px-4 sm:px-5 py-3.5 cursor-pointer select-none"
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
            <div className="w-full h-full flex items-center justify-center text-2xl text-slate-300">
              🏰
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
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarDays size={12} className="shrink-0" />
            <span className="whitespace-nowrap">
              {formatDate(booking.travelDate)}
              {booking.selectedTime && ` · ${formatTime(booking.selectedTime)}`}
            </span>
            <span className="text-slate-300">·</span>
            <span className="whitespace-nowrap">
              Booked {formatDate(booking.bookingDate)}
            </span>
          </p>

          {/* Booking reference + participants */}
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-mono text-[11px] text-slate-500">
              {booking.bookingNumber}
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <Users size={12} className="shrink-0" />
              {guestCount} traveler{guestCount !== 1 ? "s" : ""}
            </span>
            <span className="text-slate-300">·</span>
            <span className={`flex items-center gap-1 ${booking.instantConfirmation ? "text-emerald-600" : "text-amber-600"}`}>
              {booking.instantConfirmation ? <Zap size={12} className="shrink-0" /> : <Clock size={12} className="shrink-0" />}
              {booking.instantConfirmation ? "Instant confirmation" : "Manual confirmation"}
            </span>
          </p>
        </div>

        {/* Right column: status + price + chevron */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
          <StatusBadge
            status={booking.status}
            label={BOOKING_STATUSES[booking.status]?.label || booking.status}
            size="sm"
          />
          <p className="text-base font-bold text-slate-900 whitespace-nowrap">
            {formatCurrency(booking.total, booking.currency)}
          </p>
          {booking.discount > 0 && (
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
            <div className="px-4 sm:px-5 pb-5 border-t border-slate-100">
              {/* ── Payment status (paid / reserve-now-pay-later) ── */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between pt-4 pb-4 border-b border-slate-100">
                <PaymentStatus paymentStatus={booking.paymentStatus} paymentTiming={booking.paymentTiming} />
                <p className="text-xs text-slate-400 text-right">
                  Total charged to customer
                </p>
              </div>

              {/* ── Pricing breakdown ── */}
              {booking.discount > 0 && (
                <div className="py-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">
                    Pricing breakdown
                  </h4>
                  <div className="rounded-lg bg-slate-50 border border-slate-200/60 divide-y divide-slate-200/60 text-sm">
                    {booking.subtotal > 0 && (
                      <div className="flex justify-between px-3 py-2">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-medium text-slate-800">{formatCurrency(booking.subtotal, booking.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-slate-600">Discount</span>
                      <span className="font-medium text-red-600">
                        −{formatCurrency(booking.discount, booking.currency)}
                      </span>
                    </div>
                    {booking.offerName && (
                      <div className="flex justify-between px-3 py-2">
                        <span className="text-slate-500 text-xs">Applied offer</span>
                        <span className="text-xs text-slate-600">
                          {booking.offerName}
                          {booking.offerDiscountType === 'PERCENTAGE' && booking.offerDiscountPct && (
                            <span className="ml-1 text-red-600 font-medium">({booking.offerDiscountPct}% off)</span>
                          )}
                          {booking.offerDiscountType === 'FIXED' && booking.offerDiscountFix && (
                            <span className="ml-1 text-red-600 font-medium">({formatCurrency(booking.offerDiscountFix, booking.currency)} off)</span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between px-3 py-2 bg-white">
                      <span className="font-semibold text-slate-800">Total paid</span>
                      <span className="font-bold text-slate-900">{formatCurrency(booking.total, booking.currency)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Warning: past-date PENDING ── */}
              {booking.status === 'PENDING' && travelDatePassed && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 mt-3 rounded-lg bg-red-50 border border-red-200/60">
                  <AlertTriangle size={15} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">
                    Activity date has passed. This booking will be auto-cancelled if not confirmed soon.
                  </p>
                </div>
              )}

              {/* ── Section: Booking details ── */}
              <div className="py-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  Booking details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Reference</p>
                    <p className="text-sm font-medium text-slate-800 font-mono">
                      {booking.bookingNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Purchased</p>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(booking.bookingDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      Activity date
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(booking.travelDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Travelers</p>
                    <p className="text-sm font-medium text-slate-800">
                      {partySummary || `${guestCount} traveler${guestCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Section: Lead traveler ── */}
              <div className="py-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  Lead traveler
                </h4>
                <div className="flex items-center gap-3">
                  {booking.customerPhoto ? (
                    <OptimizedImage
                      src={booking.customerPhoto}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                      {(booking.leadTravelerName || "?").charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {booking.leadTravelerName}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {booking.leadTravelerEmail && (
                        <span className="text-xs text-slate-500">
                          {booking.leadTravelerEmail}
                        </span>
                      )}
                      {booking.leadTravelerPhone && (
                        <span className="text-xs text-slate-500">
                          {booking.leadTravelerPhone}
                        </span>
                      )}
                    </div>
                    {booking.customerName && booking.customerName !== booking.leadTravelerName && (
                      <p className="text-xs text-slate-400 mt-1">Booked by {booking.customerName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section: Participants ── */}
              {(travelerNames || guestCount) && (
                <div className="py-4 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">
                    Participants
                  </h4>
                  <p className="text-sm text-slate-500 mb-3">
                    {guestCount} traveler{guestCount !== 1 ? "s" : ""}
                  </p>
                  {travelerDetails.length > 0 && (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Name</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 w-16">Age</th>
                          </tr>
                        </thead>
                        <tbody>
                          {travelerDetails.map((d, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                              <td className="px-3 py-2 text-slate-700">{d.name || `Traveler ${i + 1}`}</td>
                              <td className="px-3 py-2 text-slate-500">{d.age ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Section: Pickup details ── */}
              <div className="py-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  Pickup details
                </h4>
                {pickup.place ||
                pickup.areaName ||
                pickup.locationName ||
                pickup.address ? (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 text-sm text-slate-700">
                      <MapPinned size={14} className="text-slate-400 shrink-0" />
                      {pickup.place ||
                        pickup.areaName ||
                        pickup.locationName ||
                        pickup.address?.name}
                    </p>
                    {pickup.time && (
                      <p className="flex items-center gap-1.5 text-sm text-slate-500 pl-[22px]">
                        Pickup time: {formatTime(pickup.time)}
                      </p>
                    )}
                    {pickup.instructions && (
                      <p className="flex items-start gap-1.5 text-sm text-slate-500 pl-[22px]">
                        {pickup.instructions}
                      </p>
                    )}
                    {pickup.address &&
                      typeof pickup.address === "object" &&
                      pickup.address.address && (
                        <p className="flex items-start gap-1.5 text-sm text-slate-500 pl-[22px]">
                          {pickup.address.address}
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    No pickup details provided
                  </p>
                )}
              </div>

              {/* ── Section: Special requests ── */}
              {booking.specialRequests && (
                <div className="py-4 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">
                    Special requests
                  </h4>
                  <p className="text-sm text-slate-600">
                    {booking.specialRequests}
                  </p>
                </div>
              )}

              {/* ── Supplier Notes ── */}
              {booking.supplierNotes && (
                <div className="py-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200/60">
                    <AlertTriangle
                      size={13}
                      className="text-amber-600 shrink-0"
                    />
                    <p className="text-xs text-amber-700">
                      {booking.supplierNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Actions ── */}
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
                {actions.map((action) => (
                  <button
                    key={action.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusUpdate(booking.id, action.value);
                    }}
                    disabled={isUpdating}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50",
                      action.variant === "primary"
                        ? "bg-[#044b3b] text-white hover:bg-[#033629] shadow-sm"
                        : action.variant === "danger"
                          ? "text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {isUpdating && (
                      <Loader2 size={13} className="animate-spin" />
                    )}
                    {action.label}
                  </button>
                ))}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessageCustomer(booking.customerId);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-[#044b3b] hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
                >
                  <MessageCircle size={13} /> Message customer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}