import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibreWorker";
import { AlertTriangle, Loader2 } from "lucide-react";
import { DEFAULT_CENTER, TILE_STYLE, warmMapResources } from "@/lib/mapConfig";

/** The classic red teardrop pin the location flow uses. */
const PIN_HTML = `
  <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 4px rgba(15, 23, 42, 0.35));">
    <path d="M15 1C7.3 1 1 7.3 1 15c0 10.5 14 25 14 25s14-14.5 14-25C29 7.3 22.7 1 15 1Z" fill="#EA4335" stroke="#B31412" stroke-width="1.5"/>
    <circle cx="15" cy="15" r="5.2" fill="#B31412"/>
  </svg>
`;

/**
 * The full-bleed MapLibre canvas behind the location screen. The red pin is a
 * real MapLibre marker: draggable, and clicking the map moves it. Every move
 * reports through `onPinMove(lat, lng)`; `focusSignal` lets the parent request
 * a recentre (search result, pasted link) without hijacking click/drag moves.
 */
export default function PropertyLocationMap({
  lat,
  lng,
  focusSignal = 0,
  onPinMove,
  className = "",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPinMoveRef = useRef(onPinMove);

  // Keep the latest handler reachable from the map listeners without
  // re-registering them.
  useEffect(() => {
    onPinMoveRef.current = onPinMove;
  }, [onPinMove]);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    warmMapResources();

    const hasPin = lat != null && lng != null;
    let map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: TILE_STYLE,
        center: hasPin ? [lng, lat] : [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
        zoom: hasPin ? 15 : 12,
        localIdeographFontFamily: "sans-serif",
      });
    } catch {
      window.setTimeout(() => setError(true), 0);
      return undefined;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setReady(true));
    map.on("error", () => setError(true));
    map.on("click", (event) => onPinMoveRef.current?.(event.lngLat.lat, event.lngLat.lng));

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount once — later pin changes are handled by the effects below.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the draggable pin on the current coordinates.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (lat == null || lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const element = document.createElement("div");
      element.innerHTML = PIN_HTML;
      element.style.cursor = "grab";
      const marker = new maplibregl.Marker({ element, anchor: "bottom", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on("dragend", () => {
        const position = marker.getLngLat();
        onPinMoveRef.current?.(position.lat, position.lng);
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng, ready]);

  // Recentre only when the parent explicitly asks (search, pasted link).
  useEffect(() => {
    if (!ready || lat == null || lng == null) return;
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
  }, [focusSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* MapLibre adds `.maplibregl-map` (position: relative) to this node, so
          it must own a real height rather than rely on absolute inset-0. */}
      <div ref={containerRef} className="h-full w-full" />
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center gap-2.5 bg-slate-50 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin text-emerald-600" />
          Loading map...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-red-50 px-4 text-center">
          <AlertTriangle size={28} className="text-red-400" />
          <p className="text-sm font-medium text-red-600">Could not load map tiles</p>
          <p className="text-xs text-red-400">Check your internet connection and try again.</p>
        </div>
      )}
    </div>
  );
}
