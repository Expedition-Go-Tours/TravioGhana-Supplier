import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft } from "lucide-react";
import StaysButton from "../components/StaysButton";
import StaysBuilderFrame from "../components/StaysBuilderFrame";
import PropertyScopeIcon from "../components/PropertyScopeIcon";
import { StaysField, StaysInput } from "../components/StaysForm";
import { PROPERTY_GROUPS } from "../config/constants";

const MIN_PROPERTY_COUNT = 1;
const DEFAULT_PROPERTY_COUNT = 2;
const MAX_PROPERTY_COUNT = 100;

/** The selected-state tick that straddles an option card's top-right corner. */
function SelectedTick() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-3 -top-3 grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white shadow-sm ring-4 ring-white"
    >
      <Check size={16} strokeWidth={3} />
    </span>
  );
}

/** One selectable card — used by both the scope and the address questions. */
function OptionCard({ name, value, label, icon, selected, onSelect }) {
  return (
    <label
      className={`relative flex w-full cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-4 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30 md:gap-6 md:px-6 md:py-6 ${
        selected
          ? "border-emerald-600 bg-emerald-50/30"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <PropertyScopeIcon
        variant={icon}
        className="h-12 w-12 shrink-0 text-emerald-600 md:h-16 md:w-16"
      />
      <span className="min-w-0 flex-1 text-center text-sm font-semibold text-slate-800 sm:text-base md:text-lg">
        {label}
      </span>
      {selected && <SelectedTick />}
    </label>
  );
}

/**
 * The first Quick start question — Booking's "How many apartments are you
 * listing?" screen in the stays emerald.
 *
 * One apartment: Continue leads to the confirmation screen. Multiple
 * apartments: the address question and property count appear inline. Either
 * way this screen only collects answers — the draft is created on the final
 * intro screen (other listings), so leaving through Back leaves nothing
 * behind. Answers ride in the URL when stepping back and forth.
 */
export default function PropertyScopePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const group =
    PROPERTY_GROUPS.find((entry) => entry.id === searchParams.get("group")) ||
    PROPERTY_GROUPS.find((entry) => entry.quickStart) ||
    PROPERTY_GROUPS[0];
  const noun = group.scope || { singular: group.label.toLowerCase(), plural: group.label.toLowerCase() };
  const question = `How many ${noun.plural} are you listing?`;
  const addressQuestion = "Are these properties in the same address or building?";
  const draftParam = searchParams.get("draft");
  const draftQuery = draftParam ? `&draft=${draftParam}` : "";

  // Returning from a later intro screen restores every answer from the URL.
  const [scope, setScope] = useState(() => {
    const value = searchParams.get("scope");
    if (value === "one") return "One property";
    if (value === "multiple") return "Multiple properties";
    return null;
  });
  const [sameAddress, setSameAddress] = useState(() => {
    const value = searchParams.get("sameAddress");
    return value === "same" || value === "different" ? value : null;
  });
  const [propertyCount, setPropertyCount] = useState(() => {
    const parsed = Number.parseInt(searchParams.get("count"), 10);
    return Number.isInteger(parsed) && parsed >= MIN_PROPERTY_COUNT && parsed <= MAX_PROPERTY_COUNT
      ? String(parsed)
      : String(DEFAULT_PROPERTY_COUNT);
  });

  const scopeOptions = [
    { value: "One property", label: `One ${noun.singular}`, icon: "single" },
    { value: "Multiple properties", label: `Multiple ${noun.plural}`, icon: "multiple" },
  ];
  const addressOptions = [
    {
      value: "same",
      label: `Yes, these ${noun.plural} are at the same address or building`,
      icon: "pin",
    },
    {
      value: "different",
      label: `No, these ${noun.plural} are at different addresses or buildings`,
      icon: "pins",
    },
  ];

  const count = Number.parseInt(propertyCount, 10);
  const countValid =
    Number.isInteger(count) && count >= MIN_PROPERTY_COUNT && count <= MAX_PROPERTY_COUNT;
  const canContinue =
    scope === "One property" || (scope === "Multiple properties" && sameAddress !== null && countValid);

  const handleContinue = () => {
    if (!canContinue) return;
    if (scope === "One property") {
      navigate(
        `/stays/properties/build/quick-start/confirm?group=${group.id}&scope=one${draftQuery}`,
      );
      return;
    }
    navigate(
      `/stays/properties/build/quick-start/other-listings?group=${group.id}&scope=multiple&sameAddress=${sameAddress}&count=${count}${draftQuery}`,
    );
  };

  return (
    <StaysBuilderFrame currentIndex={0} completedCount={0}>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-bold leading-tight text-slate-800 md:text-[32px]">
          {question}
        </h1>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 md:mt-10 md:p-6">
        <div className="space-y-4 md:space-y-5" role="radiogroup" aria-label={question}>
          {scopeOptions.map((option) => (
            <OptionCard
              key={option.value}
              name="listingScope"
              value={option.value}
              label={option.label}
              icon={option.icon}
              selected={scope === option.value}
              onSelect={setScope}
            />
          ))}
        </div>

        {scope === "Multiple properties" && (
          <div className="mt-8 md:mt-10">
            <p className="text-sm font-semibold text-slate-800 md:text-base">{addressQuestion}</p>
            <div
              className="mt-4 space-y-4 md:space-y-5"
              role="radiogroup"
              aria-label={addressQuestion}
            >
              {addressOptions.map((option) => (
                <OptionCard
                  key={option.value}
                  name="sameAddress"
                  value={option.value}
                  label={option.label}
                  icon={option.icon}
                  selected={sameAddress === option.value}
                  onSelect={setSameAddress}
                />
              ))}
            </div>

            <div className="mt-8">
              <StaysField label="Number of properties">
                <StaysInput
                  className="w-28 md:w-32"
                  type="number"
                  inputMode="numeric"
                  min={MIN_PROPERTY_COUNT}
                  max={MAX_PROPERTY_COUNT}
                  value={propertyCount}
                  onChange={(event) => setPropertyCount(event.target.value)}
                />
              </StaysField>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center gap-3">
        <StaysButton
          aria-label="Back"
          onClick={() => navigate(`/stays/properties/build${draftParam ? `?draft=${draftParam}` : ""}`)}
          className="h-14 w-14 shrink-0 p-0"
        >
          <ChevronLeft size={20} />
        </StaysButton>
        <StaysButton
          variant="primary"
          className="h-14 flex-1 text-base"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continue
        </StaysButton>
      </div>
      </div>
    </StaysBuilderFrame>
  );
}
