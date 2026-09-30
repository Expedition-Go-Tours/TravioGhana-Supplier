/**
 * Shared furniture for the builder steps — the subsection heading, the green
 * "notice" block and the quiet review note. Values follow the portal's
 * conventions (emerald notice on emerald-50, slate captions).
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
