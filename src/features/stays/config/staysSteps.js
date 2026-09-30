/**
 * The property builder's step model — the Stays mirror of `gygSteps.js`.
 *
 * Ten steps across five sections. The first step asks for the property name
 * before anything else, matching the product builder's name-first flow; the
 * nine original steps keep their fields, order and validation.
 *
 * `stepId` slugs drive the builder URL (`?section=&step=`), so deep links and
 * refreshes reopen the same step.
 */
export const STAYS_SECTIONS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "property-content", label: "Property Content", collapsible: true },
  { id: "rates-availability", label: "Rates & availability" },
  { id: "policies-media", label: "Policies & media" },
  { id: "review-submit", label: "Review & Submit" },
];

export const STAYS_BUILDER_STEPS = [
  {
    id: 1,
    label: "Property name",
    sectionId: "getting-started",
    stepId: "name",
    hint: "This is the name guests see when they book your property.",
  },
  {
    id: 2,
    label: "Property basics",
    sectionId: "getting-started",
    stepId: "basics",
    hint: "Tell travellers what kind of stay they can book.",
  },
  {
    id: 3,
    label: "Location",
    sectionId: "getting-started",
    stepId: "location",
    hint: "Help guests find the entrance easily.",
  },
  {
    id: 4,
    label: "Facilities",
    sectionId: "property-content",
    stepId: "facilities",
    hint: "Show the facilities that matter to guests.",
  },
  {
    id: 5,
    label: "Rooms & units",
    sectionId: "property-content",
    stepId: "rooms",
    hint: "Add each room type or entire unit separately.",
  },
  {
    id: 6,
    label: "Rates & plans",
    sectionId: "rates-availability",
    stepId: "rates",
    hint: "Create bookable rates with prices, rules and cancellation cutoffs.",
  },
  {
    id: 7,
    label: "Availability",
    sectionId: "rates-availability",
    stepId: "availability",
    hint: "Choose when bookings can begin.",
  },
  {
    id: 8,
    label: "Rules & policies",
    sectionId: "policies-media",
    stepId: "policies",
    hint: "Make the stay expectations clear.",
  },
  {
    id: 9,
    label: "Photos",
    sectionId: "policies-media",
    stepId: "photos",
    hint: "Let your property make a strong first impression.",
  },
  {
    id: 10,
    label: "Review & submit",
    sectionId: "review-submit",
    stepId: "review",
    hint: "Check your listing before submitting.",
  },
];

export const STAYS_BUILDER_STEP_COUNT = STAYS_BUILDER_STEPS.length;

/** Zero-based step index for a `?section=&step=` pair (falls back to step 1). */
export function getStaysStepIndex(sectionId, stepId) {
  const index = STAYS_BUILDER_STEPS.findIndex(
    (step) => step.sectionId === sectionId && step.stepId === stepId,
  );
  return index >= 0 ? index : 0;
}
