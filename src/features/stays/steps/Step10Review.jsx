import StaysPill from "../components/StaysPill";
import StaysRow from "../components/StaysRow";
import { Footnote } from "./stepBits";
import { statusTone } from "../utils/status";

/** STEP 9 — Review & submit: the prototype's summary rows before submission. */
export default function Step09Review({ property }) {
  const roomCount = property.rooms?.length || 0;
  const planCount = (property.ratePlans || []).length;

  const rows = [
    ["Property", `${property.name} · ${property.type}`],
    ["Short description", property.shortDescription || "Not added"],
    ["Full description", property.description || "Not added"],
    ["Location", `${property.city || "Pending"}, ${property.region}`],
    ["Facilities", `${(property.facilities || []).length} selected`],
    ["Rooms", `${roomCount} room ${roomCount === 1 ? "type" : "types"}`],
    ["Rate plans", `${planCount} ${planCount === 1 ? "plan" : "plans"} across ${roomCount} room ${roomCount === 1 ? "type" : "types"}`],
    ["Availability", property.start || "Not set"],
    ["Rate cancellation", `${planCount} plan-specific ${planCount === 1 ? "term" : "terms"}`],
    ["Photos", `${(property.photos || []).length} uploaded`],
  ];

  return (
    <>
      <div className="mb-5 flex flex-col items-start justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 md:flex-row md:items-center">
        <div>
          <strong className="text-sm font-semibold text-emerald-900">Your property is almost ready</strong>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800/80">
            Review the details below and submit for review.
          </p>
        </div>
        <StaysPill tone={statusTone(property.status)}>{property.status}</StaysPill>
      </div>

      {rows.map(([label, value]) => (
        <StaysRow key={label}>
          <strong className="text-[14px]">{label}</strong>
          <span className="max-w-[60%] text-right text-sm text-slate-500">{value}</span>
        </StaysRow>
      ))}

      <Footnote>
        Submission marks this listing “Under review”. It does not publish a real listing until TravioGhana
        reviews it.
      </Footnote>
    </>
  );
}
