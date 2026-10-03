import { Check, ChevronLeft } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { FACILITY_GROUPS } from "../config/constants";

/**
 * STEP 9 — Amenities, Booking's "What can guests use at your place?" page:
 * the large heading, then one card with the grouped checklist (General,
 * Cooking and cleaning, Entertainment, Outside and view) separated by
 * hairlines. Continue stays disabled until at least one amenity is selected,
 * and the reference footer (back arrow + Continue) saves the draft first.
 */
function AmenityRow({ label, checked, onToggle }) {
  return (
    <label className="flex cursor-pointer items-center gap-3.5 py-1.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded border-2 text-white transition-colors ${
          checked ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
        }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 text-base text-slate-800">{label}</span>
    </label>
  );
}

export default function Step09Amenities({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const facilities = property.facilities || [];
  const canContinue = facilities.length > 0;

  const toggle = (item) =>
    patch({
      facilities: facilities.includes(item)
        ? facilities.filter((value) => value !== item)
        : [...facilities, item],
    });

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    try {
      await onSave?.();
    } catch {
      // The draft hook reports save failures; still move on like the builder.
    }
    onNext?.();
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        What can guests use at your place?
      </h1>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 md:mt-10 md:p-8">
        {FACILITY_GROUPS.map((group, index) => (
          <div
            key={group.id}
            className={index > 0 ? "mt-8 border-t border-slate-200 pt-8" : undefined}
          >
            <h2 className="text-base font-bold text-slate-900 md:text-lg">{group.label}</h2>
            <div className="mt-3" role="group" aria-label={group.label}>
              {group.items.map((item) => (
                <AmenityRow
                  key={item}
                  label={item}
                  checked={facilities.includes(item)}
                  onToggle={() => toggle(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-3">
        <StaysButton
          aria-label="Back"
          onClick={() => onBack?.()}
          className="h-14 w-14 shrink-0 p-0"
        >
          <ChevronLeft size={20} />
        </StaysButton>
        <StaysButton
          variant="primary"
          className="h-14 flex-1 text-base"
          disabled={!canContinue || saving}
          onClick={handleContinue}
        >
          {saving ? "Saving…" : "Continue"}
        </StaysButton>
      </div>
    </div>
  );
}
