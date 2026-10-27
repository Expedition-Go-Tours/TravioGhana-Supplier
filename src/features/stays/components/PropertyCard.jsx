import { useState } from "react";
import { Eye, Home, Pencil, Percent, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";
import StaysCard from "./StaysCard";
import StaysPill from "./StaysPill";
import StaysButton from "./StaysButton";
import { statusTone } from "../utils/status";
import { propertyProgressLabel } from "../config/constants";

/**
 * The property card — the AdminLTE `card-shadow` shape rebuilt with the
 * dashboard's Tailwind primitives: cover image, shadowed white body, title,
 * subtitle, supporting text and the actions inside the white body.
 *
 *   grid   image on top, body below
 *   list   image on the left, body on the right
 */

const ICON_BUTTON =
  "p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors";
const DELETE_BUTTON =
  "p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors";

function coverPhoto(property) {
  const raw = property.coverPhoto
    || (Array.isArray(property.photos) ? property.photos.find(Boolean) : null);
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  return raw.url || raw.src || "";
}

export default function PropertyCard({
  property,
  layout = "Grid",
  onEdit,
  onPreview,
  onCreateOffer,
  onDelete,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const photo = coverPhoto(property);
  const showImage = Boolean(photo) && !imageFailed;
  const rooms = property.rooms?.length || 0;
  const units = (property.rooms || []).reduce((sum, room) => sum + Number(room.count || 0), 0);
  const bookings = property.bookings ?? 0;
  const isDraft = property.status === "Draft";
  const isList = layout === "List";
  const offerEligible = property.status === "Live" || property.status === "Paused";

  const image = (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden bg-slate-100",
        isList
          ? "aspect-[4/3] sm:aspect-auto sm:w-[240px] sm:min-h-[200px] sm:self-stretch"
          : "aspect-[4/3]",
      )}
    >
      {showImage ? (
        <OptimizedImage
          src={photo}
          width={isList ? 360 : 560}
          alt={property.name}
          data-testid="property-card-cover"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div
          data-testid="property-card-placeholder"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 via-white to-emerald-50"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm">
            <Home size={22} aria-hidden="true" />
          </span>
          <span className="text-xs font-medium text-slate-500">
            {property.type || "Property"}
          </span>
        </div>
      )}
    </div>
  );

  const body = (
    <div data-testid="property-card-body" className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2.5">
        <StaysPill tone={statusTone(property.status)}>{property.status}</StaysPill>
        <span className="text-xs text-slate-400">{propertyProgressLabel(property)}</span>
      </div>

      <h3 className="mt-3 line-clamp-1 text-base font-semibold text-slate-900">
        {property.name}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
        {`${property.type || "Property"} · ${property.city || "Location pending"}, ${property.region || ""}`.replace(/,\s*$/, "")}
      </p>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
        {property.shortDescription || "Manage rooms, rates and availability from one place."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
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

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <StaysButton
          variant="primary"
          size="small"
          onClick={onEdit}
          aria-label={isDraft ? "Continue property setup" : "Edit property"}
        >
          <Pencil size={14} aria-hidden="true" />
          {isDraft ? "Continue setup" : "Edit listing"}
        </StaysButton>
        <StaysButton size="small" onClick={onPreview} aria-label="Preview property">
          <Eye size={14} aria-hidden="true" />
          Preview
        </StaysButton>

        <div className="ml-auto flex items-center gap-1">
          {offerEligible && (
            <button
              type="button"
              onClick={onCreateOffer}
              className={ICON_BUTTON}
              title="Create special offer"
              aria-label="Create special offer"
            >
              <Percent size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className={DELETE_BUTTON}
            title="Delete"
            aria-label="Delete property"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <StaysCard
      className={cn(
        "group flex h-full overflow-hidden p-0 shadow-md shadow-slate-900/5 transition-shadow duration-200 hover:shadow-lg hover:shadow-slate-900/10",
        isList ? "flex-col sm:flex-row" : "flex-col",
      )}
    >
      {image}
      {body}
    </StaysCard>
  );
}
