import { StaysField, StaysInput, StaysSelect } from "../components/StaysForm";
import { GHANA_REGIONS } from "../config/constants";
import { ReviewBox } from "./stepBits";

/** STEP 2 — Location: region, city, street address, GhanaPost GPS, landmark. */
export default function Step02Location({ property, patch }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaysField label="Country">
          <StaysSelect options={["Ghana"]} value={property.country || "Ghana"} onChange={(event) => patch({ country: event.target.value })} />
        </StaysField>
        <StaysField label="Region *">
          <StaysSelect
            options={GHANA_REGIONS}
            value={property.region || "Greater Accra"}
            onChange={(event) => patch({ region: event.target.value })}
          />
        </StaysField>
        <StaysField label="City / town *">
          <StaysInput value={property.city || ""} onChange={(event) => patch({ city: event.target.value })} placeholder="Accra" />
        </StaysField>
        <StaysField label="Street address *">
          <StaysInput
            value={property.address || ""}
            onChange={(event) => patch({ address: event.target.value })}
            placeholder="12 Labone Crescent"
          />
        </StaysField>
        <StaysField label="GhanaPost GPS">
          <StaysInput value={property.gps || ""} onChange={(event) => patch({ gps: event.target.value })} placeholder="GA-123-4567" />
        </StaysField>
        <StaysField label="Nearby landmark">
          <StaysInput value={property.landmark || ""} onChange={(event) => patch({ landmark: event.target.value })} placeholder="Close to Independence Square" />
        </StaysField>
      </div>
      <ReviewBox title="Map pin">
        In the live product, providers will place an exact entrance pin. This prototype records the written
        address.
      </ReviewBox>
    </>
  );
}
