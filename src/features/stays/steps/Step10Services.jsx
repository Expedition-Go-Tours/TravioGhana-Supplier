import { ChevronLeft } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { SERVICE_CHOICES } from "../config/constants";

/**
 * STEP 10 — Services, Booking's "Services at your property" page: one card
 * per service (Breakfast, Parking) with the card title, a hairline, the
 * question and the stacked answers. The reference's blue radios are emerald
 * here. The step owns its reference footer (back arrow + Continue), which
 * saves the draft before advancing.
 */
function ServiceQuestion({ title, question, options, value, onChange }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
      <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h2>
      <div className="mt-4 border-t border-slate-200 pt-5">
        <h3 className="text-base font-bold text-slate-900 md:text-lg">{question}</h3>
        <div className="mt-3" role="radiogroup" aria-label={question}>
          {options.map((option) => {
            const checked = value === option;
            return (
              <label
                key={option}
                className="flex w-fit cursor-pointer items-center gap-3 py-1.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30"
              >
                <input
                  type="radio"
                  name={title}
                  checked={checked}
                  onChange={() => onChange(option)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
                    checked ? "border-emerald-600" : "border-slate-400"
                  }`}
                >
                  {checked && <span className="h-3 w-3 rounded-full bg-emerald-600" />}
                </span>
                <span className="text-base text-slate-800 md:text-lg">{option}</span>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Step10Services({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const services = property.services || { breakfast: "No", parking: "No" };
  const setService = (key) => (value) => patch({ services: { ...services, [key]: value } });

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
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        Services at your property
      </h1>

      <div className="mt-8 space-y-5 md:mt-10">
        <ServiceQuestion
          title="Breakfast"
          question="Do you serve guests breakfast?"
          options={SERVICE_CHOICES.breakfast}
          value={services.breakfast || "No"}
          onChange={setService("breakfast")}
        />
        <ServiceQuestion
          title="Parking"
          question="Is parking available to guests?"
          options={SERVICE_CHOICES.parking}
          value={services.parking || "No"}
          onChange={setService("parking")}
        />
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
