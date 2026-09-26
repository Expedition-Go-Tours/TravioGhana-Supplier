import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { COUNTRIES } from "../config/payoutMethodForm";

const MAX_VISIBLE = 60;

/**
 * Searchable country picker.
 *
 * 245 countries is well past what a native <select> or a Radix typeahead can
 * carry, and typing a two-letter ISO code by hand is the single worst thing the
 * old form asked a supplier to do. This follows the ARIA 1.2 combobox pattern
 * so it still behaves like a real dropdown for keyboard and screen-reader users.
 */
export default function CountryCombobox({ id, value, onChange, invalid, describedBy, className }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const selected = useMemo(
    () => COUNTRIES.find((c) => c.code === value) || null,
    [value],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? COUNTRIES.filter(
          (c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase().startsWith(needle),
        )
      : COUNTRIES;
    return list.slice(0, MAX_VISIBLE);
  }, [query]);

  // Closing on an outside click is the one thing that genuinely has to be an
  // effect — it is syncing with the document, not with our own state.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openList = () => {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
    inputRef.current?.focus();
  };

  const closeList = () => {
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
  };

  const commit = (code) => {
    onChange?.(code);
    closeList();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + delta + matches.length) % Math.max(matches.length, 1));
      return;
    }
    if (event.key === "Enter") {
      if (open && matches[activeIndex]) {
        event.preventDefault();
        commit(matches[activeIndex].code);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeList();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        // The input is only as tall as its text, so the padding above and below
        // it would be dead space on a phone. The whole 46px box opens the list.
        onClick={() => !open && openList()}
        className={cn(
          "flex min-h-[46px] w-full cursor-text items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all",
          invalid
            ? "border-red-300 ring-1 ring-red-100"
            : "border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[activeIndex] ? `${listId}-${matches[activeIndex].code}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          spellCheck={false}
          value={open ? query : selected ? `${selected.name} (${selected.code})` : ""}
          placeholder="Search for your country"
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            if (!open) setOpen(true);
          }}
          onFocus={openList}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => (open ? closeList() : openList())}
          className="-mr-1 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <ChevronDown size={16} className={cn("transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5 text-slate-400">
            <Search size={15} className="shrink-0" />
            <span className="truncate text-xs">
              {query.trim() ? `${matches.length} match${matches.length === 1 ? "" : "es"}` : "Type to filter countries"}
            </span>
          </div>
          <ul id={listId} role="listbox" aria-label="Country" className="max-h-64 overflow-y-auto p-1.5">
            {matches.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-400">No country matches “{query.trim()}”</li>
            )}
            {matches.map((country, index) => {
              const isSelected = country.code === value;
              return (
                <li
                  key={country.code}
                  id={`${listId}-${country.code}`}
                  role="option"
                  // An explicit label keeps the name stable for screen readers —
                  // the flag, name and code are separate inline spans, so the
                  // computed name would otherwise run them together.
                  aria-label={`${country.name} (${country.code})`}
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(country.code)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    index === activeIndex ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="w-6 shrink-0 text-base leading-none" aria-hidden="true">
                    {country.flag || "🏳"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">{country.code}</span>
                  {isSelected && <Check size={15} className="shrink-0 text-emerald-600" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
