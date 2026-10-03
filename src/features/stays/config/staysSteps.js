/**
 * The property builder's step model — the Stays mirror of `gygSteps.js`,
 * rebuilt on Booking.com's become-a-host sequence (see
 * `scripts/booking-host-crawl/STEP-MAP.md`) and grouped into the supplier's
 * five working categories.
 *
 * Seventeen steps across five sections. Step 1, "Category & property type",
 * is the pre-builder intro chain — the four category cards and their
 * follow-up questions — so it is flagged `preBuilder` and has no builder
 * page; the draft is created at the end of the chain and the builder opens at
 * step 2. Basic Information (location, channel manager), Photos, Property
 * Setup (languages, house rules, property name, host profile, property
 * details, amenities, services, booking preference and payments), Pricing and
 * Calendar (price per night, rate plans, availability), and finally Review &
 * Submit.
 *
 * `stepId` slugs drive the builder URL (`?section=&step=`), so deep links and
 * refreshes reopen the same step. `fullBleed` steps render without the padded
 * step header and the builder footer: they own their viewport (the location
 * map) and their own Back/Continue controls.
 */
export const STAYS_SECTIONS = [
  { id: "basic-information", label: "Basic Information" },
  { id: "photos", label: "Photos" },
  { id: "property-setup", label: "Property Setup" },
  { id: "pricing-calendar", label: "Pricing and Calendar" },
  { id: "review-submit", label: "Review & Submit" },
];

export const STAYS_BUILDER_STEPS = [
  {
    id: 1,
    label: "Category & property type",
    sectionId: "basic-information",
    stepId: "category",
    hint: "Tell travellers what kind of stay they can book.",
    // Answered by the intro chain (the four cards and their follow-ups) before
    // a draft exists; the builder itself never renders a page for this step.
    preBuilder: true,
  },
  {
    id: 2,
    label: "Location",
    sectionId: "basic-information",
    stepId: "location",
    hint: "Help guests find the entrance easily.",
    fullBleed: true,
  },
  {
    id: 3,
    label: "Channel manager",
    sectionId: "basic-information",
    stepId: "channel-manager",
    hint: "Connect the listing to the tool that keeps rates and availability in sync.",
    // Renders its own "Connect to a channel manager" heading and reference
    // footer (back arrow + Continue), so the standard ones are skipped.
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 4,
    label: "Photos",
    sectionId: "photos",
    stepId: "photos",
    hint: "Let your property make a strong first impression.",
    // Renders its own "What does your place look like?" heading, the upload
    // card and the reference footer (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 5,
    label: "Languages",
    sectionId: "property-setup",
    stepId: "languages",
    hint: "Tell guests which languages you or your staff speak.",
    // Renders its own "What languages do you or your staff speak?" heading and
    // the reference footer (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 6,
    label: "House rules",
    sectionId: "property-setup",
    stepId: "house-rules",
    hint: "Make the stay expectations clear.",
    // Renders its own "House rules" heading and the reference footer
    // (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 7,
    label: "Property name",
    sectionId: "property-setup",
    stepId: "identity",
    hint: "The name guests will see in search results.",
    // Renders its own "What's the name of your place?" heading and the
    // reference footer (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 8,
    label: "Host profile",
    sectionId: "property-setup",
    stepId: "host-profile",
    hint: "Tell guests about the property, the host and the neighbourhood.",
    // Renders its own "Host profile" heading and the reference footer
    // (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 9,
    label: "Property details",
    sectionId: "property-setup",
    stepId: "property-details",
    hint: "Sleeping arrangements, guests, bathrooms and size.",
    // Renders its own "Property details" heading and the reference footer
    // (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 10,
    label: "Amenities",
    sectionId: "property-setup",
    stepId: "amenities",
    hint: "Show what guests can use at the property.",
    // Renders its own "What can guests use at your place?" heading and the
    // reference footer (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 11,
    label: "Services",
    sectionId: "property-setup",
    stepId: "services",
    hint: "Breakfast and parking.",
    // Renders its own "Services at your property" heading and the reference
    // footer (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 12,
    label: "How you receive bookings",
    sectionId: "property-setup",
    stepId: "booking-preference",
    hint: "Instant bookings or guest requests.",
    // Renders its own "How you receive bookings" heading and the reference
    // footer (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 13,
    label: "Payments & invoicing",
    sectionId: "property-setup",
    stepId: "payments",
    hint: "Choose how guests pay and who the invoice is addressed to.",
  },
  {
    id: 14,
    label: "Price per night",
    sectionId: "pricing-calendar",
    stepId: "price-per-night",
    hint: "Set the nightly price guests pay.",
    // Renders its own "Price per night" heading and the reference footer
    // (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 15,
    label: "Rate plans",
    sectionId: "pricing-calendar",
    stepId: "rates",
    hint: "Recommended plans you can edit now or later.",
    // Renders its own "Rate plans" heading and the reference footer
    // (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 16,
    label: "Availability",
    sectionId: "pricing-calendar",
    stepId: "availability",
    hint: "Choose when bookings can begin.",
    // Renders its own "Availability" heading and the reference footer
    // (back arrow + Continue).
    hideHeader: true,
    hideFooter: true,
  },
  {
    id: 17,
    label: "Open for bookings",
    sectionId: "review-submit",
    stepId: "review",
    hint: "The final checks before your listing goes live.",
    // Renders its own closing screen with the Open for bookings / I'm not
    // ready actions.
    hideHeader: true,
    hideFooter: true,
  },
];

export const STAYS_BUILDER_STEP_COUNT = STAYS_BUILDER_STEPS.length;

/**
 * Index of the first step the draft builder can open — the category step is
 * answered by the intro chain before a draft exists, so the builder floors
 * itself here (no Back into the pre-builder question).
 */
export const STAYS_FIRST_BUILDER_INDEX = Math.max(
  0,
  STAYS_BUILDER_STEPS.findIndex((step) => !step.preBuilder),
);

/** Zero-based step index for a `?section=&step=` pair (falls back to step 1). */
export function getStaysStepIndex(sectionId, stepId) {
  const index = STAYS_BUILDER_STEPS.findIndex(
    (step) => step.sectionId === sectionId && step.stepId === stepId,
  );
  return index >= 0 ? index : 0;
}
