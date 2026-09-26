import { useState } from "react";
import {
  MapPinned,
  Phone,
  Clock,
  Pencil,
  MessageSquareText,
  GripVertical,
  ChevronDown,
  Check,
  Undo2,
} from "lucide-react";
import { formatDate, formatTime, cn } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import PickupMapPreview from "../PickupMapPreview";
import TravelerManifest from "./TravelerManifest";
import PickupStatePill from "./PickupStatePill";
import { pickupLabel } from "../../lib/pickupHelpers";
import { pickupStateMeta, resolvePickupState } from "../../lib/pickupState";

/**
 * One pickup stop as a two-tier card:
 *   header  — stop number · time · who/where · expand
 *   strip   — pickup state, booking status and the run actions
 *   details — square map + timing/instructions + passenger manifest
 *
 * The layout is a stack (not a single cramped row) so it stays readable from a
 * 360px phone up to a wide desktop.
 */
export default function PickupBookingCard({
  booking,
  index,
  onEdit,
  onTogglePicked,
  pickedBusy,
  dragHandlers,
  isDragging,
}) {
  const [expanded, setExpanded] = useState(false);
  const pickup = booking.pickup || {};
  const state = resolvePickupState(booking);
  const meta = pickupStateMeta(state);

  const time = pickup.time || booking.selectedTime || "";
  const placeLabel =
    pickupLabel(pickup) ||
    (state === "deferred" ? "Customer will arrange pickup later" : "No pickup location set");
  const address =
    pickup.place || pickup.areaName || pickup.locationName || pickup.address?.name || pickup.address?.address || "";
  const previewLat = pickup.lat ?? pickup.address?.lat ?? null;
  const previewLng = pickup.lng ?? pickup.address?.lng ?? null;

  return (
    <article
      {...(dragHandlers || {})}
      className={cn(
        "overflow-hidden rounded-2xl border border-l-[3px] border-slate-200/70 bg-white transition-shadow",
        meta.accent,
        isDragging ? "opacity-60 shadow-lg" : "hover:border-slate-300/80 hover:shadow-sm"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-3.5 py-3 sm:px-4">
        {dragHandlers && (
          <span
            className="mt-1 hidden shrink-0 cursor-grab text-slate-300 transition-colors hover:text-slate-500 sm:block"
            title="Drag to reorder"
            aria-hidden="true"
          >
            <GripVertical size={16} />
          </span>
        )}

        {/* Stop number + time gutter */}
        <div className="w-[68px] shrink-0 sm:w-[76px]">
          <div className="flex items-baseline gap-1">
            {typeof index === "number" && (
              <span className="text-[10px] font-semibold text-slate-300 tabular-nums">{index + 1}</span>
            )}
            {time ? (
              <span className="text-[15px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">
                {formatTime(time)}
              </span>
            ) : (
              <span className="text-[11px] font-semibold leading-none text-red-600">No time</span>
            )}
          </div>
          <div className="mt-1 text-[10px] leading-none text-slate-400">{formatDate(booking.travelDate)}</div>
        </div>

        {/* Main (toggles details) */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-slate-900">{booking.customerName}</span>
            <TravelerManifest travelers={booking.travelersRaw} compact />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{booking.tourName}</p>
          <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
            <MapPinned size={12} className="mt-0.5 shrink-0 text-slate-400" />
            <span className="line-clamp-1">{placeLabel}</span>
          </p>
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Hide stop details" : "Show stop details"}
          className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          <ChevronDown size={18} className={cn("transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {/* Control strip */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3.5 py-2 sm:px-4">
        <PickupStatePill state={state} />
        <StatusBadge status={booking.status} />
        {booking.pickedUpAt && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Check size={11} /> Picked up
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTogglePicked(booking)}
            disabled={pickedBusy}
            aria-label={booking.pickedUpAt ? "Undo picked up" : "Mark picked up"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              booking.pickedUpAt
                ? "border-slate-200 text-slate-500 hover:bg-slate-50"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            )}
          >
            {booking.pickedUpAt ? <Undo2 size={13} /> : <Check size={13} />}
            {booking.pickedUpAt ? "Undo" : "Picked up"}
          </button>
          <button
            type="button"
            onClick={() => onEdit(booking)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-700"
          >
            <Pencil size={13} /> Edit
          </button>
        </div>
      </div>

      {/* Details */}
      {expanded && (
        <div className="border-t border-slate-100 px-3.5 py-4 sm:px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <PickupMapPreview
              lat={previewLat}
              lng={previewLng}
              address={address}
              className="h-36 w-36 sm:order-first"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1.5">
                {time ? (
                  <p className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Clock size={12} className="text-slate-400" /> Pickup at {formatTime(time)}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <Clock size={12} /> Pickup time not set
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Phone size={12} className="text-slate-400" />
                  {booking.customerName}
                  {booking.customerPhone ? <span className="text-slate-400">{booking.customerPhone}</span> : null}
                </p>
                <p className="flex items-start gap-1.5 text-xs text-slate-600">
                  <MessageSquareText size={12} className="mt-0.5 shrink-0 text-slate-400" />
                  {pickup.instructions ? (
                    <span className="leading-relaxed">{pickup.instructions}</span>
                  ) : (
                    <span className="font-medium text-red-600">Pickup instructions not set</span>
                  )}
                </p>
              </div>

              {booking.travelersRaw && (
                <div className="border-t border-slate-100 pt-3">
                  <TravelerManifest travelers={booking.travelersRaw} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
