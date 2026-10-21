import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  X,
  MapPinned,
  Clock,
  Bell,
  AlertTriangle,
  CheckCircle2,
  PencilLine,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import AmPmTimePicker from "@/components/shared/AmPmTimePicker";
import LocationMapPicker from "@/components/shared/LocationMapPicker";
import StatusBadge from "@/components/shared/StatusBadge";
import PickupMapPreview from "../PickupMapPreview";
import PickupStatePill from "./PickupStatePill";
import { formatDate, formatDateTime, formatTime, cn } from "@/lib/utils";
import {
  pickupCoords,
  pickupDisplay,
  pickupMapsUrl,
} from "../../lib/pickupHelpers";
import { resolvePickupState } from "../../lib/pickupState";
import { updateBookingPickup } from "../../api";

const READ_ONLY_STATUSES = ["CANCELLED", "REFUNDED", "COMPLETED", "NO_SHOW"];
const sameCoord = (a, b) => {
  if (a == null && b == null) return true;
  return a != null && b != null && Math.abs(Number(a) - Number(b)) < 1e-7;
};
const text = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * GetYourGuide-style booking-level pickup editor.
 *
 * One location, one time, optional instructions. The customer's exact address
 * is the default and stays untouched unless the supplier explicitly chooses
 * "Change pickup"; that keeps a time/instruction edit from silently replacing
 * the location. The save result comes from the API's notification flags, so
 * the toast never promises an email that was held for payment.
 */
export default function EditPickupModal({ booking, onClose, onSaved }) {
  const pickup = booking?.pickup && typeof booking.pickup === "object" ? booking.pickup : {};
  const pickupConfig =
    typeof booking?.pickupConfig === "string"
      ? (() => { try { return JSON.parse(booking.pickupConfig); } catch { return null; } })()
      : booking?.pickupConfig || {};
  const configAreas = Array.isArray(pickupConfig?.pickupAreas) ? pickupConfig.pickupAreas : [];
  const configLocations = Array.isArray(pickupConfig?.pickupLocations) ? pickupConfig.pickupLocations : [];
  // Use the mode the customer's snapshot was actually saved with. A tour can
  // offer both service zones and named points; the config type alone is not
  // enough to know which list applies to this booking.
  const savedMode = pickup.mode || pickupConfig?.pickupType;
  const useAreas =
    savedMode === "area"
      ? true
      : savedMode === "address"
        ? configLocations.length === 0
        : configAreas.length > 0;

  const display = pickupDisplay(pickup);
  const originalCoords = pickupCoords(pickup);
  const pickupState = resolvePickupState(booking);
  const original = {
    time: pickup.time || "",
    place: pickup.place || "",
    instructions: pickup.instructions || "",
    areaName: pickup.areaName || "",
    locationName: pickup.locationName || "",
  };
  const readOnly = READ_ONLY_STATUSES.includes(booking?.status);

  const [mode, setMode] = useState(display.hasLocation ? "keep" : "change");
  const [pickupTime, setPickupTime] = useState(original.time);
  const [pickupPlace, setPickupPlace] = useState(original.place);
  const [instructions, setInstructions] = useState(original.instructions);
  const [areaName, setAreaName] = useState(original.areaName);
  const [locationName, setLocationName] = useState(original.locationName);
  const [newAddress, setNewAddress] = useState(null);
  const [newAddressText, setNewAddressText] = useState("");
  const [placeAutoCleared, setPlaceAutoCleared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dialogRef = useRef(null);
  const discardRef = useRef(null);
  const previousFocus = useRef(null);
  const requestCloseRef = useRef(null);

  const pointOptions = (useAreas ? configAreas : configLocations).filter(
    (p) => p && (p.name || p.address)
  );
  const selectedPoint = useAreas ? areaName : locationName;
  const currentPointMissing =
    !!selectedPoint && !pointOptions.some((p) => (p.name || p.address) === selectedPoint);
  const currentZone = configAreas.find((a) => a?.name === (areaName || original.areaName));
  const rawZoneTime = currentZone?.time || pickupConfig?.pickupTime || "";
  const zoneTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawZoneTime) ? rawZoneTime : "";

  const timeChanged = pickupTime !== original.time;
  const placeChanged = pickupPlace !== original.place;
  const instructionsChanged = instructions !== original.instructions;
  const areaChanged = areaName !== original.areaName;
  const locationNameChanged = locationName !== original.locationName;
  const locationChanged = !!newAddress && (
    text(newAddress.address) !== text(pickup.address?.address) ||
    text(newAddress.name) !== text(pickup.address?.name) ||
    !sameCoord(newAddress.lat, originalCoords.lat) ||
    !sameCoord(newAddress.lng, originalCoords.lng)
  );
  const dirty = !readOnly && (
    timeChanged ||
    placeChanged ||
    instructionsChanged ||
    locationChanged ||
    areaChanged ||
    locationNameChanged
  );
  const needsNewLocation = mode === "change" && !newAddress && (display.hasLocation || !readOnly);
  const canSave = !readOnly && dirty && !saving && !needsNewLocation;

  const unpaidReservation =
    booking?.paymentTiming === "later" && booking?.paymentStatus !== "SUCCEEDED";
  const mapsUrl = pickupMapsUrl(pickup);

  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  // Body scroll lock + initial focus + focus restore. Kept separate from the
  // key handler so typing (which changes `dirty`/`requestClose`) never jumps
  // focus back to the first control.
  useEffect(() => {
    previousFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector(
      'button:not([disabled]), input, textarea, select, a[href]'
    );
    if (first) first.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (confirmDiscard) setConfirmDiscard(false);
        else requestCloseRef.current?.();
        return;
      }
      const container = confirmDiscard ? discardRef.current : dialogRef.current;
      if (event.key !== "Tab" || !container) return;
      const focusable = [...container.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )].filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmDiscard]);

  const chooseKeep = () => {
    // "Keep" must be a real undo of location exploration. Leaving newAddress
    // populated made the next save send a pickupAddress even though the
    // supplier had explicitly chosen to keep the customer's point.
    setMode("keep");
    setNewAddress(null);
    setNewAddressText("");
    setAreaName(original.areaName);
    setLocationName(original.locationName);
    if (placeAutoCleared) {
      setPickupPlace(original.place);
      setPlaceAutoCleared(false);
    }
  };

  const handleSavedPoint = (value) => {
    setAreaName(useAreas ? value : "");
    setLocationName(!useAreas ? value : "");
    if (!value) {
      setNewAddress(null);
      setNewAddressText("");
      return;
    }
    const point = pointOptions.find((p) => (p.name || p.address) === value);
    if (!point) return;
    const name = text(point.name) || text(point.address);
    const addressText = text(point.address) || name;
    setNewAddress({
      name,
      address: addressText,
      lat: point.lat ?? null,
      lng: point.lng ?? null,
    });
    setNewAddressText(addressText);
    if (pickupPlace) setPlaceAutoCleared(true);
    setPickupPlace("");
    setMode("change");
  };

  const handleLocationSelect = (result) => {
    if (!result) {
      setNewAddress(null);
      setNewAddressText("");
      setAreaName("");
      setLocationName("");
      return;
    }
    const formatted = text(result.formatted)
      || (result.latitude != null && result.longitude != null
        ? `${Number(result.latitude).toFixed(4)}, ${Number(result.longitude).toFixed(4)}`
        : "");
    if (!formatted) return;
    const name = formatted.split(",")[0]?.trim() || formatted;
    setNewAddress({
      name,
      address: formatted,
      lat: result.latitude ?? null,
      lng: result.longitude ?? null,
    });
    setNewAddressText(formatted);
    setAreaName("");
    setLocationName("");
    if (pickupPlace) setPlaceAutoCleared(true);
    setPickupPlace("");
    setMode("change");
  };

  const handleSave = async () => {
    if (!booking || readOnly || saving) return;
    if (mode === "change" && !newAddress) {
      toast.error("Choose a new pickup location, or keep the customer's pickup.");
      return;
    }

    const payload = {};
    if (timeChanged) payload.pickupTime = pickupTime;
    if (instructionsChanged) payload.instructions = instructions;
    if (locationChanged) {
      payload.pickupAddress = newAddress;
      payload.areaName = areaName;
      payload.locationName = locationName;
      // A new point invalidates the old landmark unless the supplier typed one.
      payload.pickupPlace = placeChanged ? pickupPlace : "";
    } else {
      if (placeChanged) payload.pickupPlace = pickupPlace;
      if (areaChanged) payload.areaName = areaName;
      if (locationNameChanged) payload.locationName = locationName;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const response = await updateBookingPickup(booking.id, payload);
      const result = response?.data?.data?.pickupNotification;
      if (result?.changed) {
        if (result.emailQueued) {
          toast.success("Pickup saved. Customer notified by email and in the app.");
        } else if (result.emailSuppressedReason === "AWAITING_PAYMENT") {
          toast.success("Pickup saved. Customer notified in the app; email will send after payment.");
        } else {
          toast.success("Pickup saved. Customer notified in the app.");
        }
      } else if (result) {
        toast.info("Pickup saved. Nothing changed, so no notification was sent.");
      } else {
        toast.success("Pickup saved.");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to save pickup details");
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = booking?.travelDate ? formatDate(booking.travelDate) : "";
  const bookingTimeLabel = booking?.selectedTime ? formatTime(booking.selectedTime) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-pickup-title"
        aria-describedby="edit-pickup-context"
        className="relative flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="edit-pickup-title" className="text-lg font-bold text-slate-900">
              Edit pickup
            </h2>
            <p id="edit-pickup-context" className="mt-0.5 truncate text-sm text-slate-500">
              {booking?.tourName} · {booking?.bookingNumber}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {dateLabel}{bookingTimeLabel ? ` at ${bookingTimeLabel}` : ""}
              {booking?.travelers ? ` · ${booking.travelers} ${booking.travelers === 1 ? "traveler" : "travelers"}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <fieldset disabled={readOnly || saving} className="space-y-5">
            <legend className="sr-only">Pickup details</legend>

            {readOnly && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>
                  This booking is <span className="font-semibold">{booking?.status?.toLowerCase()}</span>.
                  Pickup details can no longer be edited.
                </p>
              </div>
            )}

            {/* Current customer pickup */}
            <section
              aria-labelledby="current-pickup-heading"
              className={cn(
                "rounded-xl border px-3.5 py-3",
                display.hasLocation ? "border-slate-200 bg-slate-50/70" : "border-amber-200 bg-amber-50/70"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="hidden sm:block">
                  <PickupMapPreview
                    lat={originalCoords.lat}
                    lng={originalCoords.lng}
                    address={display.primary}
                    className="h-24 w-24"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 id="current-pickup-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer&rsquo;s pickup
                    </h3>
                    <PickupStatePill state={pickupState} />
                    <StatusBadge status={booking?.status} />
                  </div>
                  <p className={cn(
                    "mt-1 text-sm font-semibold leading-relaxed",
                    display.primary ? "text-slate-800" : "text-amber-800"
                  )}>
                    {display.primary || "No pickup location supplied yet"}
                  </p>
                  {display.secondary && (
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{display.secondary}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {display.zone && display.zone !== display.primary && (
                      <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-medium text-slate-500 ring-1 ring-slate-200">
                        Zone: {display.zone}
                      </span>
                    )}
                    {pickup.time ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {formatTime(pickup.time)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                        <Clock size={11} /> No time set
                      </span>
                    )}
                    {pickup.updatedAt && (
                      <span className="text-slate-400">Updated {formatDateTime(pickup.updatedAt)}</span>
                    )}
                  </div>
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
                    {pickupState === "deferred" && (
                      <span className="text-[11px] font-medium text-sky-700">Customer will arrange pickup later</span>
                    )}
                    {pickupState !== "deferred" && booking?.pickup?.updatedBy && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 size={11} /> Confirmed by supplier
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Keep or change the location */}
            {display.hasLocation ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Pickup location</p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pickup location">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === "keep"}
                    onClick={chooseKeep}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      mode === "keep"
                        ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span className="block text-sm font-semibold text-slate-800">Keep customer&rsquo;s pickup</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                      Only time, landmark or instructions change.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === "change"}
                    onClick={() => setMode("change")}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      mode === "change"
                        ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span className="block text-sm font-semibold text-slate-800">Change pickup</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                      Search the map or use a service zone.
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              !readOnly && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                  <p className="flex items-start gap-2">
                    <Info size={15} className="mt-0.5 shrink-0" />
                    This booking has no pickup location. Set one below so the customer and driver see the same point.
                  </p>
                </div>
              )
            )}

            {mode === "change" && (
              <div className="space-y-4 rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-3.5">
                {pointOptions.length > 0 && (
                  <div>
                    <label
                      htmlFor="pickup-zone"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Or use a saved {useAreas ? "service zone" : "pickup point"}
                    </label>
                    <select
                      id="pickup-zone"
                      value={selectedPoint}
                      onChange={(event) => handleSavedPoint(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#044b3b] focus:outline-none focus:ring-2 focus:ring-[#044b3b]/15"
                    >
                      <option value="">Choose on the map instead</option>
                      {currentPointMissing && <option value={selectedPoint}>{selectedPoint}</option>}
                      {pointOptions.map((p) => (
                        <option key={p.name || p.address} value={p.name || p.address}>
                          {p.name || p.address}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                      A zone replaces the exact customer address with the zone&rsquo;s pickup point.
                    </p>
                  </div>
                )}

                <LocationMapPicker
                  onSelect={handleLocationSelect}
                  initialLat={originalCoords.lat}
                  initialLng={originalCoords.lng}
                  label="Search for the new pickup point"
                  placeholder="Street address, hotel or landmark…"
                />

                {newAddressText ? (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
                    <MapPinned size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">New pickup point</p>
                      <p className="text-sm font-medium leading-relaxed text-slate-800">{newAddressText}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Search for an address or click the map to choose the new point.
                  </p>
                )}
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  This replaces the customer&rsquo;s exact address. They will be notified.
                </p>
              </div>
            )}

            {/* Time */}
            <fieldset className="min-w-0">
              <legend className="mb-1.5 block text-sm font-semibold text-slate-800">
                Pickup time
              </legend>
              <AmPmTimePicker
                value={pickupTime}
                onChange={setPickupTime}
                allowEmpty
                emptyLabel="No pickup time set"
                onClear={() => setPickupTime("")}
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>Leave blank if the customer has not chosen a time yet.</span>
                {zoneTime && pickupTime !== zoneTime && (
                  <button
                    type="button"
                    onClick={() => setPickupTime(zoneTime)}
                    className="font-semibold text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-800"
                  >
                    Use zone time ({formatTime(zoneTime)})
                  </button>
                )}
              </div>
            </fieldset>

            {/* Landmark */}
            <div>
              <label htmlFor="pickup-place" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Landmark / driver note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="pickup-place"
                rows={2}
                maxLength={500}
                value={pickupPlace}
                onChange={(event) => {
                  setPickupPlace(event.target.value);
                  setPlaceAutoCleared(false);
                }}
                className="w-full resize-vertical rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm transition-all focus:border-[#044b3b] focus:outline-none focus:ring-2 focus:ring-[#044b3b]/15"
                placeholder="e.g. Main entrance, blue gate, Marriott Hotel"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                A note for the driver — not the address.
                {mode === "change" && locationChanged && !placeChanged && (
                  <span className="ml-1 font-medium text-amber-700">The old landmark will be cleared unless you enter a new one.</span>
                )}
              </p>
            </div>

            {/* Instructions */}
            <div>
              <label htmlFor="pickup-instructions" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Instructions for the customer <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="pickup-instructions"
                rows={3}
                maxLength={1000}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                className="w-full resize-vertical rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm transition-all focus:border-[#044b3b] focus:outline-none focus:ring-2 focus:ring-[#044b3b]/15"
                placeholder="e.g. Look for the blue van with our logo at the south entrance"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Shown in the customer&rsquo;s booking and pickup email. Optional.
              </p>
            </div>

            {/* Change summary + notification truth */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
              <p className="text-xs font-semibold text-slate-700">
                {dirty ? "Changes to save" : "No changes yet"}
              </p>
              {dirty && (
                <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                  {locationChanged && (
                    <li className="flex items-start gap-1.5">
                      <PencilLine size={11} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>Pickup point: <span className="font-medium">{newAddressText}</span></span>
                    </li>
                  )}
                  {!locationChanged && (areaChanged || locationNameChanged) && (
                    <li className="flex items-start gap-1.5">
                      <MapPinned size={11} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>
                        {areaChanged ? "Zone" : "Pickup point"}:{" "}
                        <span className="font-medium">
                          {(areaChanged ? areaName : locationName) || "Cleared"}
                        </span>
                      </span>
                    </li>
                  )}
                  {timeChanged && (
                    <li className="flex items-start gap-1.5">
                      <Clock size={11} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>Time: <span className="font-medium">{pickupTime ? formatTime(pickupTime) : "Not set"}</span></span>
                    </li>
                  )}
                  {placeChanged && (
                    <li className="flex items-start gap-1.5">
                      <PencilLine size={11} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>Landmark: <span className="font-medium">{pickupPlace || "Cleared"}</span></span>
                    </li>
                  )}
                  {instructionsChanged && (
                    <li className="flex items-start gap-1.5">
                      <PencilLine size={11} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>Instructions updated</span>
                    </li>
                  )}
                </ul>
              )}
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500" aria-live="polite">
                <Bell size={12} className="mt-0.5 shrink-0" />
                {dirty
                  ? unpaidReservation
                    ? "The customer gets an in-app notification now. Email is held until payment."
                    : "The customer gets an email and an in-app notification."
                  : "Make a change to notify the customer."}
              </p>
            </div>
          </fieldset>
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[#044b3b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#033629] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {/* In-app discard confirmation (no window.confirm) */}
        {confirmDiscard && (
          <div
            ref={discardRef}
            className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/40 p-5"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-pickup-title"
            aria-describedby="discard-pickup-copy"
          >
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <h3 id="discard-pickup-title" className="text-sm font-semibold text-slate-900">
                    Discard unsaved changes?
                  </h3>
                  <p id="discard-pickup-copy" className="mt-1 text-xs leading-relaxed text-slate-500">
                    Your pickup edits have not been saved and the customer has not been notified.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmDiscard(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
