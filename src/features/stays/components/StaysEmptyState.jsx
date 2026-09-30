import { cn } from "@/lib/utils";

/**
 * Centred empty-state message in the portal's tone: a muted title line and an
 * optional supporting line. Used for genuine empty states (no rooms yet, no
 * matches for a filter, …).
 */
export default function StaysEmptyState({ title, children, className }) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5 px-4 py-10 text-center", className)}>
      {title && <p className="text-sm font-semibold text-slate-700">{title}</p>}
      {children && <p className="m-0 max-w-md text-sm leading-relaxed text-slate-500">{children}</p>}
    </div>
  );
}
