import { AlertTriangle, ChevronRight, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Recommended actions, GYG-style: what to change, tied to the figure that
 * triggered it. Renders nothing when there is nothing to say — an empty
 * "recommendations" card is worse than no card.
 */
export default function RecommendedActions({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[15px] font-semibold text-slate-900">Recommended actions</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Based on this period's numbers. Each one names the figure that triggered it.
        </p>
      </div>

      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const Icon = item.severity === "warning" ? AlertTriangle : Lightbulb;
          return (
            <li key={item.id} className="flex items-start gap-3 px-5 py-4">
              <span
                className={
                  item.severity === "warning"
                    ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
                    : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"
                }
              >
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug text-slate-800">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.detail}</p>
              </div>
              {item.to && (
                <Link
                  to={item.to}
                  className="mt-1 inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-emerald-700 hover:underline"
                >
                  Open <ChevronRight size={13} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
