import { useState, useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import config from "@/config";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";
import { DEFAULT_CENTER, TILE_STYLE, warmMapResources } from "@/lib/mapConfig";

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

export default function LocationMapPicker({ onSelect, initialLat, initialLng, label, placeholder }) {
  const [lat, setLat] = useState(initialLat ?? null);
  const [lng, setLng] = useState(initialLng ?? null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const autocompleteRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const apiBaseRef = useRef(config.api.baseURL);
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

    map.on("click", async (e) => {
      const clickLng = e.lngLat.lng;
      const clickLat = e.lngLat.lat;
      setLat(clickLat);
      setLng(clickLng);
      updateMarker(map, clickLng, clickLat);
      autocompleteRef.current?.reset();

      try {
        const res = await fetch(`${apiBaseRef.current}/locations/reverse?lat=${clickLat}&lng=${clickLng}`);
        const body = await res.json();
        const data = body?.data?.results?.[0];
        if (data) {
          const normalized = {
            formatted: data.formatted || "",
            city: data.city || "",
            country: data.country || "",
            region: data.region || "",
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
          };
          setSelectedResult(normalized);
          onSelectRef.current?.(normalized);
        }
      } catch {
        const fallback = { formatted: `${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}`, city: "", country: "", region: "", latitude: clickLat, longitude: clickLng };
        setSelectedResult(fallback);
        onSelectRef.current?.(fallback);
      }
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

  const handleLocationSelect = (result) => {
    const outLat = result.latitude;
    const outLng = result.longitude;
    setLat(outLat);
    setLng(outLng);
    setSelectedResult(result);
    onSelect?.(result);
  };

  const handleClear = () => {
    setLat(null);
    setLng(null);
    setSelectedResult(null);
    autocompleteRef.current?.reset();
    onSelect?.(null);
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
    </div>
  );
}
