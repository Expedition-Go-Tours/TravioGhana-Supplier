import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";
import { TILE_STYLE } from "@/lib/mapConfig";

/**
 * Small square map of a pickup point.
 *
 * The size is controlled by the caller (via `className`); it defaults to a
 * 144px square so it never stretches to fill a column and unbalance the row.
 * No-coordinates and error states render the same square, so the layout holds.
 *
 * @param {string} [className] sizing classes for the square (e.g. "h-40 w-40")
 */
export default function PickupMapPreview({ lat, lng, address, className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const size = className || "h-36 w-36";

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!lat || !lng) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: TILE_STYLE,
        center: [lng, lat],
        zoom: 15,
        interactive: false,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchZoomRotate: false,
        doubleClickZoom: false,
        scrollZoom: false,
        boxZoom: false,
        keyboard: false,
        localIdeographFontFamily: "sans-serif",
      });

      map.on("load", () => {
        setLoaded(true);
        new maplibregl.Marker({ color: "#059669" })
          .setLngLat([lng, lat])
          .addTo(map);
      });

      map.on("error", () => setError(true));

      mapRef.current = map;
    } catch {
      window.setTimeout(() => setError(true), 0);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

  const box = `relative shrink-0 overflow-hidden rounded-xl border ${size}`;

  if (!lat || !lng) {
    return (
      <div className={`${box} flex flex-col items-center justify-center gap-1.5 border-slate-200 bg-slate-50 px-3 text-center`}>
        <MapPin size={16} className="text-slate-400" />
        <p className="text-[10px] leading-tight text-slate-400 line-clamp-3">
          {address || "No location coordinates"}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${box} flex flex-col items-center justify-center gap-1.5 border-red-200 bg-red-50 px-3 text-center`}>
        <MapPin size={16} className="text-red-500" />
        <p className="text-[10px] font-medium leading-tight text-red-700 line-clamp-3">
          {address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
        </p>
        <p className="text-[9px] text-red-500">Map unavailable</p>
      </div>
    );
  }

  return (
    <div className={`${box} border-slate-200/70`}>
      <div ref={containerRef} className="absolute inset-0" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-50/50">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
