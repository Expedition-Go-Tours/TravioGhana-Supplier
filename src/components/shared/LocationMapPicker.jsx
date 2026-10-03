import { useState, useRef, useEffect } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibreWorker";
import { MapPin, Loader2, AlertTriangle, CheckCircle2, X, ChevronDown } from "lucide-react";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";
import { parseCoordinateInput } from "@/lib/coordinates";
import { isShortGoogleMapsLink, parseGoogleMapsLocation } from "@/lib/googleMaps";
import { reverseGeocode } from "@/lib/reverseGeocode";
import { DEFAULT_CENTER, TILE_STYLE, warmMapResources } from "@/lib/mapConfig";

const SHORT_LINK_MESSAGE =
  "Short Google links can't be read here. Open the link, then copy the full URL or long-press the pin and paste its coordinates (e.g. 5.6037, -0.1870).";
const INVALID_LINK_MESSAGE = "Paste a Google Maps link or coordinates like 5.6037, -0.1870.";

function SelectedLocationCard({ result, onClear }) {
  if (!result) return null;
  const parts = result.formatted.split(",");
  const name = parts[0]?.trim() || result.formatted;
  const rest = parts.slice(1).join(",").trim();

  return (
    <div className="flex items-start gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
        <CheckCircle2 size={18} className="text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-emerald-900 truncate">{name}</p>
        {rest && (
          <p className="text-xs text-emerald-700/70 truncate mt-0.5">{rest}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] font-mono text-emerald-600/60">
            {result.latitude?.toFixed(5)}, {result.longitude?.toFixed(5)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="p-1.5 text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors shrink-0"
        title="Clear selection"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function LocationMapPicker({
  onSelect,
  initialLat,
  initialLng,
  initialFormatted,
  label,
  placeholder,
  allowManualCoordinates = false,
}) {
  const [lat, setLat] = useState(initialLat ?? null);
  const [lng, setLng] = useState(initialLng ?? null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedResult, setSelectedResult] = useState(() =>
    initialFormatted
      ? {
          formatted: initialFormatted,
          city: "",
          country: "",
          region: "",
          latitude: initialLat ?? null,
          longitude: initialLng ?? null,
        }
      : null,
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualLink, setManualLink] = useState("");
  const [manualLat, setManualLat] = useState(initialLat != null ? String(initialLat) : "");
  const [manualLng, setManualLng] = useState(initialLng != null ? String(initialLng) : "");
  const [manualError, setManualError] = useState("");
  const autocompleteRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const resolveRef = useRef(null);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    warmMapResources();
    const { lng: initLng, lat: initLat } = DEFAULT_CENTER;

    const center = initialLat && initialLng ? [initialLng, initialLat] : [initLng, initLat];
    let map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: TILE_STYLE,
        center,
        zoom: initialLat && initialLng ? 15 : 6,
        localIdeographFontFamily: "sans-serif",
      });
    } catch {
      window.setTimeout(() => setMapError(true), 0);
      return;
    }

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => setMapReady(true));
    map.on("error", () => setMapError(true));

    map.on("click", (e) => {
      const clickLat = e.lngLat.lat;
      const clickLng = e.lngLat.lng;
      updateMarker(map, clickLng, clickLat);
      autocompleteRef.current?.reset();
      resolveRef.current?.(clickLat, clickLng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateMarker(map, markerLng, markerLat) {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (markerLat != null && markerLng != null) {
      const el = document.createElement("div");
      el.className = "maplibregl-marker";
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-3 bg-emerald-400/20 rounded-full animate-ping" style="animation-duration: 2s;"></div>
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#047857"/>
            <circle cx="16" cy="16" r="6" fill="white" stroke="#047857" stroke-width="2"/>
          </svg>
        </div>
      `;
      el.style.cursor = "pointer";
      markerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([markerLng, markerLat])
        .addTo(map);
    }
  }

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (lat != null && lng != null) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 });
    }
    updateMarker(mapRef.current, lng, lat);
  }, [lat, lng, mapReady]);

  /**
   * Drop the pin at the given coordinates and reverse-geocode them for the
   * address parts. The coordinates passed in always win over the reverse
   * response, so a response without lat/lng can never blank a pin.
   */
  const emitResolved = async (nextLat, nextLng, preferredName = "") => {
    setLat(nextLat);
    setLng(nextLng);
    if (allowManualCoordinates) {
      setManualLat(String(nextLat));
      setManualLng(String(nextLng));
      setManualError("");
    }

    const reverse = await reverseGeocode(nextLat, nextLng);
    const name = preferredName.trim();
    const result = {
      formatted: name || reverse?.formatted || `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`,
      city: reverse?.city || "",
      country: reverse?.country || "",
      region: reverse?.region || "",
      latitude: nextLat,
      longitude: nextLng,
    };
    setSelectedResult(result);
    onSelectRef.current?.(result);
  };
  resolveRef.current = emitResolved;

  const handleLocationSelect = (result) => {
    const outLat = result.latitude;
    const outLng = result.longitude;
    setLat(outLat);
    setLng(outLng);
    if (allowManualCoordinates) {
      setManualLat(outLat != null ? String(outLat) : "");
      setManualLng(outLng != null ? String(outLng) : "");
      setManualError("");
    }
    setSelectedResult(result);
    onSelect?.(result);
  };

  const handleClear = () => {
    setLat(null);
    setLng(null);
    setSelectedResult(null);
    setManualName("");
    setManualLink("");
    setManualLat("");
    setManualLng("");
    setManualError("");
    autocompleteRef.current?.reset();
    onSelect?.(null);
  };

  /** "Add '…' as a custom location" from the no-results state. */
  const handleAddCustom = (name) => {
    setManualOpen(true);
    setManualName(name);
    setManualError("");
  };

  /** Fill the coordinate fields from a pasted Google Maps link or raw pair. */
  const handleManualLinkChange = (value) => {
    setManualLink(value);
    setManualError("");
    const parsed = parseGoogleMapsLocation(value);
    if (parsed) {
      setManualLat(String(parsed.lat));
      setManualLng(String(parsed.lng));
      if (parsed.name && !manualName.trim()) setManualName(parsed.name);
    } else if (isShortGoogleMapsLink(value)) {
      setManualError(SHORT_LINK_MESSAGE);
    }
  };

  const handleApplyManual = async () => {
    const parsed = parseCoordinateInput(manualLat, manualLng);
    if (!parsed) {
      if (isShortGoogleMapsLink(manualLink)) setManualError(SHORT_LINK_MESSAGE);
      else if (manualLink.trim()) setManualError(INVALID_LINK_MESSAGE);
      else {
        setManualError(
          "Enter a latitude between -90 and 90 and a longitude between -180 and 180.",
        );
      }
      return;
    }
    setManualError("");
    await emitResolved(parsed.lat, parsed.lng, manualName);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-emerald-600" />
            {label || "Search Location"}
          </span>
        </label>
        <LocationAutocomplete
          ref={autocompleteRef}
          onSelect={handleLocationSelect}
          onAddCustom={handleAddCustom}
          hideLabel
          hideAttribution
          mode="inline"
          placeholder={placeholder || "Search for a location..."}
        />
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm relative">
        <div ref={mapContainerRef} className="w-full h-[300px]" />
        {!mapReady && !mapError && (
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center gap-2.5 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-emerald-600" />
            Loading map...
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center gap-2.5 px-4 text-center">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm font-medium text-red-600">Could not load map tiles</p>
            <p className="text-xs text-red-400">Check your internet connection and try again.</p>
          </div>
        )}
        <div className="px-4 py-2.5 text-xs text-slate-500 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
          <MapPin size={12} className="text-emerald-500" />
          Click on the map to set a location
        </div>
      </div>

      <SelectedLocationCard result={selectedResult} onClear={handleClear} />

      {lat && lng && !selectedResult && (
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
          <span>Lat: {lat.toFixed(6)}</span>
          <span>Lng: {lng.toFixed(6)}</span>
        </div>
      )}

      {allowManualCoordinates && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setManualOpen((open) => !open)}
            aria-expanded={manualOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <MapPin size={14} className="text-slate-400" />
              Can&apos;t find your location? Enter it manually
            </span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform ${manualOpen ? "rotate-180" : ""}`}
            />
          </button>
          {manualOpen && (
            <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
              <p className="text-xs leading-relaxed text-slate-400">
                Found it on Google Maps? Paste the link and its coordinates are captured and pinned
                automatically. You can also type the name and coordinates yourself.
              </p>
              <input
                type="text"
                aria-label="Google Maps link"
                value={manualLink}
                onChange={(event) => handleManualLinkChange(event.target.value)}
                placeholder="Paste a Google Maps link or 5.6037, -0.1870"
                className="w-full h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <input
                type="text"
                aria-label="Location name"
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                placeholder="e.g. Labone, Accra"
                className="w-full h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Latitude"
                  value={manualLat}
                  onChange={(event) => setManualLat(event.target.value)}
                  placeholder="Latitude, e.g. 5.6037"
                  className="w-full h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Longitude"
                  value={manualLng}
                  onChange={(event) => setManualLng(event.target.value)}
                  placeholder="Longitude, e.g. -0.1870"
                  className="w-full h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              {manualError && <p className="text-xs font-medium text-red-600">{manualError}</p>}
              <button
                type="button"
                onClick={handleApplyManual}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <MapPin size={14} />
                Place pin
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
