import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, X, Search, Check } from "lucide-react";

export default function MultiSelect({
  label,
  options,
  value = [],
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  max,
  error,
  required,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = useCallback(
    (optValue) => {
      const next = value.includes(optValue)
        ? value.filter((v) => v !== optValue)
        : max && value.length >= max
          ? value
          : [...value, optValue];
      onChange(next);
    },
    [value, onChange, max],
  );

  const remove = useCallback(
    (optValue) => {
      onChange(value.filter((v) => v !== optValue));
    },
    [value, onChange],
  );

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-800 mb-2">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {max && value.length >= max && (
            <span className="text-xs text-amber-600 ml-2">Max {max} selected</span>
          )}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-xl text-sm bg-white focus:outline-none ${
          error ? "border-red-500" : "border-slate-200"
        }`}
      >
        <span className={value.length === 0 ? "text-slate-400" : "text-slate-800"}>
          {value.length > 0 ? `${value.length} selected` : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Chips */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            if (!opt) return null;
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={() => remove(v)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
          {max && value.length >= max && (
            <span className="text-xs text-slate-400 self-center">(max reached)</span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 flex flex-col">
          {/* Search */}
          <div className="relative border-b border-slate-200">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
          </div>

          {/* Options */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No options found
              </p>
            ) : (
              filtered.map((opt) => {
                const selected = value.includes(opt.value);
                const atMax = max && value.length >= max && !selected;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={atMax}
                    onClick={() => toggle(opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                      atMax
                        ? "text-slate-300 cursor-not-allowed"
                        : selected
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 flex items-center justify-center rounded border transition-colors ${
                        selected
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {selected && <Check size={11} />}
                    </span>
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
