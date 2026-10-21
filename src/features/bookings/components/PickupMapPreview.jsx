import { useRef, useEffect, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibreWorker";
import { MapPin } from "lucide-react";
import { TILE_STYLE } from "@/lib/mapConfig";

const coord = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Small square map of a pickup point.
 *
 * The size is controlled by the caller (via `className`); it defaults to a
 * 144px square so it never stretches to fill a column and unbalance the row.
 * No-coordinates and error states render the same square, so the layout holds.
 *
 * The address is overlaid on a loaded map too. Previously it was only printed
 * when the map was missing/errored, so a working map hid the one detail a
 * driver actually reads.
 *
 * @param {string} [className] sizing classes for the square (e.g. "h-40 w-40")
 */
export default function PickupMapPreview({ lat, lng, address, className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const size = className || "h-36 w-36";
  const latNum = coord(lat);
  const lngNum = coord(lng);
  const hasCoords = latNum !== null && lngNum !== null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!hasCoords) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: TILE_STYLE,
        center: [lngNum, latNum],
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
          .setLngLat([lngNum, latNum])
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
  }, [hasCoords, latNum, lngNum]);

  const box = `relative shrink-0 overflow-hidden rounded-xl border ${size}`;

  if (!hasCoords) {
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
          {address || `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`}
        </p>
        <p className="text-[9px] text-red-500">Map unavailable</p>
      </div>
    );
  }

  return (
    <div className={`${box} border-slate-200/70`}>
      {/* MapLibre forces `position: relative` on its container, so the size must
          come from the box (h-full/w-full) — `absolute inset-0` collapses it. */}
      <div ref={containerRef} className="h-full w-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-50/50">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}
      {address && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/50 to-transparent px-2 pb-1.5 pt-6">
          <p
            className="text-[9px] font-medium leading-tight text-white line-clamp-2"
            title={address}
          >
            {address}
          </p>
        </div>
      )}
    </div>
  );
}
