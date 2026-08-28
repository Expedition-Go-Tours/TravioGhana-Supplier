import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { MapPin, Loader2, X, AlertTriangle, RefreshCw } from "lucide-react";
import { useGeocoding } from "@/hooks/useGeocoding";

const MARK_STYLE =
  "relative inline-block after:absolute after:inset-0 after:bg-amber-100/60 after:rounded-sm after:-my-px";

function highlightText(text, query) {
  if (!text || !query) return text;
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${q})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className={MARK_STYLE}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * LocationAutocomplete
 *
 * Accessible, production-ready autocomplete for location search.
 * Searches via backend API which caches and auto-falls back across providers.
 * Returns city, country, region, latitude, longitude on selection.
 */
const LocationAutocomplete = forwardRef(function LocationAutocomplete(
  {
    onSelect,
    onAddCustom,
    onChange,
    disabled = false,
    hideLabel = false,
    hideAttribution = true,
    placeholder = "Start typing a location (e.g., Arusha, Tanzania)",
    label = "Search location",
    className = "",
    mode = "dropdown",
    clearOnSelect = false,
    minChars = 2,
  },
  ref
) {
  const { search, retry, clear, results, loading, debouncing, error } =
    useGeocoding(minChars);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const onAddCustomRef = useRef(onAddCustom);
  onSelectRef.current = onSelect;
  onAddCustomRef.current = onAddCustom;

  useImperativeHandle(ref, () => ({
    reset() {
      setQuery("");
      clear();
      setOpen(false);
      setHighlightedIndex(-1);
    },
  }));

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onChange?.(value);
    setHighlightedIndex(-1);
    if (value.trim().length >= minChars) {
      search(value);
      setOpen(true);
    } else {
      clear();
      setOpen(false);
    }
  };

  const handleSelect = useCallback(
    (result) => {
      if (clearOnSelect) {
        setQuery("");
        clear();
      } else {
        setQuery(result.formatted);
      }
      setOpen(false);
      setHighlightedIndex(-1);
      onSelectRef.current(result);
    },
    [clearOnSelect, clear]
  );

  const handleClear = () => {
    setQuery("");
    clear();
    setOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleAddCustom = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || !onAddCustomRef.current) return;
    onAddCustomRef.current(trimmed);
    setQuery("");
    clear();
    setOpen(false);
    setHighlightedIndex(-1);
  }, [query, clear]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    const count = results.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < count) {
          handleSelect(results[highlightedIndex]);
        } else if (count > 0) {
          handleSelect(results[0]);
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightedIndex(-1);
        break;
      case "Tab":
        setOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const isDropdown = mode === "dropdown";
  const canOpen = open && (results.length > 0 || loading || error || (query.trim().length >= minChars && !error));

  return (
    <div ref={containerRef} className={className || "relative"}>
      {!hideLabel && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            {label}
          </span>
        </label>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0 || loading || error) setOpen(true);
            }}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full h-[46px] pl-3 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            role="combobox"
            aria-expanded={canOpen}
            aria-autocomplete="list"
            aria-controls={canOpen ? "location-listbox" : undefined}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `location-option-${highlightedIndex}`
                : undefined
            }
          />
          {(loading || debouncing) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
            </div>
          )}
          {!loading && !debouncing && query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Clear location search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <MapPin size={18} className="text-emerald-500 shrink-0" />
      </div>

      {canOpen && (
        <div
          id="location-listbox"
          role="listbox"
          className={
            isDropdown
              ? "absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
              : "mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-sm max-h-52 overflow-y-auto z-10 divide-y divide-slate-50"
          }
        >
          {debouncing && !loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin text-slate-300" />
              Typing…
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              Searching locations…
            </div>
          )}

          {!loading && !debouncing && error && (
            <div className="px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-600">{error}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You can still enter location details manually below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={retry}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded shrink-0 transition-colors"
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !debouncing && !error && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 space-y-2">
              <p>No locations found.</p>
              {onAddCustom && query.trim().length >= minChars && (
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="text-emerald-600 font-medium hover:text-emerald-700 bg-transparent border-0 cursor-pointer p-0 text-sm"
                >
                  Add &ldquo;{query.trim()}&rdquo; as a custom location
                </button>
              )}
            </div>
          )}

          {!loading &&
            !debouncing &&
            !error &&
            results.map((result, index) => (
              <div
                key={`${result.source || index}-${index}`}
                id={`location-option-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  isDropdown
                    ? `${index < results.length - 1 ? "border-b border-slate-50" : ""}`
                    : ""
                } ${
                  index === highlightedIndex
                    ? "bg-emerald-50 text-emerald-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug truncate">
                      {highlightText(result.formatted, query)}
                    </div>
                    <div className="text-xs text-slate-400 truncate leading-snug mt-0.5">
                      {[result.city, result.region, result.country]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {!hideAttribution && (
        <p className="text-[10px] text-slate-400 mt-1">
          Location data &copy;{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            OpenStreetMap
          </a>{" "}
          contributors
        </p>
      )}
    </div>
  );
});

export default LocationAutocomplete;
