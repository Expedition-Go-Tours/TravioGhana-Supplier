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
 * One pickup stop in the day's run: a compact, scannable ticket that expands
 * to the passenger manifest, instructions and map. Styled as an OTA dispatch
 * row — the state is a thin left accent + a small chip, never a tinted panel.
 */
export default function PickupBookingCard({ booking, onEdit, onTogglePicked, pickedBusy, dragHandlers, isDragging }) {
  const [expanded, setExpanded] = useState(false);
  const pickup = booking.pickup || {};
  const state = resolvePickupState(booking);
  const meta = pickupStateMeta(state);

  const time = pickup.time || booking.selectedTime || "";
  const placeLabel = pickupLabel(pickup) || (state === "deferred" ? "Customer will arrange pickup later" : "No pickup location set");
  const address = pickup.place || pickup.areaName || pickup.locationName || pickup.address?.name || pickup.address?.address || "";
  const previewLat = pickup.lat ?? pickup.address?.lat ?? null;
  const previewLng = pickup.lng ?? pickup.address?.lng ?? null;

  return (
    <div
      {...(dragHandlers || {})}
      className={cn(
        "rounded-xl border border-slate-200/70 border-l-[3px] bg-white transition-all",
        meta.accent,
        isDragging ? "opacity-60 shadow-lg" : "hover:border-slate-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        {dragHandlers && (
          <span
            className="hidden shrink-0 cursor-grab text-slate-300 transition-colors hover:text-slate-500 sm:block"
            aria-hidden="true"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </span>
        )}

        {/* Pickup time — the one number an operator scans for */}
        <div className="w-14 shrink-0 text-right sm:w-16">
          <div className="text-sm font-bold tabular-nums text-slate-900">
            {time ? formatTime(time) : "—"}
          </div>
          <div className="text-[10px] text-slate-400">{formatDate(booking.travelDate)}</div>
        </div>

        {/* Main (click to expand) */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-slate-900">{booking.customerName}</span>
            <TravelerManifest travelers={booking.travelersRaw} compact />
            <PickupStatePill state={state} />
            {booking.pickedUpAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                <Check size={10} /> Picked up
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span className="truncate">{booking.tourName}</span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPinned size={11} className="shrink-0 text-slate-400" />
              <span className="truncate">{placeLabel}</span>
            </span>
          </div>
        </button>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden sm:block">
            <StatusBadge status={booking.status} />
          </div>
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
            <span className="hidden md:inline">{booking.pickedUpAt ? "Undo" : "Picked up"}</span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(booking)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-700"
          >
            <Pencil size={13} />
            <span className="hidden md:inline">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
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

            {/* Square map — left of the details on desktop, above on mobile. */}
            <PickupMapPreview
              lat={previewLat}
              lng={previewLng}
              address={address}
              className="h-36 w-36 sm:order-first"
            />
          </div>
        </div>
      )}
    </div>
  );
}
