import { Check, ChevronLeft, Minus, Plus, PlusCircle } from "lucide-react";
import StaysButton from "../components/StaysButton";
import { StaysField, StaysInput, StaysSelect } from "../components/StaysForm";

/**
 * STEP 8 — Property details, Booking's "Property details" page: sleeping
 * arrangements with add/remove bedrooms, the guest and bathroom counters, the
 * children/cots questions and the optional size. The reference's blue accents
 * are the stays emerald.
 *
 * Children/cots map onto the existing policy vocabulary (`children`:
 * Welcome/Adults only, `cots`: Available/Not available) so the Policies page
 * keeps working. The step owns its reference footer (back arrow + Continue),
 * which saves the draft before advancing.
 */

const SIZE_UNITS = ["square metres", "square feet"];

function bedSummary(bedroom) {
  const parts = [];
  if (bedroom.doubleBeds) {
    parts.push(`${bedroom.doubleBeds} double ${bedroom.doubleBeds === 1 ? "bed" : "beds"}`);
  }
  if (bedroom.singleBeds) {
    parts.push(`${bedroom.singleBeds} single ${bedroom.singleBeds === 1 ? "bed" : "beds"}`);
  }
  return parts.length ? parts.join(", ") : "0 beds";
}

function SleepingRow({ name, subtitle, onRemove }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 rounded-lg border border-slate-200 px-4 py-3">
        <p className="truncate text-sm font-medium text-slate-800 md:text-base">{name}</p>
        <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-300 text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          <Minus size={16} />
        </button>
      )}
    </div>
  );
}

function Counter({ label, value, min = 0, max = 50, onChange }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid h-11 w-11 place-items-center text-slate-500 transition-colors hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={18} />
      </button>
      <span className="w-10 text-center text-lg text-slate-800">{value}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-11 w-11 place-items-center text-emerald-600 transition-colors hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

function InlineRadios({ name, value, onChange }) {
  return (
    <div className="flex items-center gap-6" role="radiogroup" aria-label={name}>
      {[
        { label: "Yes", option: "yes" },
        { label: "No", option: "no" },
      ].map(({ label, option }) => {
        const checked = value === option;
        return (
          <label key={option} className="flex cursor-pointer items-center gap-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all ${
                checked ? "border-emerald-600" : "border-slate-400"
              }`}
            >
              {checked && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
            </span>
            <span className="text-base text-slate-800">{label}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function Step08PropertyDetails({
  property,
  patch,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const sleeping = property.sleeping || {};
  const bedrooms = sleeping.bedrooms || [
    { id: "bed-1", name: "Bedroom 1", doubleBeds: 1, singleBeds: 0 },
  ];
  const livingRoomBeds = sleeping.livingRoomBeds ?? 0;
  const otherSpacesBeds = sleeping.otherSpacesBeds ?? 0;

  const maxGuests = property.maxGuests ?? 2;
  const bathrooms = property.bathrooms ?? 1;
  const excludeInfants = property.excludeInfants ?? false;
  const allowsChildren = property.children !== "Adults only";
  const offersCots = property.cots === "Available";
  const propertyType = property.type || "Property";

  const setSleeping = (changes) =>
    patch({
      sleeping: { ...sleeping, bedrooms, livingRoomBeds, otherSpacesBeds, ...changes },
    });

  const addBedroom = () =>
    setSleeping({
      bedrooms: [
        ...bedrooms,
        {
          id: `bed-${Date.now().toString(36)}`,
          name: `Bedroom ${bedrooms.length + 1}`,
          doubleBeds: 0,
          singleBeds: 0,
        },
      ],
    });

  const removeBedroom = (id) =>
    setSleeping({ bedrooms: bedrooms.filter((bedroom) => bedroom.id !== id) });

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
        Property details
      </h1>

      <div className="mt-8 space-y-5 md:mt-10">
        {/* Sleeping arrangements */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
          <h2 className="text-base font-medium text-slate-800 md:text-lg">
            Where can people sleep?
          </h2>
          <div className="mt-4 space-y-3">
            {bedrooms.map((bedroom) => (
              <SleepingRow
                key={bedroom.id}
                name={bedroom.name}
                subtitle={bedSummary(bedroom)}
                onRemove={() => removeBedroom(bedroom.id)}
              />
            ))}
            <SleepingRow name="Living room" subtitle={`${livingRoomBeds} beds`} />
            <SleepingRow name="Other spaces" subtitle={`${otherSpacesBeds} beds`} />
          </div>
          <button
            type="button"
            onClick={addBedroom}
            className="mt-4 inline-flex items-center gap-2 text-base font-medium text-emerald-700 transition-colors hover:text-emerald-800"
          >
            <PlusCircle size={18} aria-hidden="true" />
            Add bedroom
          </button>
        </section>

        {/* Guests & bathrooms */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
          <h2 className="text-base font-medium text-slate-800 md:text-lg">
            How many guests can stay?
          </h2>
          <div className="mt-4">
            <Counter
              label="guests"
              value={maxGuests}
              min={1}
              max={50}
              onChange={(value) => patch({ maxGuests: value })}
            />
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/30">
            <input
              type="checkbox"
              checked={excludeInfants}
              onChange={(event) => patch({ excludeInfants: event.target.checked })}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border-2 text-white transition-colors ${
                excludeInfants ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
              }`}
            >
              {excludeInfants && <Check size={14} strokeWidth={3} />}
            </span>
            <span className="text-sm text-slate-800 md:text-base">
              Exclude infants (0–2 years old) from total number of guests
            </span>
          </label>

          <h2 className="mt-8 text-base font-medium text-slate-800 md:text-lg">
            How many bathrooms are there?
          </h2>
          <div className="mt-4">
            <Counter
              label="bathrooms"
              value={bathrooms}
              min={1}
              max={20}
              onChange={(value) => patch({ bathrooms: value })}
            />
          </div>
        </section>

        {/* Children & cots */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
          <h2 className="text-base font-medium text-slate-800 md:text-lg">
            Do you allow children?
          </h2>
          <div className="mt-3">
            <InlineRadios
              name="children"
              value={allowsChildren ? "yes" : "no"}
              onChange={(value) => patch({ children: value === "yes" ? "Welcome" : "Adults only" })}
            />
          </div>

          <h2 className="mt-8 text-base font-medium text-slate-800 md:text-lg">
            Do you offer cots?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 md:text-base">
            Cots sleep most infants 0–3 and can be made available to guests on request.
          </p>
          <div className="mt-3">
            <InlineRadios
              name="cots"
              value={offersCots ? "yes" : "no"}
              onChange={(value) =>
                patch({ cots: value === "yes" ? "Available" : "Not available" })
              }
            />
          </div>
        </section>

        {/* Size */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">
          <h2 className="text-base font-medium text-slate-800 md:text-lg">
            How big is this {propertyType.toLowerCase()}?
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <StaysField label={`${propertyType} size – optional`} className="min-w-[220px] flex-1">
              <StaysInput
                inputMode="numeric"
                value={property.size || ""}
                onChange={(event) => patch({ size: event.target.value })}
              />
            </StaysField>
            <StaysSelect
              options={SIZE_UNITS}
              value={property.sizeUnit || "square metres"}
              onChange={(event) => patch({ sizeUnit: event.target.value })}
              className="w-full sm:w-[200px]"
            />
          </div>
        </section>
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
