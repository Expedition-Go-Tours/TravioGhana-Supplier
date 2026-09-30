import { FACILITIES } from "../config/constants";
import { Subhead } from "./stepBits";

/** STEP 3 — Facilities: the prototype's checkbox grid. */
export default function Step03Facilities({ property, patch }) {
  const selected = property.facilities || [];

  const toggle = (facility) => {
    patch({
      facilities: selected.includes(facility)
        ? selected.filter((value) => value !== facility)
        : [...selected, facility],
    });
  };

  return (
    <>
      <Subhead>Popular facilities</Subhead>
      <div className="grid grid-cols-2 gap-[9px] md:grid-cols-3">
        {FACILITIES.map((facility) => {
          const checked = selected.includes(facility);
          return (
            <label
              key={facility}
              className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-[10px] py-[10px] text-[13px] transition-colors ${
                checked ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(facility)}
                className="h-4 w-4 accent-emerald-600"
              />
              {facility}
            </label>
          );
        })}
      </div>
    </>
  );
}
