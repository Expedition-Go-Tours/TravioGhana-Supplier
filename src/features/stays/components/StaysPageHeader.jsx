import { cn } from "@/lib/utils";

/**
 * The dashboard's standard page heading: a bold title with a muted supporting
 * line and the page actions on the right. Matches the Experiences pages
 * (`text-xl md:text-2xl font-bold text-slate-800`).
 */
export default function StaysPageHeader({ title, subtitle, actions, className }) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-800 md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </div>
  );
}
