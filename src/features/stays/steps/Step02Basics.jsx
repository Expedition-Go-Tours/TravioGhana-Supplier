import { StaysField, StaysSelect, StaysTextarea } from "../components/StaysForm";
import { BOOKING_TYPES, OPERATING_STATUSES, PROPERTY_TYPES } from "../config/constants";
import { Subhead } from "./stepBits";

/** STEP 1 — Property basics: type chooser + name, booking model, descriptions. */
export default function Step01Basics({ property, patch }) {
  return (
    <>
      <Subhead>What type of property are you listing?</Subhead>
      <div className="grid grid-cols-2 gap-[9px] md:grid-cols-3">
        {PROPERTY_TYPES.map((type) => {
          const selected = property.type === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => patch({ type })}
              aria-pressed={selected}
              className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors sm:p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                selected
                  ? "border-emerald-500 bg-emerald-50 shadow-[inset_0_0_0_1px_#10b981]"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaysField label="How is it booked?">
          <StaysSelect
            options={BOOKING_TYPES}
            value={property.bookingType || "Individual rooms"}
            onChange={(event) => patch({ bookingType: event.target.value })}
          />
        </StaysField>
        <StaysField label="Operating status">
          <StaysSelect
            options={OPERATING_STATUSES}
            value={property.operating || "Open now"}
            onChange={(event) => patch({ operating: event.target.value })}
          />
        </StaysField>
        <StaysField label="Short description" hint="Up to 250 characters" wide>
          <StaysTextarea
            rows={3}
            maxLength={250}
            value={property.shortDescription || ""}
            onChange={(event) => patch({ shortDescription: event.target.value })}
            placeholder="A concise introduction guests can scan in search results."
          />
        </StaysField>
        <StaysField label="Full property description" hint="Up to 3,000 characters" wide>
          <StaysTextarea
            rows={7}
            maxLength={3000}
            value={property.description || ""}
            onChange={(event) => patch({ description: event.target.value })}
            placeholder="Describe the atmosphere, location, facilities and what makes the stay special."
          />
        </StaysField>
      </div>
    </>
  );
}
