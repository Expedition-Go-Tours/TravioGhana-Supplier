import { StaysField, StaysInput } from "../components/StaysForm";

/**
 * STEP 1 — Property name.
 *
 * The name-first step: before anything else, the supplier tells us what the
 * property is called. It is the only required field here; Save & Continue
 * validates it before moving on.
 */
export default function Step01Name({ property, patch }) {
  return (
    <div className="max-w-[560px]">
      <StaysField label="Property name *">
        <StaysInput
          value={property.name === "Untitled property" ? "" : property.name || ""}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder="Akwaaba Coast Hotel"
          autoFocus
        />
      </StaysField>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
        Guests see this name in search results and on their booking confirmation. You can change it at any
        time before your listing goes live.
      </p>
    </div>
  );
}
