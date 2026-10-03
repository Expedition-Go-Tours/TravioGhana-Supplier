import { StaysSelect } from "./StaysForm";

/**
 * The property switcher for the property-scoped pages. Fixes the prototype
 * quirk where Availability/Rates/Rooms silently operated on a hidden "active
 * property" with no visible control (Policies was the only page with one).
 */
export default function StaysPropertySelect({ properties, value, onChange, className }) {
  if (!properties?.length) return null;

  return (
    <StaysSelect
      aria-label="Selected property"
      options={properties.map((property) => ({ value: property.id, label: property.name }))}
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Select a property"
      className={className}
    />
  );
}
