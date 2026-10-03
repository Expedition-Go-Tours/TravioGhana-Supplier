import { useState } from "react";
import { ChevronLeft, Info, MapPin, X } from "lucide-react";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";
import { isShortGoogleMapsLink, parseGoogleMapsLocation } from "@/lib/googleMaps";
import { reverseGeocode } from "@/lib/reverseGeocode";
import StaysButton from "../components/StaysButton";
import PropertyLocationMap from "../components/PropertyLocationMap";
import { StaysField, StaysInput, StaysSelect } from "../components/StaysForm";

const SHORT_LINK_MESSAGE =
  "Short Google links can't be read here. Open the link, then copy the full URL from your browser — or long-press the pin in Google Maps and paste the coordinates (e.g. 5.6037, -0.1870).";
const INVALID_LINK_MESSAGE = "Paste a Google Maps link or coordinates like 5.6037, -0.1870.";

/**
 * STEP 1 — Location, the immersive MapLibre screen: an edge-to-edge map with
 * the red draggable pin and a floating address card (Geoapify-backed search,
 * apartment/floor, country/region, city, post code) plus the Google Maps
 * fallback and the pin-instructions notice from the reference.
 *
 * The step is `fullBleed` in the step model, so it owns the builder's content
 * area and its own Back/Continue controls; every field patches the draft
 * directly through the builder's `patch`.
 */
export default function Step01Location({ property, patch, onBack, onNext }) {
  const [updateAddressOnPinMove, setUpdateAddressOnPinMove] = useState(true);
  const [showNotice, setShowNotice] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLink, setManualLink] = useState("");
  const [manualError, setManualError] = useState("");
  const [errors, setErrors] = useState({});
  const [focusSignal, setFocusSignal] = useState(0);

  /**
   * Drop the pin and, unless the supplier turned the checkbox off, let the
   * reverse lookup fill the address text. The coordinates are always the ones
   * that were clicked/pasted, never the reverse response's.
   */
  const resolvePin = async (nextLat, nextLng, { forceAddress = false, fallbackName = "" } = {}) => {
    patch({ lat: nextLat, lng: nextLng });
    if (!forceAddress && !updateAddressOnPinMove) return;

    const resolved = await reverseGeocode(nextLat, nextLng);
    if (resolved) {
      patch({
        address: resolved.formatted || fallbackName || property.address,
        city: resolved.city || property.city,
        region: resolved.region || property.region,
        country: resolved.country || property.country,
        mapAddress: resolved.formatted || fallbackName || property.mapAddress,
      });
    } else if (fallbackName) {
      patch({ address: fallbackName, mapAddress: fallbackName });
    }
    setErrors((current) => ({ ...current, address: undefined, pin: undefined }));
  };

  const handleAddressSelect = (result) => {
    if (!result) return;
    patch({
      address: result.formatted || property.address,
      city: result.city || property.city,
      region: result.region || property.region,
      country: result.country || property.country,
      lat: result.latitude,
      lng: result.longitude,
      mapAddress: result.formatted || property.mapAddress,
    });
    setErrors((current) => ({ ...current, address: undefined, pin: undefined }));
    setFocusSignal((value) => value + 1);
  };

  const handleApplyManualLink = async () => {
    const parsed = parseGoogleMapsLocation(manualLink);
    if (!parsed) {
      setManualError(isShortGoogleMapsLink(manualLink) ? SHORT_LINK_MESSAGE : INVALID_LINK_MESSAGE);
      return;
    }
    setManualError("");
    setManualLink("");
    setManualOpen(false);
    setFocusSignal((value) => value + 1);
    await resolvePin(parsed.lat, parsed.lng, { forceAddress: true, fallbackName: parsed.name });
  };

  const handleContinue = () => {
    const nextErrors = {};
    if (!property.address?.trim()) nextErrors.address = "Add your property's address";
    if (!property.city?.trim()) nextErrors.city = "Add the city or town";
    if (property.lat == null || property.lng == null) {
      nextErrors.pin = "Place the pin on the map to continue";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onNext?.();
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-100 lg:block">
      <div className="relative h-[38%] min-h-[180px] shrink-0 lg:absolute lg:inset-0 lg:h-auto lg:min-h-0">
        <PropertyLocationMap
          lat={property.lat}
          lng={property.lng}
          focusSignal={focusSignal}
          onPinMove={resolvePin}
        />
      </div>

      <h1 className="pointer-events-none absolute left-4 top-4 z-10 text-2xl font-bold text-slate-800 drop-shadow-sm lg:left-6 lg:text-[30px]">
        Where is your property?
      </h1>

      <div className="z-10 flex min-h-0 flex-1 flex-col bg-white lg:absolute lg:bottom-4 lg:left-6 lg:top-20 lg:w-[460px] lg:gap-3 lg:bg-transparent">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white/95 lg:p-5 lg:shadow-lg lg:backdrop-blur-sm">
          <div>
            <LocationAutocomplete
              label="Find your address"
              hideAttribution
              mode="inline"
              placeholder="Roman Ridge"
              value={property.address || ""}
              onChange={(value) => patch({ address: value })}
              onSelect={handleAddressSelect}
            />
            {errors.address && (
              <p className="mt-1 text-xs font-medium text-red-600">{errors.address}</p>
            )}
          </div>

          <StaysField label="Apartment or floor number (optional)">
            <StaysInput
              value={property.apartment || ""}
              onChange={(event) => patch({ apartment: event.target.value })}
              placeholder="Apartment, building, floor, etc"
            />
          </StaysField>

          <StaysField label="Country/region">
            <StaysSelect
              options={["Ghana"]}
              value={property.country || "Ghana"}
              onChange={(event) => patch({ country: event.target.value })}
            />
          </StaysField>

          <div className="grid grid-cols-2 gap-3">
            <StaysField label="City">
              <StaysInput
                value={property.city || ""}
                onChange={(event) => patch({ city: event.target.value })}
                placeholder="Accra"
              />
            </StaysField>
            <StaysField label="Post code / Zip code">
              <StaysInput
                value={property.postcode || ""}
                onChange={(event) => patch({ postcode: event.target.value })}
                placeholder="00233"
              />
            </StaysField>
          </div>
          {errors.city && (
            <p className="-mt-2 text-xs font-medium text-red-600">{errors.city}</p>
          )}

          <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={updateAddressOnPinMove}
              onChange={(event) => setUpdateAddressOnPinMove(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            Update the address when moving the pin on the map.
          </label>

          {showNotice && (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="flex-1 text-xs leading-relaxed text-slate-500">
                Is the red pin location incorrect? Then uncheck the option above and click or press
                on the map to move the pin to the right location.
              </p>
              <button
                type="button"
                onClick={() => setShowNotice(false)}
                aria-label="Dismiss pin tip"
                className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setManualOpen((open) => !open)}
              className="text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
            >
              Can&apos;t find your address? Paste a Google Maps link
            </button>
            {manualOpen && (
              <div className="mt-2.5 space-y-2.5">
                <StaysInput
                  aria-label="Google Maps link"
                  value={manualLink}
                  onChange={(event) => {
                    setManualLink(event.target.value);
                    setManualError("");
                  }}
                  placeholder="https://maps.google.com/... or 5.6037, -0.1870"
                />
                {manualError && (
                  <p className="text-xs font-medium leading-relaxed text-red-600">{manualError}</p>
                )}
                <StaysButton size="small" onClick={handleApplyManualLink}>
                  Place pin
                </StaysButton>
              </div>
            )}
          </div>

          {errors.pin && <p className="text-xs font-medium text-red-600">{errors.pin}</p>}

          {property.lat != null && property.lng != null && (
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
              <MapPin size={12} className="text-red-500" />
              {Number(property.lat).toFixed(5)}, {Number(property.lng).toFixed(5)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white p-3 lg:border-0 lg:bg-transparent lg:p-0">
          {onBack && (
            <StaysButton aria-label="Back" onClick={onBack} className="h-14 w-14 shrink-0 p-0">
              <ChevronLeft size={20} />
            </StaysButton>
          )}
          <StaysButton variant="primary" className="h-14 flex-1 text-base" onClick={handleContinue}>
            Continue
          </StaysButton>
        </div>
      </div>
    </div>
  );
}
