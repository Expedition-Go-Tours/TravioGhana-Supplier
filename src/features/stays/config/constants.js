import { STAYS_BUILDER_STEP_COUNT } from "./staysSteps";

/**
 * Prototype option lists for the Stays workspace — property types, the nine
 * builder steps and their hints, facilities, Ghana's regions, room kinds and
 * the plan/rate vocabularies. Kept in one module so the builder, the modals
 * and the policies page can never disagree about what "Lodge" or "Half board"
 * means.
 */

export const PROPERTY_TYPES = [
  "Hotel",
  "Apartment",
  "Guesthouse",
  "Resort",
  "Hostel",
  "Villa",
  "Holiday home",
  "Lodge",
  "Bed & Breakfast",
  "Homestay",
  "Serviced apartment",
  "Other",
];

export const BOOKING_TYPES = ["Individual rooms", "Entire property", "Both"];
export const OPERATING_STATUSES = ["Open now", "Opening soon"];

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Volta",
  "Western",
  "Western North",
  "Northern",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Oti",
  "North East",
  "Savannah",
];

export const FACILITIES = [
  "Free Wi-Fi",
  "Swimming pool",
  "Restaurant",
  "Bar",
  "Free parking",
  "Airport shuttle",
  "Fitness centre",
  "Spa",
  "Room service",
  "24-hour front desk",
  "Air conditioning",
  "Breakfast",
  "Family rooms",
  "Laundry",
  "Luggage storage",
];

export const ROOM_KINDS = [
  "Single Room",
  "Double Room",
  "Twin Room",
  "Deluxe Room",
  "King Room",
  "Family Room",
  "Suite",
  "Studio",
  "Apartment",
  "Villa",
  "Dormitory bed",
  "Entire home",
  "Custom",
];

export const BATHROOM_TYPES = ["Private", "Shared"];

export const MEAL_PLANS = [
  "Room only",
  "Breakfast included",
  "Half board",
  "Full board",
  "All inclusive",
];

export const PRICING_MODELS = ["Fixed nightly rate", "Derived from room base rate"];

export const CANCELLATION_TERMS = ["Free cancellation", "Partially refundable", "Non-refundable"];

export const LATE_CANCELLATION_CHARGES = ["First night", "50% of stay", "Full stay", "No charge"];

export const NO_SHOW_CHARGES = ["First night", "Full stay", "No charge"];

export const ADVANCE_WINDOWS = ["3 months", "6 months", "12 months", "18 months", "No limit"];

/** How many builder steps a property must complete before it is "Ready". */
export const BUILDER_STEP_COUNT = STAYS_BUILDER_STEP_COUNT;

/** Places a draft's progress into the properties card's corner label. */
export function propertyProgressLabel(property) {
  if (property?.status === "Draft") {
    const step = Math.min(Number(property.step) || 0, BUILDER_STEP_COUNT);
    return `${Math.round((step / BUILDER_STEP_COUNT) * 100)}% complete`;
  }
  return "Ready";
}
