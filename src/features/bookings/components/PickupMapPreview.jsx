import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";
import { TILE_STYLE } from "@/lib/mapConfig";

export default function PickupMapPreview({ lat, lng, address, className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

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

  if (!lat || !lng) {
    return (
      <div
        className={`flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-3 ${className}`}
      >
        <div className="p-1.5 bg-slate-100 rounded-md">
          <MapPin size={12} className="text-slate-400" />
        </div>
        <p className="text-[11px] text-slate-400 truncate">
          {address || "No location coordinates"}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-lg p-3 ${className}`}
      >
        <div className="p-1.5 bg-amber-100 rounded-md">
          <MapPin size={12} className="text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-amber-800 truncate">
            {address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </p>
          <p className="text-[9px] text-amber-500 mt-0.5">Map unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-slate-200/60 ${className}`}>
      <div ref={containerRef} className="w-full h-[120px]" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-50/50">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
