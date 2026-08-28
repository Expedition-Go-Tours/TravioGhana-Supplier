import { MapPinned, Phone, Clock, Pencil, MessageSquareText } from "lucide-react";
import { formatDate, formatTime, cn } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";
import StatusBadge from "@/components/shared/StatusBadge";
import PickupMapPreview from "../PickupMapPreview";
import CompletenessIndicator from "./CompletenessIndicator";
import TravelerManifest from "./TravelerManifest";

function pickupLabel(pickup) {
  if (!pickup) return "";
  if (pickup.place) return pickup.place;
  if (pickup.areaName) return `Pickup area: ${pickup.areaName}`;
  if (pickup.locationName) return pickup.locationName;
  if (pickup.address?.name) return pickup.address.name;
  if (pickup.address?.address) return pickup.address.address;
  return "Pickup requested";
}

function isPickupIncomplete(pickup) {
  if (!pickup) return true;
  if (!pickup.place && !pickup.areaName && !pickup.locationName && !pickup.address) return true;
  if (!pickup.time) return true;
  if (!pickup.instructions) return true;
  return false;
}

export default function PickupBookingCard({ booking, onEdit }) {
  const pickup = booking.pickup || {};
  const incomplete = isPickupIncomplete(pickup);
  const address = pickup.place || pickup.address?.name || pickup.address?.address || "";

  return (
    <div
      className={cn(
        "bg-white border rounded-xl overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:shadow-slate-900/5",
        incomplete
          ? "border-l-4 border-l-amber-400 border border-amber-100"
          : "border-l-4 border-l-emerald-500 border border-emerald-100/60"
      )}
    >
      <div className="p-4 sm:p-5">
        {/* Top row: Photo + Date/Time + Status + Completeness */}
        <div className="flex items-start gap-3 mb-3">
          {booking.tourPhoto ? (
            <OptimizedImage
              src={booking.tourPhoto}
              alt=""
              width={56}
              fit="fill"
              className="w-11 h-11 rounded-lg object-cover border border-slate-100 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0">
              <MapPinned size={16} className="text-emerald-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-slate-800">{booking.tourName}</p>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock size={11} /> {formatDate(booking.travelDate)}
              </span>
              <span className="text-xs text-slate-400">
                {formatTime(booking.selectedTime) || "Flexible time"}
              </span>
            </div>
          </div>

          <CompletenessIndicator pickup={pickup} />
        </div>

        {/* Customer + Travelers row */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <Phone size={11} className="text-slate-400" />
              <span className="font-medium">{booking.customerName}</span>
              {booking.customerPhone && (
                <span className="text-slate-400">{booking.customerPhone}</span>
              )}
            </span>
          </div>
          <TravelerManifest travelers={booking.travelersRaw} compact />
        </div>

        {/* Pickup details panel */}
        <div
          className={cn(
            "rounded-lg p-3.5 border",
            incomplete
              ? "bg-amber-50/50 border-amber-200/60"
              : "bg-emerald-50/30 border-emerald-200/40"
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "p-1 rounded-md shrink-0",
                  incomplete ? "bg-amber-100" : "bg-emerald-100"
                )}
              >
                <MapPinned
                  size={12}
                  className={incomplete ? "text-amber-600" : "text-emerald-600"}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-medium truncate",
                  incomplete ? "text-amber-800" : "text-emerald-800"
                )}
              >
                {pickup.place || pickup.areaName || pickup.locationName || pickup.address?.name
                  ? pickupLabel(pickup)
                  : "No pickup location set"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 ml-6">
            {pickup.time && (
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-slate-400" />
                <span className="text-xs text-slate-600">{formatTime(pickup.time)}</span>
              </div>
            )}
            {!pickup.time && incomplete && (
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-amber-400" />
                <span className="text-xs text-amber-600 font-medium">Time not set</span>
              </div>
            )}

            {pickup.instructions && (
              <div className="flex items-start gap-1.5">
                <MessageSquareText size={11} className="text-slate-400 mt-0.5 shrink-0" />
                <span className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {pickup.instructions}
                </span>
              </div>
            )}
            {!pickup.instructions && incomplete && (
              <div className="flex items-center gap-1.5">
                <MessageSquareText size={11} className="text-amber-400" />
                <span className="text-xs text-amber-600 font-medium">Instructions not set</span>
              </div>
            )}
          </div>

          <div className="mt-2.5 ml-6">
            <PickupMapPreview lat={pickup.lat} lng={pickup.lng} address={address} />
          </div>
        </div>

        {/* Traveler details (expanded) */}
        {booking.travelersRaw && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <TravelerManifest travelers={booking.travelersRaw} />
          </div>
        )}

        {/* Edit button */}
        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={() => onEdit(booking)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Pencil size={12} />
            Edit pickup
          </button>
        </div>
      </div>
    </div>
  );
}

export { pickupLabel, isPickupIncomplete };
