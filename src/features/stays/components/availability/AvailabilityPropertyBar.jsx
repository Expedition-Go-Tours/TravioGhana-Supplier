import StaysCard from "../StaysCard";
import StaysPropertySelect from "../StaysPropertySelect";

/** Shared property switcher for the non-calendar Availability sections. */
export default function AvailabilityPropertyBar({
  property,
  properties,
  onSelect,
  children,
}) {
  return (
    <StaysCard className="mb-4 p-3 sm:px-5 sm:py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Property
          </span>
          <StaysPropertySelect
            properties={properties}
            value={property?.id}
            onChange={onSelect}
            className="min-w-0 flex-1 px-3 text-sm font-medium text-slate-900"
          />
        </div>
        {children}
      </div>
    </StaysCard>
  );
}
