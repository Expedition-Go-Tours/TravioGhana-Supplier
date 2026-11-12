import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { MapPin, Loader2, X, AlertTriangle, RefreshCw, Search } from "lucide-react";
import { useGeocoding } from "@/hooks/useGeocoding";
import { searchGoogleMaps } from "@/lib/serpApiMapsSearch";

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

const LOCATION_STOPWORDS = new Set([
  "a", "an", "and", "at", "by", "for", "from", "in", "is", "near",
  "of", "on", "or", "the", "to", "with",
]);

function normalizeLocationText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function locationQueryTokens(query) {
  return normalizeLocationText(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !LOCATION_STOPWORDS.has(token));
}

/**
 * True when at least one free-provider result actually contains everything the
 * user typed (all meaningful tokens, matched at word starts). Fuzzy results
 * like "Accra, Ghana" for "Kaneshie Market" are not a real match, so the
 * Google Maps option must still be offered alongside them.
 */
function hasRelevantLocationSuggestion(query, results) {
  const tokens = locationQueryTokens(query);
  if (tokens.length === 0) return true;
  return results.some((result) => {
    const haystack = normalizeLocationText(
      [result.formatted, result.city, result.region, result.country]
        .filter(Boolean)
        .join(" ")
    );
    return tokens.every((token) =>
      new RegExp(`(?:^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(haystack)
    );
  });
}

/**
 * LocationAutocomplete
 *
 * Accessible, production-ready autocomplete for location search.
 * Searches via backend API which caches and auto-falls back across providers.
 * Returns city, country, region, latitude, longitude on selection.
 *
 * `googleMapsFallback` opts into the SerpApi Google Maps escape hatch: when the
 * free providers return nothing useful (no results, or only fuzzy matches that
 * do not contain what was typed), the dropdown offers an explicit, credit-safe
 * "Search Google Maps" action instead of dead-ending. It is off by default so
 * other location pickers keep their current behaviour.
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
    value,
    googleMapsFallback = false,
    googleMapsOrigin = null,
  },
  ref
) {
  const { search, retry, clear, results, loading, debouncing, error } =
    useGeocoding(minChars);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Google Maps (SerpApi) fallback: idle → loading → done | error.
  const [googleState, setGoogleState] = useState("idle");
  const [googleResults, setGoogleResults] = useState([]);
  const [googleError, setGoogleError] = useState(null);
  const googleAbortRef = useRef(null);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const onAddCustomRef = useRef(onAddCustom);
  onSelectRef.current = onSelect;
  onAddCustomRef.current = onAddCustom;

  const resetGoogleSearch = useCallback(() => {
    googleAbortRef.current?.abort();
    googleAbortRef.current = null;
    setGoogleState("idle");
    setGoogleResults([]);
    setGoogleError(null);
  }, []);

  useEffect(() => () => googleAbortRef.current?.abort(), []);

  /**
   * Runs one explicit Google Maps search. Deliberately not wired to typing:
   * each uncached SerpApi lookup can spend a credit.
   */
  const runGoogleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!googleMapsFallback || trimmed.length < 3 || googleState === "loading") return;

    googleAbortRef.current?.abort();
    const controller = new AbortController();
    googleAbortRef.current = controller;

    setGoogleState("loading");
    setGoogleResults([]);
    setGoogleError(null);

    const outcome = await searchGoogleMaps(trimmed, googleMapsOrigin, {
      signal: controller.signal,
    });

    // A newer search (or a reset/typing event) superseded this one.
    if (googleAbortRef.current !== controller || controller.signal.aborted) return;
    googleAbortRef.current = null;
    if (outcome.status === "aborted") return;

    if (outcome.status === "ok" || outcome.status === "empty") {
      setGoogleResults(outcome.results);
      setGoogleState("done");
      return;
    }

    setGoogleError(outcome.status);
    setGoogleState("error");
  }, [googleMapsFallback, googleMapsOrigin, googleState, query]);

  useImperativeHandle(ref, () => ({
    reset() {
      setQuery("");
      clear();
      setOpen(false);
      setHighlightedIndex(-1);
      resetGoogleSearch();
    },
  }));

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHighlightedIndex(-1);
        resetGoogleSearch();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [resetGoogleSearch]);

  // Optional controlled mode: when the parent sets the value (a pin moved on
  // the map, a pasted Google Maps link), mirror it into the input. Typing
  // still flows through `onChange`, so this never fights the user.
  useEffect(() => {
    if (typeof value === "string" && value !== query) {
      setQuery(value);
      resetGoogleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onChange?.(value);
    setHighlightedIndex(-1);
    resetGoogleSearch();
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
      resetGoogleSearch();
      onSelectRef.current(result);
    },
    [clearOnSelect, clear, resetGoogleSearch]
  );

  const handleClear = () => {
    setQuery("");
    clear();
    setOpen(false);
    setHighlightedIndex(-1);
    resetGoogleSearch();
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
    resetGoogleSearch();
  }, [query, clear, resetGoogleSearch]);

  const trimmedQuery = query.trim();
  // Offered when the free providers have nothing useful: either no results at
  // all (including a provider error) or only fuzzy matches that do not contain
  // what was typed. That is exactly where a Google Maps lookup helps.
  const showGoogleFallback =
    googleMapsFallback &&
    googleState === "idle" &&
    trimmedQuery.length >= 3 &&
    !loading &&
    !debouncing &&
    !hasRelevantLocationSuggestion(trimmedQuery, results);

  const hasGoogleContent =
    googleMapsFallback &&
    (showGoogleFallback ||
      googleState === "loading" ||
      googleState === "done" ||
      googleState === "error");

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
        } else if (showGoogleFallback) {
          void runGoogleSearch();
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightedIndex(-1);
        resetGoogleSearch();
        break;
      case "Tab":
        // Keep the popup open when the Google Maps action/results are showing
        // so keyboard users can tab into them instead of losing the list.
        if (!hasGoogleContent) {
          setOpen(false);
          setHighlightedIndex(-1);
        }
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
  const canOpen = open && (results.length > 0 || loading || error || (trimmedQuery.length >= minChars && !error));
  const canRetryGoogle =
    googleError === "quota" || googleError === "upstream" || googleError === "unavailable";
  const googleErrorNote =
    googleError === "quota"
      ? "Google Maps search is temporarily unavailable. Try again later or paste a Google Maps link below."
      : googleError === "not_configured"
        ? "Google Maps search isn’t available right now. Place the pin on the map or paste a Google Maps link instead."
        : googleError === "invalid"
          ? "Type at least 3 characters to search Google Maps."
          : "Couldn’t reach Google Maps. Please try again.";

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
              if (results.length > 0 || loading || error || googleState !== "idle") setOpen(true);
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

          {!loading &&
            !debouncing &&
            !error &&
            results.length === 0 &&
            !(googleMapsFallback && googleState === "done") && (
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

          {/* SerpApi Google Maps escape hatch. Deliberately a highlighted,
              sticky card: when the free providers dead-end, this is the only
              useful next step and must be impossible to miss. It only spends
              a SerpApi credit on an explicit click (or Enter). */}
          {hasGoogleContent && (
            <div className="sticky bottom-0 z-10 border-t border-slate-100 bg-white/95 p-2.5 backdrop-blur-sm">
              {googleState === "idle" && showGoogleFallback && (
                <button
                  type="button"
                  onClick={() => void runGoogleSearch()}
                  aria-label={`Search Google Maps for ${trimmedQuery}`}
                  className="group flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                    <Search size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-slate-900">
                      Can&apos;t find your address?
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-600">
                      Search Google Maps for places in Ghana.
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                    Google Maps
                  </span>
                </button>
              )}

              {googleState === "loading" && (
                <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                    <Loader2 size={16} className="animate-spin" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-slate-900">
                      Searching Google Maps…
                    </p>
                    <p className="mt-0.5 truncate text-xs leading-snug text-slate-600">
                      {trimmedQuery}
                    </p>
                  </div>
                </div>
              )}

              {googleState === "done" && googleResults.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-blue-200 bg-white">
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      Google Maps · Ghana
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {googleResults.map((place, index) => {
                      const subtitle = [place.city, place.region, place.country]
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <li key={place.placeId || `${place.formatted}-${index}`}>
                          <button
                            type="button"
                            onClick={() => handleSelect(place)}
                            className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50/70 focus:outline-none focus-visible:bg-blue-50"
                          >
                            <MapPin size={14} className="mt-0.5 shrink-0 text-blue-600" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium leading-snug">
                                {highlightText(place.formatted, query)}
                              </span>
                              {subtitle && (
                                <span className="mt-0.5 block truncate text-xs leading-snug text-slate-400">
                                  {subtitle}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                              Google Maps
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {googleState === "done" && googleResults.length === 0 && (
                <p className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                  Google Maps didn&apos;t find a match for &ldquo;{trimmedQuery}&rdquo;.
                </p>
              )}

              {googleState === "error" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-amber-800">{googleErrorNote}</p>
                  {canRetryGoogle && (
                    <button
                      type="button"
                      onClick={() => void runGoogleSearch()}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
                    >
                      <RefreshCw size={11} />
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
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
