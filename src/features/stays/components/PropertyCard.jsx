import { Edit, Eye, Percent, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import StaysCard from "./StaysCard";
import StaysPill from "./StaysPill";
import { statusTone } from "../utils/status";
import { propertyProgressLabel } from "../config/constants";

/**
 * The property card in both layouts:
 *
 *   grid   a stacked card for the three-across grid
 *   list   a two-column row (info | info) with the footer spanning both
 *
 * The footer matches the Experiences product card: the booking/room stats on
 * the left and the icon actions bottom-right — special offer (Live/Paused
 * only, like products), preview, edit and delete.
 */

const ICON_BUTTON =
  "p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors";
const DELETE_BUTTON =
  "p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors";

export default function PropertyCard({
  property,
  layout = "Grid",
  onEdit,
  onPreview,
  onCreateOffer,
  onDelete,
}) {
  const rooms = property.rooms?.length || 0;
  const units = (property.rooms || []).reduce((sum, room) => sum + Number(room.count || 0), 0);
  const bookings = property.bookings ?? 0;
  const isDraft = property.status === "Draft";
  const isList = layout === "List";
  const offerEligible = property.status === "Live" || property.status === "Paused";

  const head = (
    <div className="flex items-start justify-between gap-2.5">
      <StaysPill tone={statusTone(property.status)}>{property.status}</StaysPill>
      <span className="text-xs text-slate-400">{propertyProgressLabel(property)}</span>
    </div>
  );

  const facts = (
    <>
      <h3
        className={cn(
          "text-base font-semibold text-slate-800",
          isList ? "mb-1 mt-0" : "mb-1 mt-4",
        )}
      >
        {property.name}
      </h3>
      <p className="m-0 text-sm leading-relaxed text-slate-500">
        {`${property.type} · ${property.city || "Location pending"}, ${property.region}`}
      </p>
    </>
  );

  const footer = (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="font-medium">
          {bookings} {bookings === 1 ? "booking" : "bookings"}
        </span>
        <span>
          {rooms} room {rooms === 1 ? "type" : "types"}
        </span>
        <span>
          {units} {units === 1 ? "unit" : "units"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {offerEligible && (
          <button type="button" onClick={onCreateOffer} className={ICON_BUTTON} title="Create special offer">
            <Percent size={14} />
          </button>
        )}
        <button type="button" onClick={onPreview} className={ICON_BUTTON} title="Preview">
          <Eye size={14} />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className={ICON_BUTTON}
          title={isDraft ? "Continue setup" : "Edit listing"}
        >
          <Edit size={14} />
        </button>
        <button type="button" onClick={onDelete} className={DELETE_BUTTON} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  if (isList) {
    return (
      <StaysCard
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-x-4 gap-y-1",
          "max-[800px]:block",
        )}
      >
        {head}
        {facts}
        <div className="col-span-full">{footer}</div>
      </StaysCard>
    );
  }

  return (
    <StaysCard className="flex flex-col">
      {head}
      {facts}
      <div className="mt-auto">{footer}</div>
    </StaysCard>
  );
}
