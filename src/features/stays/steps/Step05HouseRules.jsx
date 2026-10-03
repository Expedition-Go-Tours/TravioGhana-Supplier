import { useState } from "react";
import { ChevronLeft, Lightbulb, X } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { StaysField, StaysSelect } from "../components/StaysForm";

/**
 * STEP 5 — House rules, Booking's "House rules" page: the large heading, then
 * a card with the smoking/parties switches, the pets question, and the
 * check-in / check-out time windows, next to a dismissible tips card. The
 * reference's blue accents are the stays emerald.
 *
 * The switches map onto the existing policy vocabulary (`smoking` /
 * `parties` / `pets` strings) so the Policies page and review keep working;
 * the times use `checkin`/`checkinEnd` and `checkoutStart`/`checkout`.
 * The step owns its reference footer (back arrow + Continue), which saves the
 * draft before advancing.
 */

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

const PET_OPTIONS = [
  { label: "Yes", value: "Allowed" },
  { label: "Upon request", value: "On request" },
  { label: "No", value: "Not allowed" },
];

function SwitchRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <span className="text-base text-slate-800 md:text-lg">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
          checked ? "bg-emerald-600" : "bg-slate-400"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute h-6 w-6 rounded-full bg-white shadow transition-all ${
            checked ? "left-[23px]" : "left-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

function PetOption({ label, checked, onSelect }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
      <input type="radio" name="pets" checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all ${
          checked ? "border-emerald-600" : "border-slate-400"
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
      </span>
      <span className="text-base text-slate-800 md:text-lg">{label}</span>
    </label>
  );
}

export default function Step05HouseRules({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const [tipsOpen, setTipsOpen] = useState(true);

  const smokingAllowed = property.smoking === "Allowed";
  const partiesAllowed = property.parties === "Allowed";
  const pets = property.pets || "Not allowed";

  const handleContinue = async () => {
    if (saving) return;
    try {
      await onSave?.();
    } catch {
      // The draft hook reports save failures; still move on like the builder.
    }
    onNext?.();
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        House rules
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:mt-10 lg:grid-cols-3">
        {/* Rules card */}
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 md:px-7 md:py-5 lg:col-span-2">
          <SwitchRow
            label="Smoking allowed"
            checked={smokingAllowed}
            onChange={(next) => patch({ smoking: next ? "Allowed" : "No smoking" })}
          />
          <SwitchRow
            label="Parties/events allowed"
            checked={partiesAllowed}
            onChange={(next) => patch({ parties: next ? "Allowed" : "Not allowed" })}
          />

          <div className="my-5 border-t border-slate-200" />

          <h3 className="text-base font-bold text-slate-900 md:text-lg">Do you allow pets?</h3>
          <div className="mt-2" role="radiogroup" aria-label="Do you allow pets?">
            {PET_OPTIONS.map((option) => (
              <PetOption
                key={option.value}
                label={option.label}
                checked={pets === option.value}
                onSelect={() => patch({ pets: option.value })}
              />
            ))}
          </div>

          <div className="my-5 border-t border-slate-200" />

          <h3 className="text-base font-bold text-slate-900 md:text-lg">Check in</h3>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <StaysField label="From">
              <StaysSelect
                options={TIME_OPTIONS}
                value={property.checkin || "14:00"}
                onChange={(event) => patch({ checkin: event.target.value })}
              />
            </StaysField>
            <StaysField label="Until">
              <StaysSelect
                options={TIME_OPTIONS}
                value={property.checkinEnd || "18:00"}
                onChange={(event) => patch({ checkinEnd: event.target.value })}
              />
            </StaysField>
          </div>

          <h3 className="mt-6 text-base font-bold text-slate-900 md:text-lg">Check out</h3>
          <div className="mt-3 grid grid-cols-2 gap-4 pb-2">
            <StaysField label="From">
              <StaysSelect
                options={TIME_OPTIONS}
                value={property.checkoutStart || "08:00"}
                onChange={(event) => patch({ checkoutStart: event.target.value })}
              />
            </StaysField>
            <StaysField label="Until">
              <StaysSelect
                options={TIME_OPTIONS}
                value={property.checkout || "11:00"}
                onChange={(event) => patch({ checkout: event.target.value })}
              />
            </StaysField>
          </div>
        </div>

        {/* Tips card */}
        {tipsOpen && (
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 md:p-7 lg:col-span-1">
            <div className="flex items-start gap-3 md:gap-4">
              <Lightbulb size={28} className="mt-0.5 shrink-0 text-slate-800" aria-hidden="true" />
              <h2 className="min-w-0 flex-1 text-lg font-bold leading-snug text-slate-900 md:text-xl">
                What if my house rules change?
              </h2>
              <button
                type="button"
                onClick={() => setTipsOpen(false)}
                aria-label="Dismiss house rules tips"
                className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700 md:text-base">
              You can easily customise these house rules later and additional house rules can be
              set on the Policies page of the extranet after you complete registration.
            </p>
          </aside>
        )}
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
          disabled={saving}
          onClick={handleContinue}
        >
          {saving ? "Saving…" : "Continue"}
        </StaysButton>
      </div>
    </div>
  );
}
