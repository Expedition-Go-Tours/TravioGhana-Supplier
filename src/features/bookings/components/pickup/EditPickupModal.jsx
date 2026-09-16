import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, X, MapPinned } from "lucide-react";
import { toast } from "sonner";
import AmPmTimePicker from "@/components/shared/AmPmTimePicker";
import LocationMapPicker from "@/components/shared/LocationMapPicker";
import { updateBookingPickup } from "../../api";

export default function EditPickupModal({ booking, onClose, onSaved }) {
  const pickup = booking?.pickup || {};
  const pickupConfig =
    typeof booking?.pickupConfig === "string"
      ? (() => { try { return JSON.parse(booking.pickupConfig); } catch { return null; } })()
      : booking?.pickupConfig || {};
  const configAreas = Array.isArray(pickupConfig?.pickupAreas) ? pickupConfig.pickupAreas : [];
  const configLocations = Array.isArray(pickupConfig?.pickupLocations) ? pickupConfig.pickupLocations : [];
  // Area mode wins when zones exist and pickupType isn't explicitly 'address'
  // with no zones — mirrors the storefront's rule.
  const useAreas = configAreas.length > 0 && !(pickupConfig?.pickupType === "address" && configLocations.length > 0);

  // A customer-chosen pickup is stored with the exact point nested under
  // `address` (area mode), while supplier-set locations live at the top level.
  // Resolve both so the map always shows where the customer actually is.
  const baseLat = pickup.lat != null ? Number(pickup.lat) : pickup.address?.lat != null ? Number(pickup.address.lat) : null;
  const baseLng = pickup.lng != null ? Number(pickup.lng) : pickup.address?.lng != null ? Number(pickup.address.lng) : null;
  const coordsEqual = (a, b) =>
    (a == null && b == null) || (a != null && b != null && Number(a) === Number(b));

  const customerAddress =
    pickup.address && typeof pickup.address === "object"
      ? pickup.address.name || pickup.address.address || ""
      : "";
  const storedLocationLabel = pickup.place || customerAddress || pickup.locationName || pickup.areaName || "";
  const storedLocationSource = pickup.place
    ? "Pickup place"
    : customerAddress
      ? "Customer's address"
      : pickup.locationName
        ? "Pickup point"
        : pickup.areaName
          ? "Pickup area"
          : "";
  const confirmedBySupplier = !!pickup.updatedBy || pickup.status === "confirmed";

  const [pickupTime, setPickupTime] = useState(pickup.time || "");
  const [pickupPlace, setPickupPlace] = useState(pickup.place || "");
  const [areaName, setAreaName] = useState(pickup.areaName || "");
  const [locationName, setLocationName] = useState(pickup.locationName || "");
  const [instructions, setInstructions] = useState(pickup.instructions || "");
  const [lat, setLat] = useState(baseLat);
  const [lng, setLng] = useState(baseLng);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const pointOptions = (useAreas ? configAreas : configLocations).filter(
    (p) => p && (p.name || p.address)
  );
  const currentPoint = (useAreas ? areaName : locationName) || "";
  const currentPointMissing =
    !!currentPoint && !pointOptions.some((p) => (p.name || p.address) === currentPoint);
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const firstInput = dialogRef.current?.querySelector("input, textarea, select");
    if (firstInput) firstInput.focus();
    return () => previousFocus.current?.focus();
  }, []);

  const markDirty = useCallback(() => setIsDirty(true), []);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") {
        if (isDirty) {
          if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDirty, onClose]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        if (isDirty) {
          if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    },
    [isDirty, onClose]
  );

  const handleSave = async () => {
    if (!booking) return;
    setSaving(true);
    try {
      const payload = {};
      if (pickupTime !== pickup.time) payload.pickupTime = pickupTime;
      if (pickupPlace !== pickup.place) payload.pickupPlace = pickupPlace;
      if (instructions !== pickup.instructions) payload.instructions = instructions;
      if (!coordsEqual(lat, baseLat)) payload.lat = lat != null ? Number(lat) : null;
      if (!coordsEqual(lng, baseLng)) payload.lng = lng != null ? Number(lng) : null;
      if (areaName !== (pickup.areaName || "")) payload.areaName = areaName;
      if (locationName !== (pickup.locationName || "")) payload.locationName = locationName;

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      await updateBookingPickup(booking.id, payload);
      toast.success("Pickup details saved. The customer has been notified.");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to save pickup details");
    } finally {
      setSaving(false);
    }
  };

  const handleConfigPointChange = (value) => {
    markDirty();
    if (useAreas) {
      setAreaName(value);
      setLocationName("");
      const area = configAreas.find((a) => a?.name === value);
      if (area && area.lat != null && area.lng != null) {
        setLat(Number(area.lat));
        setLng(Number(area.lng));
      }
    } else {
      setLocationName(value);
      setAreaName("");
      const loc = configLocations.find((l) => l?.name === value);
      if (loc && loc.lat != null && loc.lng != null) {
        setLat(Number(loc.lat));
        setLng(Number(loc.lng));
      }
    }
  };

  const handleLocationSelect = useCallback(
    (result) => {
      markDirty();
      if (!result) {
        setLat(null);
        setLng(null);
        return;
      }
      setLat(result.latitude || null);
      setLng(result.longitude || null);
      if (result.formatted && !pickupPlace) {
        const parts = result.formatted.split(",");
        setPickupPlace(parts[0]?.trim() || result.formatted);
      }
    },
    [pickupPlace, markDirty]
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-pickup-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl w-full max-w-[580px] max-h-[90vh] overflow-auto shadow-xl"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 id="edit-pickup-title" className="text-lg font-bold text-slate-900">
                Edit pickup
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {booking?.tourName} — {booking?.bookingNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            {storedLocationLabel && (
              <div
                className={`rounded-lg border px-3.5 py-3 ${
                  confirmedBySupplier
                    ? "bg-emerald-50/50 border-emerald-200/50"
                    : "bg-amber-50/60 border-amber-200/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`p-1.5 rounded-md border shrink-0 ${
                      confirmedBySupplier
                        ? "bg-white border-emerald-200/60"
                        : "bg-white border-amber-200/60"
                    }`}
                  >
                    <MapPinned
                      size={14}
                      className={confirmedBySupplier ? "text-emerald-600" : "text-amber-600"}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {storedLocationSource}
                      {!confirmedBySupplier && (
                        <span className="text-amber-600"> · set by customer</span>
                      )}
                    </p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5 break-words">
                      {storedLocationLabel}
                    </p>
                    {!confirmedBySupplier && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Confirm the pickup below and save — the customer is notified.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Pickup time
              </label>
              <AmPmTimePicker
                value={pickupTime}
                onChange={(v) => { setPickupTime(v); markDirty(); }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Pickup place <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-emerald-100/60 bg-emerald-50/30 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] focus:bg-white resize-vertical transition-all"
                rows={2}
                value={pickupPlace}
                onChange={(e) => { setPickupPlace(e.target.value); markDirty(); }}
                placeholder="e.g. Main entrance, Marriott Hotel"
              />
            </div>

            {(pointOptions.length > 0 || currentPointMissing) && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Pickup point{" "}
                  <span className="font-normal text-slate-400">
                    (choose from the supplier&rsquo;s configured {useAreas ? "zones" : "points"})
                  </span>
                </label>
                <select
                  value={currentPoint}
                  onChange={(e) => handleConfigPointChange(e.target.value)}
                  className="w-full rounded-lg border border-emerald-100/60 bg-emerald-50/30 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] focus:bg-white transition-all"
                >
                  <option value="">Custom / not listed</option>
                  {currentPointMissing && <option value={currentPoint}>{currentPoint}</option>}
                  {pointOptions.map((p) => (
                    <option key={p.name || p.address} value={p.name || p.address}>
                      {p.name || p.address}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Pickup location <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <LocationMapPicker
                onSelect={handleLocationSelect}
                initialLat={lat}
                initialLng={lng}
                label="Pickup location"
                placeholder="Search for pickup address..."
              />
              {lat && lng && (
                <p className="text-[10px] text-slate-400 mt-1.5 font-mono">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Instructions for the customer{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-emerald-100/60 bg-emerald-50/30 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] focus:bg-white resize-vertical transition-all"
                rows={3}
                value={instructions}
                onChange={(e) => { setInstructions(e.target.value); markDirty(); }}
                placeholder="e.g. Look for the blue van with our logo at the south entrance"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                The customer receives an email with the updated details.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-emerald-100/40">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#044b3b] rounded-lg hover:bg-[#033629] shadow-sm transition-all disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Save & notify customer
          </button>
        </div>
      </div>
    </div>
  );
}
