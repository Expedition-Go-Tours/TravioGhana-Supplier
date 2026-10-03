import { useId } from "react";
import { Check, ChevronLeft } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { StaysInput, StaysTextarea } from "../components/StaysForm";

/**
 * STEP 7 — Host profile, Booking's "Host profile" page: the large heading,
 * the intro, then the property / host / neighbourhood checkboxes. Every box
 * starts unchecked; checking one reveals its fields (and clears the
 * "None of the above" choice), while "None of the above" clears the three.
 * The step owns its reference footer (back arrow + Continue), which saves the
 * draft before advancing.
 */

const EMPTY_PROFILE = {
  property: { included: false, about: "" },
  host: { included: false, name: "", about: "" },
  neighbourhood: { included: false, about: "" },
  none: false,
};

function SectionCheckbox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
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

function CounterField({ label, max, value, onChange, placeholder, multiline = true }) {
  const id = useId();
  const controlProps = {
    id,
    maxLength: max,
    value,
    onChange: (event) => onChange(event.target.value),
    placeholder,
  };

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-800 md:text-base">
          {label}
        </label>
        <span className="shrink-0 text-xs text-slate-400 md:text-sm">
          {value.length} / {max}
        </span>
      </div>
      {multiline ? <StaysTextarea rows={5} {...controlProps} /> : <StaysInput {...controlProps} />}
    </div>
  );
}

export default function Step07HostProfile({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const profile = {
    ...EMPTY_PROFILE,
    ...(property.hostProfile || {}),
    property: { ...EMPTY_PROFILE.property, ...property.hostProfile?.property },
    host: { ...EMPTY_PROFILE.host, ...property.hostProfile?.host },
    neighbourhood: {
      ...EMPTY_PROFILE.neighbourhood,
      ...property.hostProfile?.neighbourhood,
    },
  };

  const toggleSection = (key, included) =>
    patch({ hostProfile: { ...profile, none: false, [key]: { ...profile[key], included } } });

  const toggleNone = (checked) =>
    patch({
      hostProfile: checked
        ? {
            ...profile,
            none: true,
            property: { ...profile.property, included: false },
            host: { ...profile.host, included: false },
            neighbourhood: { ...profile.neighbourhood, included: false },
          }
        : { ...profile, none: false },
    });

  const setField = (key, changes) =>
    patch({ hostProfile: { ...profile, [key]: { ...profile[key], ...changes } } });

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
        Host profile
      </h1>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 md:mt-10 md:p-8">
        <p className="text-sm leading-relaxed text-slate-700 md:text-base">
          Help your listing stand out by telling potential guests a bit more about yourself, your
          property and your neighbourhood. This information will be shown on your property page.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <SectionCheckbox
              label="The property"
              checked={profile.property.included}
              onChange={(event) => toggleSection("property", event.target.checked)}
            />
            {profile.property.included && (
              <div className="mt-4">
                <CounterField
                  label="About the property"
                  max={1200}
                  value={profile.property.about}
                  onChange={(value) => setField("property", { about: value })}
                  placeholder="What makes your place unique? What can guests expect?"
                />
              </div>
            )}
          </div>

          <div>
            <SectionCheckbox
              label="The host"
              checked={profile.host.included}
              onChange={(event) => toggleSection("host", event.target.checked)}
            />
            {profile.host.included && (
              <div className="mt-4 space-y-5">
                <CounterField
                  label="Host name"
                  max={80}
                  value={profile.host.name}
                  onChange={(value) => setField("host", { name: value })}
                  multiline={false}
                />
                <CounterField
                  label="About the host"
                  max={1200}
                  value={profile.host.about}
                  onChange={(value) => setField("host", { about: value })}
                  placeholder="What are your interests? What do you like about hosting?"
                />
              </div>
            )}
          </div>

          <div>
            <SectionCheckbox
              label="The neighbourhood"
              checked={profile.neighbourhood.included}
              onChange={(event) => toggleSection("neighbourhood", event.target.checked)}
            />
            {profile.neighbourhood.included && (
              <div className="mt-4">
                <CounterField
                  label="About the neighbourhood"
                  max={1200}
                  value={profile.neighbourhood.about}
                  onChange={(value) => setField("neighbourhood", { about: value })}
                  placeholder="What's the area like? Are there any attractions nearby?"
                />
              </div>
            )}
          </div>

          <SectionCheckbox
            label="None of the above/I'll add these later"
            checked={profile.none}
            onChange={(event) => toggleNone(event.target.checked)}
          />
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
