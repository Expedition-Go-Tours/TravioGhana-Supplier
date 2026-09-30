import { StaysField, StaysInput, StaysSelect, StaysTextarea } from "../components/StaysForm";
import { ReviewBox } from "./stepBits";

/** STEP 7 — Rules & policies: the guest-facing house rules block. */
export default function Step07Policies({ property, patch }) {
  const bind = (key) => (event) => patch({ [key]: event.target.value });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaysField label="Check-in from">
          <StaysInput type="time" value={property.checkin || ""} onChange={bind("checkin")} />
        </StaysField>
        <StaysField label="Checkout by">
          <StaysInput type="time" value={property.checkout || ""} onChange={bind("checkout")} />
        </StaysField>
        <StaysField label="Check-in until">
          <StaysInput type="time" value={property.checkinEnd || ""} onChange={bind("checkinEnd")} />
        </StaysField>
        <StaysField label="Minimum check-in age">
          <StaysInput type="number" min="0" max="100" value={property.minAge || ""} onChange={bind("minAge")} />
        </StaysField>
        <StaysField label="Children">
          <StaysSelect options={["Welcome", "Adults only"]} value={property.children || "Welcome"} onChange={bind("children")} />
        </StaysField>
        <StaysField label="Pets">
          <StaysSelect options={["Not allowed", "Allowed", "On request"]} value={property.pets || "Not allowed"} onChange={bind("pets")} />
        </StaysField>
        <StaysField label="Smoking">
          <StaysSelect options={["No smoking", "Designated areas", "Allowed"]} value={property.smoking || "No smoking"} onChange={bind("smoking")} />
        </StaysField>
        <StaysField label="Parties">
          <StaysSelect options={["Not allowed", "Allowed", "On request"]} value={property.parties || "Not allowed"} onChange={bind("parties")} />
        </StaysField>
        <StaysField label="Extra beds">
          <StaysSelect
            options={["Not available", "Available on request", "Available"]}
            value={property.extraBeds || "Not available"}
            onChange={bind("extraBeds")}
          />
        </StaysField>
        <StaysField label="Cots">
          <StaysSelect
            options={["Not available", "Available on request", "Available"]}
            value={property.cots || "Not available"}
            onChange={bind("cots")}
          />
        </StaysField>
        <StaysField label="Quiet hours from">
          <StaysInput type="time" value={property.quietFrom || ""} onChange={bind("quietFrom")} />
        </StaysField>
        <StaysField label="Quiet hours until">
          <StaysInput type="time" value={property.quietTo || ""} onChange={bind("quietTo")} />
        </StaysField>
        <StaysField label="Additional house rules" wide>
          <StaysTextarea rows={4} value={property.houseNotes || ""} onChange={bind("houseNotes")} />
        </StaysField>
      </div>
      <ReviewBox title="Cancellation terms are set per rate plan">
        Use Rates & plans to set the guest's free cancellation cutoff, late charge, no-show terms and booking
        cutoff for each room rate.
      </ReviewBox>
    </>
  );
}
