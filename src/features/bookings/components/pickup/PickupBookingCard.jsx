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
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Copy,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime, formatTime, cn } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import PickupMapPreview from "../PickupMapPreview";
import TravelerManifest from "./TravelerManifest";
import PickupStatePill from "./PickupStatePill";
import {
  pickupCoords,
  pickupDisplay,
  pickupMapsUrl,
} from "../../lib/pickupHelpers";
import { pickupStateMeta, resolvePickupState } from "../../lib/pickupState";

/**
 * One pickup stop as a two-tier card:
 *   header  — stop number · time · who/where · expand
 *   strip   — pickup state, booking status and the run actions
 *   details — square map + exact address + timing/instructions + manifest
 *
 * The layout is a stack (not a single cramped row) so it stays readable from a
 * 360px phone up to a wide desktop. Reorder also has keyboard/touch-friendly
 * up/down buttons; drag is a desktop shortcut, not the only way to move a stop.
 */
export default function PickupBookingCard({
  booking,
  index,
  onEdit,
  onTogglePicked,
  onMove,
  pickedBusy,
  dragHandlers,
  isDragging,
  canManage = true,
  isFirst = false,
  isLast = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const pickup = booking.pickup || {};
  const state = resolvePickupState(booking);
  const meta = pickupStateMeta(state);
  const display = pickupDisplay(pickup);
  const { lat, lng } = pickupCoords(pickup);
  const mapsUrl = pickupMapsUrl(pickup);

  const time = pickup.time || "";
  const primary =
    display.primary ||
    (state === "deferred" ? "Customer will arrange pickup later" : "No pickup location set");
  const addressForMap = display.primary;

  const copyAddress = async () => {
    const value = [display.primary, display.secondary].filter(Boolean).join(" · ");
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Pickup address copied");
    } catch {
      toast.error("Could not copy the pickup address");
    }
  };

  return (
    <article
      {...(canManage && dragHandlers ? dragHandlers : {})}
      className={cn(
        "overflow-hidden rounded-2xl border border-l-[3px] border-slate-200/70 bg-white transition-shadow",
        meta.accent,
        isDragging ? "opacity-60 shadow-lg" : "hover:border-slate-300/80 hover:shadow-sm",
        canManage && dragHandlers && "sm:cursor-grab"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-3.5 py-3 sm:px-4">
        {canManage && dragHandlers && (
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
          aria-label={`${expanded ? "Hide" : "Show"} pickup details for ${booking.customerName}`}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-slate-900">{booking.customerName}</span>
            <TravelerManifest travelers={booking.travelersRaw} compact />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{booking.tourName}</p>
          <p className="mt-1 flex items-start gap-1 text-xs text-slate-600" title={display.primary || undefined}>
            <MapPinned size={12} className="mt-0.5 shrink-0 text-slate-400" />
            <span className={cn("line-clamp-2 leading-snug", !display.primary && "text-slate-400")}>
              {primary}
            </span>
          </p>
          {display.secondary && (
            <p className="mt-0.5 pl-[18px] text-[11px] leading-snug text-slate-400 line-clamp-1">
              {display.secondary}
            </p>
          )}
          {display.zone && display.zone !== display.primary && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              Zone: {display.zone}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Hide stop details" : "Show stop details"}
          className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
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
          {!canManage && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <ShieldAlert size={12} /> View only
            </span>
          )}
          {canManage && onMove && (
            <div className="flex items-center rounded-lg border border-slate-200" role="group" aria-label="Reorder stop">
              <button
                type="button"
                onClick={() => onMove(booking, -1)}
                disabled={isFirst}
                aria-label={`Move ${booking.customerName}'s stop up`}
                className="rounded-l-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp size={13} />
              </button>
              <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onMove(booking, 1)}
                disabled={isLast}
                aria-label={`Move ${booking.customerName}'s stop down`}
                className="rounded-r-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown size={13} />
              </button>
            </div>
          )}
          {canManage && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Details */}
      {expanded && (
        <div className="border-t border-slate-100 px-3.5 py-4 sm:px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <PickupMapPreview
              lat={lat}
              lng={lng}
              address={addressForMap || primary}
              className="h-36 w-36 sm:order-first"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pickup point</p>
                  <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-700">
                    {display.primary || "No exact address supplied"}
                  </p>
                  {display.secondary && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{display.secondary}</p>
                  )}
                  {display.zone && display.zone !== display.primary && (
                    <p className="mt-1 text-[11px] text-slate-500">Zone: {display.zone}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <ExternalLink size={11} /> Open in Maps
                      </a>
                    )}
                    {display.primary && (
                      <button
                        type="button"
                        onClick={copyAddress}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <Copy size={11} /> Copy
                      </button>
                    )}
                  </div>
                </div>

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
                  <span>{booking.customerName}</span>
                  {booking.contactPhone ? (
                    <a
                      href={`tel:${String(booking.contactPhone).replace(/[^\d+]/g, "")}`}
                      className="text-slate-500 underline decoration-slate-200 underline-offset-2 hover:text-emerald-700"
                    >
                      {booking.contactPhone}
                    </a>
                  ) : null}
                </p>
                <p className="flex items-start gap-1.5 text-xs text-slate-600">
                  <MessageSquareText size={12} className="mt-0.5 shrink-0 text-slate-400" />
                  {pickup.instructions ? (
                    <span className="leading-relaxed">{pickup.instructions}</span>
                  ) : (
                    <span className="text-slate-400">No pickup instructions added</span>
                  )}
                </p>
                {booking.specialRequests && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                    <MessageSquareText size={12} className="mt-0.5 shrink-0" />
                    <span className="leading-relaxed">Special request: {booking.specialRequests}</span>
                  </p>
                )}
                {pickup.updatedAt && (
                  <p className="text-[10px] text-slate-400">
                    Pickup last updated {formatDateTime(pickup.updatedAt)}
                  </p>
                )}
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
