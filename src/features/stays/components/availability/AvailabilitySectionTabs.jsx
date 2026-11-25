import { Link, useSearchParams } from "react-router-dom";
import { useTeamRole } from "@/hooks/useTeamRole";
import { AVAILABILITY_SECTIONS } from "../../config/availabilitySections";
import { cn } from "@/lib/utils";

/**
 * The in-page section strip. The sidebar submenu is the primary navigation;
 * this strip keeps the sections reachable on mobile and after a deep link.
 * Every tab is a real URL (`?section=`), so the browser and search palette
 * agree with the sidebar.
 */
export default function AvailabilitySectionTabs({ activeSection }) {
  const { hasPermission } = useTeamRole();
  const [searchParams] = useSearchParams();

  const sections = AVAILABILITY_SECTIONS.filter(
    (section) => !section.permission || hasPermission(section.permission),
  );

  const hrefFor = (section) => {
    const next = new URLSearchParams(searchParams);
    next.set("section", section);
    const query = next.toString();
    return query ? `/stays/availability?${query}` : "/stays/availability";
  };

  return (
    <div className="mb-5 overflow-x-auto border-b border-slate-200 scrollbar-none">
      <div className="flex min-w-max items-center gap-1" role="tablist" aria-label="Availability sections">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = section.id === activeSection;
          return (
            <Link
              key={section.id}
              to={hrefFor(section.id)}
              role="tab"
              aria-selected={active}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 pb-3 pt-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                active
                  ? "border-emerald-500 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon size={14} className="shrink-0" />
              {section.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
