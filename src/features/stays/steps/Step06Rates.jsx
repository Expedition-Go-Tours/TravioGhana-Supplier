import RatePlanCards from "../components/RatePlanCards";
import { Footnote, Notice } from "./stepBits";

/** STEP 5 — Rates & plans: each room needs at least one bookable plan. */
export default function Step05Rates({ property, onAddPlan, onEditPlan }) {
  if (!property.rooms?.length) {
    return (
      <p className="text-sm text-slate-500">Add a room in the previous step before creating rate plans.</p>
    );
  }

  return (
    <>
      <Notice title="Sell each room with a clear rate plan">
        Set the nightly price, meals, booking window, stay restrictions and cancellation terms for each room.
      </Notice>
      <RatePlanCards property={property} onAddPlan={onAddPlan} onEditPlan={onEditPlan} />
      <Footnote>
        At least one rate plan is needed for every room type. Add flexible, non-refundable or breakfast rates to
        give guests more choice.
      </Footnote>
    </>
  );
}
