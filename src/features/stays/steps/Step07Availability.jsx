import { StaysField, StaysInput, StaysSelect } from "../components/StaysForm";
import { ADVANCE_WINDOWS } from "../config/constants";
import { ReviewBox } from "./stepBits";

/** STEP 6 — Availability: when bookings can begin and how far ahead. */
export default function Step06Availability({ property, patch }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaysField label="First date guests can stay *">
          <StaysInput
            type="date"
            value={property.start || ""}
            onChange={(event) => patch({ start: event.target.value })}
          />
        </StaysField>
        <StaysField label="How far ahead can guests book?">
          <StaysSelect
            options={ADVANCE_WINDOWS}
            value={property.advance || "12 months"}
            onChange={(event) => patch({ advance: event.target.value })}
          />
        </StaysField>
      </div>
      <ReviewBox title="Starting inventory">
        Each room starts with its total unit count. After submission, use the calendar for individual dates,
        closures and price changes.
      </ReviewBox>
    </>
  );
}
