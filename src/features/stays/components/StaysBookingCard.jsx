import { useCallback, useState } from "react";
import {
  ChevronDown,
  Users,
  Home,
  CalendarDays,
  Loader2,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import StaysPill from "./StaysPill";
import { statusTone } from "../utils/status";
import { formatMoney } from "../utils/money";
import { formatStayShort } from "../utils/dates";

/**
 * A Stays reservation row — the Stays mirror of the Experiences `BookingCard`
 * (same chrome, chevron expansion and action styling): a collapsed desktop /
 * mobile header with the property, stay dates and status, and an expanded
 * detail block with the booking facts, the guest and the status actions for
 * the reservation's current state.
 */

const STATUS_ACTIONS = {
  New: [
    { value: "Confirmed", label: "Confirm booking", variant: "primary" },
    { value: "Cancelled", label: "Cancel", variant: "danger" },
  ],
  Confirmed: [
    { value: "Checked in", label: "Check in", variant: "primary" },
    { value: "Cancelled", label: "Cancel", variant: "danger" },
  ],
  "Checked in": [{ value: "Completed", label: "Mark completed", variant: "primary" }],
  Completed: [],
  Cancelled: [],
  "No-show": [],
};

function Thumbnail({ className }) {
  return (
    <div className={cn("rounded-xl overflow-hidden shrink-0 bg-slate-100", className)}>
      <div className="w-full h-full flex items-center justify-center text-slate-300">
        <Home size={26} strokeWidth={1.5} aria-hidden="true" />
      </div>
    </div>
  );
}

export default function StaysBookingCard({ booking, onStatusUpdate, isUpdating }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => setIsExpanded((prev) => !prev), []);
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleExpand();
      }
    },
    [toggleExpand],
  );

  const actions = STATUS_ACTIONS[booking.status] || [];
  const stay = formatStayShort(booking.from, booking.to);
  const statusPill = (
    <StaysPill tone={statusTone(booking.status)}>{booking.status}</StaysPill>
  );

  return (
    <div
      id={`stays-booking-${booking.id}`}
      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* ── Collapsed header — mobile (stacked) ─────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpand}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        className="block sm:hidden px-4 py-3.5 cursor-pointer select-none"
      >
        <div className="flex items-start gap-3">
          <Thumbnail className="w-14 h-14" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex-1 min-w-0 text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">
                {booking.propertyName || "Property"}
              </h3>
              <div className="shrink-0">{statusPill}</div>
            </div>
            <p className="mt-0.5 text-[13px] text-slate-500 truncate">
              {booking.room} · {booking.guest}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5 text-xs text-slate-500">
          <span className="flex items-center gap-1 min-w-0">
            <CalendarDays size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{stay}</span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Users size={12} className="shrink-0 text-slate-400" />
            {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
            {booking.id}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
          <p className="text-base font-bold text-slate-900 whitespace-nowrap shrink-0">
            {formatMoney(booking.amount)}
          </p>
          <span className="flex-1" />
          <ChevronDown
            size={20}
            className={cn(
              "text-slate-400 transition-transform duration-200 shrink-0",
              isExpanded && "rotate-180",
            )}
          />
        </div>
      </div>

      {/* ── Collapsed header — desktop (horizontal) ─────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpand}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        className="hidden sm:flex items-center gap-4 px-4 sm:px-5 py-3.5 cursor-pointer select-none"
      >
        <Thumbnail className="w-[64px] h-[64px] sm:w-[76px] sm:h-[76px]" />

        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">
            {booking.propertyName || "Property"}
          </h3>
          <p className="text-[13px] text-slate-500 leading-snug">
            {booking.room} · {booking.guest}
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400">
            <CalendarDays size={12} className="shrink-0" />
            <span className="whitespace-nowrap">{stay}</span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Users size={12} className="shrink-0" />
              {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-[11px] text-slate-500">{booking.id}</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
          {statusPill}
          <p className="text-base font-bold text-slate-900 whitespace-nowrap">
            {formatMoney(booking.amount)}
          </p>
        </div>

        <ChevronDown
          size={20}
          className={cn(
            "text-slate-400 transition-transform duration-200 shrink-0 ml-1",
            isExpanded && "rotate-180",
          )}
        />
      </div>

      {/* ── Expanded details ────────────────────────────────────────────── */}
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between pt-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
                  <CreditCard size={15} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    {formatMoney(booking.amount)}
                  </span>
                  <span className="text-xs text-slate-400">Collected by TravioGhana</span>
                </div>
                <p className="text-xs text-slate-400 text-right">Booking total</p>
              </div>

              <div className="py-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Booking details</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Reference</p>
                    <p className="text-sm font-medium text-slate-800 font-mono">{booking.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Property</p>
                    <p className="text-sm font-medium text-slate-800">
                      {booking.propertyName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Room</p>
                    <p className="text-sm font-medium text-slate-800">{booking.room}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Stay</p>
                    <p className="text-sm font-medium text-slate-800">{stay}</p>
                  </div>
                </div>
              </div>

              <div className="py-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Guest</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                    {(booking.guest || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{booking.guest}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {booking.guests} guest{booking.guests !== 1 ? "s" : ""} ·{" "}
                      {booking.room}
                    </p>
                  </div>
                </div>
              </div>

              {actions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-4">
                  {actions.map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onStatusUpdate(booking.id, action.value);
                      }}
                      disabled={isUpdating}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50",
                        action.variant === "primary"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                          : "text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200",
                      )}
                    >
                      {isUpdating && <Loader2 size={13} className="animate-spin" />}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
