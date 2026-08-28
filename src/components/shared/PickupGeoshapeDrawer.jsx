import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { X, Loader2, AlertTriangle, HelpCircle, ChevronDown, MapPin } from "lucide-react";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";
import config from "@/config";
import { DEFAULT_CENTER, TILE_STYLE, warmMapResources } from "@/lib/mapConfig";

const CIRCLE_FILL = "rgba(229, 57, 53, 0.20)";
const CIRCLE_LINE = "rgba(229, 57, 53, 0.35)";
const MARKER_COLOR = "#E33935";

function emptyFeature() {
  return { type: "FeatureCollection", features: [] };
}


/**
 * Generate a GeoJSON polygon approximating a circle of given radius in km
 * centered at (lat, lng). Uses 64 vertices for smooth rendering at all zooms.
 */
function circleFeature(lat, lng, radiusKm, nPoints = 32) {
  if (lat == null || lng == null || !radiusKm) return emptyFeature();
  const coords = [];
  const R = 6371;
  const d = radiusKm / R;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  for (let i = 0; i <= nPoints; i++) {
    const bearing = (i / nPoints) * 2 * Math.PI;
    const sinLat =
      Math.sin(latRad) * Math.cos(d) +
      Math.cos(latRad) * Math.sin(d) * Math.cos(bearing);
    const lat2 = Math.asin(sinLat);
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * sinLat
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  coords.push(coords[0]);

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

/**
 * Derive an approximate radius in km from a legacy polygon by computing the
 * max distance from centroid to any vertex. Used for backward compatibility
 * with products saved before the radius-based model.
 */
export function polygonToRadiusKm(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return 1;
  const centroid = polygon.reduce(
    (acc, [lat, lng]) => [acc[0] + lat / polygon.length, acc[1] + lng / polygon.length],
    [0, 0]
  );
  const toRad = (deg) => (deg * Math.PI) / 180;
  const haversineKm = ([lat1, lng1], [lat2, lng2]) => {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const maxDist = Math.max(...polygon.map(([lat, lng]) => haversineKm(centroid, [lat, lng])));
  return Math.round(maxDist * 10) / 10;
}

export default function PickupAreaModal({
  open = true,
  title = "Add pickup area",
  initialLocation,
  initialRadiusKm = 1,
  onSave,
  onCancel,
}) {
  const [location, setLocation] = useState(
    () => (initialLocation && initialLocation.lat != null ? { ...initialLocation } : null)
  );
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm || 1);
  const [radiusInput, setRadiusInput] = useState(String(initialRadiusKm || 1));
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRafRef = useRef(null);
  const boundsRafRef = useRef(null);
  const mapReadyRef = useRef(false);
  const failTimerRef = useRef(null);
  const openRef = useRef(open);
  const locationRef = useRef(location);
  const radiusRef = useRef(radiusKm);

  useEffect(() => {
    openRef.current = open;
    locationRef.current = location;
    radiusRef.current = radiusKm;
  });

  // Re-initialize from props each time the modal opens (keep-alive pattern).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setLocation(initialLocation && initialLocation.lat != null ? { ...initialLocation } : null);
    setRadiusKm(initialRadiusKm || 1);
    setRadiusInput(String(initialRadiusKm || 1));
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Lazy-create the map on first open. Keep-alive across subsequent opens.
  useEffect(() => {
    if (!open || mapRef.current) return;

    // Wait for the browser to paint the modal with correct dimensions
    // before creating the map — the hidden→visible transition means
    // the container might be 0x0 in the same microtask.
    const raf = requestAnimationFrame(() => {
      let map;
      try {
        const camera =
          initialLocation?.lat != null
            ? { center: [initialLocation.lng, initialLocation.lat], zoom: 12 }
            : { center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat], zoom: 6 };
        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: TILE_STYLE,
          ...camera,
          localIdeographFontFamily: "sans-serif",
        });
      } catch {
        window.setTimeout(() => setMapError(true), 0);
        return;
      }

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        if (failTimerRef.current != null) {
          window.clearTimeout(failTimerRef.current);
          failTimerRef.current = null;
        }
        mapReadyRef.current = true;
        setMapReady(true);
        setTilesLoading(true);
        map.doubleClickZoom.disable();
        map.resize();

        // Radius circle layer
        map.addSource("pa-circle", { type: "geojson", data: emptyFeature() });
        map.addLayer({
          id: "pa-circle-fill",
          type: "fill",
          source: "pa-circle",
          paint: { "fill-color": CIRCLE_FILL },
        });
        map.addLayer({
          id: "pa-circle-line",
          type: "line",
          source: "pa-circle",
          paint: { "line-color": CIRCLE_LINE, "line-width": 2 },
        });

        // Location marker (managed as a Marker instance, not a source/layer)
      });

      map.on("error", () => {
        if (!mapReadyRef.current && failTimerRef.current == null) {
          failTimerRef.current = window.setTimeout(() => setMapError(true), 8000);
        }
      });

      map.on("idle", () => setTilesLoading(false));

      mapRef.current = map;
    });

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reframe camera on reopen.
  useEffect(() => {
    const map = mapRef.current;
    if (!open || !map || !mapReadyRef.current) return;
    map.resize();
    const loc = locationRef.current;
    if (loc?.lat != null) {
      map.jumpTo({ center: [loc.lng, loc.lat], zoom: 12 });
    } else {
      map.jumpTo({ center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat], zoom: 6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pause render loop while hidden.
  useEffect(() => {
    if (open) return;
    const map = mapRef.current;
    if (map) map.stop();
  }, [open]);

  // Unmount-only cleanup.
  useEffect(() => {
    warmMapResources();
    return () => {
      if (failTimerRef.current != null) {
        window.clearTimeout(failTimerRef.current);
        failTimerRef.current = null;
      }
      if (circleRafRef.current != null) {
        cancelAnimationFrame(circleRafRef.current);
        circleRafRef.current = null;
      }
      if (boundsRafRef.current != null) {
        cancelAnimationFrame(boundsRafRef.current);
        boundsRafRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      const map = mapRef.current;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
      mapReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update circle data when location or radius changes (coalesced via rAF).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Cancel any pending circle update, schedule the latest value.
    if (circleRafRef.current != null) {
      cancelAnimationFrame(circleRafRef.current);
    }
    circleRafRef.current = requestAnimationFrame(() => {
      circleRafRef.current = null;
      const src = map.getSource("pa-circle");
      if (src) {
        src.setData(location ? circleFeature(location.lat, location.lng, radiusKm) : emptyFeature());
      }
    });

    // Marker management (cheap, runs immediately). Only show when radius > 0.
    if (location && radiusKm > 0) {
      if (!markerRef.current) {
        const el = document.createElement("div");
        el.innerHTML = `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${MARKER_COLOR}"/>
          <circle cx="14" cy="14" r="6" fill="#ffffff"/>
        </svg>`;
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom", draggable: true })
          .setLngLat([location.lng, location.lat])
          .addTo(map);

        // Real-time circle tracking during drag (direct MapLibre, no React lag).
        marker.on("drag", () => {
          const lngLat = marker.getLngLat();
          const src = map.getSource("pa-circle");
          if (src) {
            src.setData(circleFeature(lngLat.lat, lngLat.lng, radiusRef.current));
          }
        });

        // On dragend: sync React state + reverse geocode for address.
        marker.on("dragend", async () => {
          const lngLat = marker.getLngLat();
          const newLat = Number(lngLat.lat.toFixed(6));
          const newLng = Number(lngLat.lng.toFixed(6));
          setLocation((prev) => ({
            ...prev,
            lat: newLat,
            lng: newLng,
          }));
          const address = await reverseGeocode(newLat, newLng);
          if (address) {
            setLocation((prev) => ({
              ...prev,
              name: address.split(",").slice(0, 2).join(",").trim(),
              address,
            }));
          }
        });

        markerRef.current = marker;
      } else {
        markerRef.current.setLngLat([location.lng, location.lat]);
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    return () => {
      if (circleRafRef.current != null) {
        cancelAnimationFrame(circleRafRef.current);
        circleRafRef.current = null;
      }
    };
  }, [location, radiusKm, mapReady]);

  // Fit map to circle bounds when location or radius changes (coalesced via rAF).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !location || !radiusKm) return;

    if (boundsRafRef.current != null) {
      cancelAnimationFrame(boundsRafRef.current);
    }
    boundsRafRef.current = requestAnimationFrame(() => {
      boundsRafRef.current = null;
      const circle = circleFeature(location.lat, location.lng, radiusKm);
      const coords = circle.geometry?.coordinates?.[0];
      if (coords && coords.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 300 });
        }
      }
    });

    return () => {
      if (boundsRafRef.current != null) {
        cancelAnimationFrame(boundsRafRef.current);
        boundsRafRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, radiusKm, mapReady]);

  const handleLocationSelect = useCallback(
    (result) => {
      if (!result?.latitude || !result?.longitude) return;
      const loc = {
        name: (result.formatted || "").split(",").slice(0, 2).join(",").trim(),
        address: result.formatted || "",
        lat: result.latitude,
        lng: result.longitude,
      };
      setLocation(loc);
    },
    []
  );

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `${config.api.baseURL}/locations/reverse?lat=${lat}&lng=${lng}`
      );
      if (!res.ok) return null;
      const body = await res.json();
      const result = body?.data?.results?.[0];
      return result?.formatted || result?.name || null;
    } catch {
      return null;
    }
  }, []);

  const handleRadiusInputChange = useCallback((e) => {
    const raw = e.target.value;
    setRadiusInput(raw);
    // Parse immediately so spinner buttons update the circle without requiring blur.
    const val = parseFloat(raw);
    if (!isNaN(val)) {
      setRadiusKm(Math.min(Math.max(val, 0.5), 100));
    }
  }, []);

  const handleRadiusBlur = useCallback(() => {
    const val = parseFloat(radiusInput);
    if (isNaN(val) || val < 0.5) {
      setRadiusKm(0.5);
      setRadiusInput("0.5");
    } else if (val > 100) {
      setRadiusKm(100);
      setRadiusInput("100");
    } else {
      setRadiusKm(val);
      setRadiusInput(String(val));
    }
  }, [radiusInput]);

  const handleSave = useCallback(() => {
    if (!location) return;
    const areaName =
      location.name ||
      location.address?.split(",").slice(0, 2).join(",").trim() ||
      "Pickup area";
    onSave?.({
      name: areaName,
      address: location.address || "",
      lat: Number(location.lat.toFixed(6)),
      lng: Number(location.lng.toFixed(6)),
      radiusKm,
    });
  }, [location, radiusKm, onSave]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      if (!openRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4${open ? "" : " hidden"}`}
    >
      <div className="bg-white rounded-xl w-full max-w-[760px] max-h-[92vh] overflow-auto shadow-2xl">
        {/* Close button */}
        <div className="flex justify-end px-5 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1A1A1A]">
                {title === "Edit pickup area"
                  ? "Edit the pickup area"
                  : "Define the general area you pick up from"}
              </h2>
              <HelpCircle className="w-[18px] h-[18px] text-[#888] shrink-0" />
            </div>
            <span className="text-[15px] font-semibold text-[#1A1A1A]">Radius</span>
          </div>

          {/* Input row: search + radius */}
          <div className="flex items-start gap-3">
            <div className="flex-[3] min-w-0">
              <LocationAutocomplete
                hideLabel
                placeholder="Search for a location..."
                minChars={2}
                clearOnSelect
                onSelect={handleLocationSelect}
              />
            </div>
            <div>
              <div className={`flex items-center border rounded h-11 ${(!radiusKm || radiusKm <= 0) ? 'border-red-400' : 'border-[#CCCCCC]'}`}>
                <input
                  type="number"
                  min={0.5}
                  max={100}
                  step={0.5}
                  value={radiusInput}
                  onChange={handleRadiusInputChange}
                  onBlur={handleRadiusBlur}
                  className="w-[50px] h-full px-2 text-sm text-center border-none outline-none bg-transparent text-[#333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="w-px h-6 bg-[#CCCCCC] shrink-0" />
                <div className="flex-1 flex items-center justify-between px-2 text-sm text-[#333] select-none">
                  <span>km</span>
                  <ChevronDown className="w-3 h-3 text-[#666] shrink-0" />
                </div>
              </div>
              {(!radiusKm || radiusKm <= 0) && (
                <p className="text-xs text-red-500 mt-1">Radius is required</p>
              )}
            </div>
          </div>

          {/* Location name bar */}
          {location && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
              <MapPin className="w-4 h-4 text-[#00838F] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{location.name || location.address || "Selected location"}</p>
                {location.address && location.name !== location.address && (
                  <p className="text-xs text-slate-500 truncate">{location.address}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocation(null);
                  if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
                }}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Map */}
          <div className="mt-4 rounded-lg overflow-hidden relative">
            <div ref={mapContainerRef} className="w-full h-[400px]" />
            {mapReady && tilesLoading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white shadow-sm pointer-events-none">
                <Loader2 size={12} className="animate-spin" />
                Loading tiles...
              </div>
            )}
            {!mapReady && !mapError && (
              <div className="absolute inset-0 bg-slate-50 flex items-center justify-center gap-2.5 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin text-[#00838F]" />
                Loading map...
              </div>
            )}
            {mapError && (
              <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <AlertTriangle size={28} className="text-red-400" />
                <p className="text-sm font-medium text-red-600">Could not load map tiles</p>
                <p className="text-xs text-red-400">
                  Check your internet connection and try again.
                </p>
              </div>
            )}
          </div>

          {/* Hint */}
          {location && radiusKm > 0 && (
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0" />
              Drag the pin to adjust the pickup location
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#333] hover:text-[#1A1A1A] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!location}
            className={`px-5 py-2.5 text-sm font-medium rounded transition-colors ${
              location
                ? "bg-[#00838F] text-white hover:bg-[#006970]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            Save area
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only radius-circle preview for product detail pages. Renders one or
 * more pickup areas as red semi-transparent circles on a MapLibre map.
 */
export function PickupGeoshapePreview({ areas = [], height = 260, className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);
  const failTimerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const mappableAreas = useMemo(
    () => areas.filter((a) => a && a.lat != null && a.lng != null),
    [areas]
  );

  // Stable key from area data so the effect only re-runs when actual data changes,
  // not when the parent passes a new array reference on re-render.
  const areasKey = useMemo(
    () => mappableAreas.map((a) => `${a.lat},${a.lng},${a.radiusKm || ""}`).join("|"),
    [mappableAreas]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current || mappableAreas.length === 0) return;

    const features = mappableAreas.map((a) => {
      const r = a.radiusKm || (Array.isArray(a.polygon) ? polygonToRadiusKm(a.polygon) : 1);
      return circleFeature(a.lat, a.lng, r);
    });

    let map;
    try {
      const bounds = new maplibregl.LngLatBounds();
      features.forEach((f) => {
        f.geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend([lng, lat]));
      });
      const opts = {
        container: containerRef.current,
        style: TILE_STYLE,
        localIdeographFontFamily: "sans-serif",
      };
      if (!bounds.isEmpty()) {
        opts.bounds = bounds;
        opts.fitBoundsOptions = { padding: 40, maxZoom: 14.5, duration: 0 };
      } else {
        opts.center = [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];
        opts.zoom = 11;
      }
      map = new maplibregl.Map(opts);
    } catch {
      window.setTimeout(() => setFailed(true), 0);
      return;
    }

    map.on("load", () => {
      if (failTimerRef.current != null) {
        window.clearTimeout(failTimerRef.current);
        failTimerRef.current = null;
      }
      mapReadyRef.current = true;
      setReady(true);

      map.addSource("pv-circles", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });
      map.addLayer({
        id: "pv-circles-fill",
        type: "fill",
        source: "pv-circles",
        paint: { "fill-color": CIRCLE_FILL },
      });
      map.addLayer({
        id: "pv-circles-line",
        type: "line",
        source: "pv-circles",
        paint: { "line-color": CIRCLE_LINE, "line-width": 2 },
      });

      // Center markers as pin markers
      mappableAreas.forEach((a) => {
          const el = document.createElement("div");
          el.innerHTML = `<svg width="22" height="32" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${MARKER_COLOR}"/>
            <circle cx="14" cy="14" r="5" fill="#ffffff"/>
          </svg>`;
          new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([a.lng, a.lat])
            .addTo(map);
        });
    });

    map.on("error", () => {
      if (!mapReadyRef.current && failTimerRef.current == null) {
        failTimerRef.current = window.setTimeout(() => setFailed(true), 8000);
      }
    });

    mapRef.current = map;
    return () => {
      if (failTimerRef.current != null) {
        window.clearTimeout(failTimerRef.current);
        failTimerRef.current = null;
      }
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [areasKey]);

  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (!el || !map || !ready) return undefined;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  if (mappableAreas.length === 0) return null;

  return (
    <div className={`rounded-xl overflow-hidden border border-slate-200 relative ${className}`}>
      <div ref={containerRef} style={{ height }} className="w-full" />
      {!ready && !failed && (
        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin text-[#00838F]" />
          Loading map...
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center gap-2 text-sm text-red-500">
          <AlertTriangle size={16} className="text-red-400" />
          Could not load map
        </div>
      )}
      <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between">
        <span>
          Pickup areas — {mappableAreas.length} zone{mappableAreas.length === 1 ? "" : "s"}
        </span>
        <span className="font-semibold text-[#00838F]">
          {mappableAreas
            .filter((a) => a.radiusKm)
            .map((a) => `${a.radiusKm} km`)
            .join(", ") || "Radius-based"}
        </span>
      </div>
    </div>
  );
}
