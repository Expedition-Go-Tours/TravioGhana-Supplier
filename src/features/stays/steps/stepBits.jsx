/**
 * Shared furniture for the builder steps — the subsection heading, the green
 * "notice" block and the quiet review note, plus the checkbox/radio choices
 * the Booking-style questions use. Values follow the portal's conventions
 * (emerald notice on emerald-50, slate captions).
 */

export function Subhead({ children }) {
  return <div className="mb-3 mt-6 text-sm font-semibold text-slate-800">{children}</div>;
}

export function Notice({ title, children }) {
  return (
    <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
      <strong className="text-sm font-semibold text-emerald-900">{title}</strong>
      {children && (
        <p className="mt-1 text-sm leading-relaxed text-emerald-800/80">{children}</p>
      )}
    </div>
  );
}

export function ReviewBox({ title, children }) {
  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <b className="block text-sm font-semibold text-slate-800">{title}</b>
      <small className="mt-1 block text-xs leading-relaxed text-slate-500">{children}</small>
    </div>
  );
}

export function Footnote({ children }) {
  return <p className="mt-4 text-xs leading-relaxed text-slate-400">{children}</p>;
}

/** A multi-select grid of checkbox tiles. */
export function CheckboxGrid({ options, selected = [], onToggle, ariaLabel }) {
  return (
    <div
      className="grid grid-cols-1 gap-[9px] sm:grid-cols-2 lg:grid-cols-3"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-[10px] py-[10px] text-[13px] transition-colors ${
              checked ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option)}
              className="h-4 w-4 accent-emerald-600"
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}

/** A single-select list of radio cards, used for Booking-style questions. */
export function RadioCards({ name, options, value, onChange, ariaLabel }) {
  return (
    <div className="space-y-3" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30 ${
              selected
                ? "border-emerald-500 bg-emerald-50/30"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={selected}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all ${
                selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
            <span className="text-sm font-medium text-slate-800">{option}</span>
          </label>
        );
      })}
    </div>
  );
}
