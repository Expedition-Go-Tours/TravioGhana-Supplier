import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { LANGUAGES } from "../config/constants";

/**
 * The five languages the reference leads with; everything else in the
 * workspace vocabulary lives behind "Add additional languages".
 */
const PRIMARY_LANGUAGES = ["English", "French", "Italian", "Russian", "Spanish"];
const ADDITIONAL_LANGUAGES = LANGUAGES.filter(
  (language) => !PRIMARY_LANGUAGES.includes(language),
);

function LanguageRow({ label, checked, onToggle }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span
        aria-hidden="true"
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 text-white transition-colors ${
          checked ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
        }`}
      >
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 text-base text-slate-800 md:text-lg">{label}</span>
    </label>
  );
}

/**
 * STEP 4 — Languages, Booking's "What languages do you or your staff speak?"
 * page: the large heading, then a card with the popular languages, a divider
 * and "Add additional languages" for the rest of the vocabulary (expanded by
 * default when an additional language is already saved). The step owns its
 * reference footer (back arrow + Continue), which saves the draft before
 * advancing.
 */
export default function Step04Languages({ property, patch, onBack, onNext, onSave, saving = false }) {
  const languages = property.languages || [];
  const [showAdditional, setShowAdditional] = useState(() =>
    ADDITIONAL_LANGUAGES.some((language) => languages.includes(language)),
  );

  const toggle = (language) =>
    patch({
      languages: languages.includes(language)
        ? languages.filter((item) => item !== language)
        : [...languages, language],
    });

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
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        What languages do you or your staff speak?
      </h1>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white px-5 py-6 md:mt-10 md:px-8 md:py-8">
        <h2 className="text-lg font-bold text-slate-900 md:text-xl">Select languages</h2>

        <div className="mt-4" role="group" aria-label="Select languages">
          {PRIMARY_LANGUAGES.map((language) => (
            <LanguageRow
              key={language}
              label={language}
              checked={languages.includes(language)}
              onToggle={() => toggle(language)}
            />
          ))}
        </div>

        {showAdditional && (
          <div className="mt-4" role="group" aria-label="Additional languages">
            {ADDITIONAL_LANGUAGES.map((language) => (
              <LanguageRow
                key={language}
                label={language}
                checked={languages.includes(language)}
                onToggle={() => toggle(language)}
              />
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() => setShowAdditional((open) => !open)}
            className="text-base font-medium text-emerald-700 transition-colors hover:text-emerald-800"
          >
            {showAdditional ? "Show fewer languages" : "Add additional languages"}
          </button>
        </div>
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
