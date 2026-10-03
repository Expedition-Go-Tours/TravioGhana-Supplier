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
  "Chalet",
  "Holiday park",
  "Aparthotel",
  "Country house",
  "Farm stay",
  "Capsule hotel",
  "Inn",
  "Love hotel",
  "Motel",
  "Riad",
  "Ryokan",
  "Campsite",
  "Boat",
  "Luxury tent",
  "Other",
];

/**
 * One-line copy for the builder's property-type cards, keyed by the canonical
 * type. Kept beside PROPERTY_TYPES so the chooser and any future picker show
 * the same wording.
 */
export const PROPERTY_TYPE_DESCRIPTIONS = {
  Hotel: "A staffed property with rooms and services, booked by the night",
  Apartment: "A self-contained flat with its own kitchen and living space",
  Guesthouse: "A smaller, homely property run by an on-site host",
  Resort: "A destination property with leisure facilities and activities",
  Hostel: "Budget-friendly rooms, often shared, with communal spaces",
  Villa: "A private, upscale house reserved for your guests",
  "Holiday home": "A whole house to rent, ideal for families and groups",
  Lodge: "A nature-focused stay, often built in a rustic style",
  "Bed & Breakfast": "A house stay that includes breakfast each morning",
  Homestay: "Live like a local by staying with a host family",
  "Serviced apartment": "A furnished flat with hotel-style services and cleaning",
  Chalet: "A free-standing home with a sloped roof, rented for holidays",
  "Holiday park": "Self-catering residences on shared grounds with facilities",
  Aparthotel: "A self-catering apartment with hotel-style facilities",
  "Country house": "A private home with simple accommodation in the countryside",
  "Farm stay": "A private farm with simple accommodation",
  "Capsule hotel": "Extremely small units or capsules offering cheap and basic overnight accommodation",
  Inn: "Small and basic accommodation with a rustic feel",
  "Love hotel": "Adult-only accommodation rented per hour or night",
  Motel: "Roadside hotel for motorists, with parking and few amenities",
  Riad: "Traditional Moroccan accommodation with a courtyard and luxury feel",
  Ryokan: "Traditional Japanese-style accommodation with meal options",
  Campsite: "Cabins or bungalows alongside camping or caravan areas with shared facilities",
  Boat: "Commercial travel accommodation located on a boat",
  "Luxury tent": "Tents with fixed bedding and some services, in natural surroundings",
  Other: "A stay type that doesn't fit the categories above",
};

/**
 * The two Homes sub-type lists from Booking's "What can guests book?" flow,
 * shown after Entire place or A private room. `type` values are canonical
 * PROPERTY_TYPES; the copy is the reference's.
 */
export const ENTIRE_PLACE_CATEGORIES = [
  {
    type: "Apartment",
    singular: "apartment",
    plural: "apartments",
    description:
      "Furnished and self-catering accommodation available for short- and long-term rental",
  },
  {
    type: "Holiday home",
    singular: "holiday home",
    plural: "holiday homes",
    description:
      "Free-standing home with private, external entrance and rented specifically for holidays",
  },
  {
    type: "Villa",
    singular: "villa",
    plural: "villas",
    description: "Private self-standing and self-catering home with luxury feel",
  },
  {
    type: "Chalet",
    singular: "chalet",
    plural: "chalets",
    description:
      "Free-standing home characterised by sloped roof and rented specifically for holidays",
  },
  {
    type: "Holiday park",
    singular: "holiday park",
    plural: "holiday parks",
    description:
      "Private self-catering residences located on shared grounds with shared facilities or recreational activities",
  },
  {
    type: "Aparthotel",
    singular: "aparthotel",
    plural: "aparthotels",
    description: "A self-catering apartment with some hotel facilities like a reception desk",
  },
];

export const PRIVATE_ROOM_CATEGORIES = [
  {
    type: "Guesthouse",
    singular: "guest house",
    plural: "guest houses",
    description: "Private home with separate living facilities for host and guest",
  },
  {
    type: "Bed & Breakfast",
    singular: "bed and breakfast",
    plural: "bed and breakfasts",
    description: "Private home offering overnight stays and breakfast",
  },
  {
    type: "Homestay",
    singular: "homestay",
    plural: "homestays",
    description: "Private home with shared living facilities for host and guest",
  },
  {
    type: "Country house",
    singular: "country house",
    plural: "country houses",
    description: "Private home with simple accommodation in the countryside",
  },
  {
    type: "Aparthotel",
    plural: "aparthotels",
    description: "A self-catering apartment with some hotel facilities like a reception desk",
  },
  {
    type: "Farm stay",
    singular: "farm stay",
    plural: "farm stays",
    description: "Private farm with simple accommodation",
  },
  {
    type: "Lodge",
    singular: "lodge",
    plural: "lodges",
    description: "Private home with accommodation surrounded by nature, such as mountains or forest",
  },
];

/**
 * The "Hotel, B&Bs, and more" sub-type list from Booking's hotel flow — the
 * full "From the list below…" set, shown expanded on the intro screen with a
 * "Less options" toggle that falls back to the first six. `label` is the
 * reference's display title where it differs from the canonical type
 * ("Guest house" for Guesthouse, "Bed and breakfast" for Bed & Breakfast).
 */
export const HOTEL_CATEGORIES = [
  {
    type: "Hotel",
    label: "Hotel",
    singular: "hotel",
    plural: "hotels",
    description:
      "Accommodation for travellers often offering restaurants, meeting rooms and other guest services",
  },
  {
    type: "Guesthouse",
    label: "Guest house",
    singular: "guest house",
    plural: "guest houses",
    description: "Private home with separate living facilities for host and guest",
  },
  {
    type: "Bed & Breakfast",
    label: "Bed and breakfast",
    singular: "bed and breakfast",
    plural: "bed and breakfasts",
    description: "Private home offering overnight stays and breakfast",
  },
  {
    type: "Homestay",
    label: "Homestay",
    singular: "homestay",
    plural: "homestays",
    description: "Private home with shared living facilities for host and guest",
  },
  {
    type: "Hostel",
    label: "Hostel",
    singular: "hostel",
    plural: "hostels",
    description: "Budget accommodation with mostly dorm-style bedding and a social atmosphere",
  },
  {
    type: "Aparthotel",
    label: "Aparthotel",
    singular: "aparthotel",
    plural: "aparthotels",
    description: "A self-catering apartment with some hotel facilities like a reception desk",
  },
  {
    type: "Capsule hotel",
    label: "Capsule hotel",
    singular: "capsule hotel",
    plural: "capsule hotels",
    description:
      "Extremely small units or capsules offering cheap and basic overnight accommodation",
  },
  {
    type: "Country house",
    label: "Country house",
    singular: "country house",
    plural: "country houses",
    description: "Private home with simple accommodation in the countryside",
  },
  {
    type: "Farm stay",
    label: "Farm stay",
    singular: "farm stay",
    plural: "farm stays",
    description: "Private farm with simple accommodation",
  },
  {
    type: "Inn",
    label: "Inn",
    singular: "inn",
    plural: "inns",
    description: "Small and basic accommodation with a rustic feel",
  },
  {
    type: "Love hotel",
    label: "Love hotel",
    singular: "love hotel",
    plural: "love hotels",
    description: "Adult-only accommodation rented per hour or night",
  },
  {
    type: "Motel",
    label: "Motel",
    singular: "motel",
    plural: "motels",
    description:
      "Roadside hotel usually for motorists, with direct access to parking and little to no amenities",
  },
  {
    type: "Resort",
    label: "Resort",
    singular: "resort",
    plural: "resorts",
    description:
      "A place for relaxation with onsite restaurants, activities and often with a luxury feel",
  },
  {
    type: "Riad",
    label: "Riad",
    singular: "riad",
    plural: "riads",
    description: "Traditional Moroccan accommodation with a courtyard and luxury feel",
  },
  {
    type: "Ryokan",
    label: "Ryokan",
    singular: "ryokan",
    plural: "ryokans",
    description: "Traditional Japanese-style accommodation with meal options",
  },
  {
    type: "Lodge",
    label: "Lodge",
    singular: "lodge",
    plural: "lodges",
    description: "Private home with accommodation surrounded by nature, such as mountains or forest",
  },
];

/**
 * The "Alternative places" sub-type list from Booking's flow — the three
 * categories shown after "What can guests book?" (Campsite, Boat, Luxury tent).
 * No "More options" toggle: the reference shows the whole list at once.
 */
export const ALTERNATIVE_CATEGORIES = [
  {
    type: "Campsite",
    singular: "campsite",
    plural: "campsites",
    description:
      "Accommodation offering cabins or bungalows alongside areas for camping or caravans with shared facilities or recreational activities",
  },
  {
    type: "Boat",
    singular: "boat",
    plural: "boats",
    description: "Commercial travel accommodation located on a boat",
  },
  {
    type: "Luxury tent",
    singular: "luxury tent",
    plural: "luxury tents",
    description: "Tents with fixed bedding and some services, located in natural surroundings",
  },
];

/** Look a category list entry up by its canonical type, across all lists. */
export function categoryByType(type) {
  return (
    [
      ...ENTIRE_PLACE_CATEGORIES,
      ...PRIVATE_ROOM_CATEGORIES,
      ...HOTEL_CATEGORIES,
      ...ALTERNATIVE_CATEGORIES,
    ].find((category) => category.type === type) || null
  );
}

/**
 * The four category cards on the "list your property" landing page — the first
 * thing a supplier sees after clicking Add property, before the builder opens.
 *
 * Booking.com asks the same question with the same four groups; each group maps
 * onto canonical PROPERTY_TYPES so Step 1 can filter itself to the chosen group
 * and preselect `defaultType`. Every PROPERTY_TYPE belongs to exactly one group
 * (asserted in config/__tests__/constants.test.js).
 */
export const PROPERTY_GROUPS = [
  {
    id: "apartment",
    label: "Apartment",
    description:
      "Furnished and self-catering accommodation, where guests rent the entire place.",
    quickStart: true,
    // The Quick start card detours through the "how many are you listing?"
    // screen before the builder opens.
    introPath: "/stays/properties/build/quick-start",
    scope: { singular: "apartment", plural: "apartments" },
    types: ["Apartment", "Serviced apartment", "Aparthotel"],
    defaultType: "Apartment",
  },
  {
    id: "homes",
    label: "Homes",
    description: "Properties like holiday homes, villas, lodges, etc.",
    // The Homes card asks what guests can book before the builder opens.
    introPath: "/stays/properties/build/book-type",
    scope: { singular: "home", plural: "homes" },
    types: [
      "Holiday home",
      "Villa",
      "Lodge",
      "Homestay",
      "Chalet",
      "Holiday park",
      "Country house",
      "Farm stay",
    ],
    defaultType: "Holiday home",
  },
  {
    id: "hotel",
    label: "Hotel, B&Bs, and more",
    description: "Properties like hotels, B&Bs, guest houses, hostels, etc.",
    // The Hotel card asks which category is the best fit before the builder
    // opens (Booking's full sub-type list with the "Less options" toggle).
    introPath: "/stays/properties/build/hotel-category",
    scope: { singular: "hotel", plural: "hotels" },
    types: [
      "Hotel",
      "Bed & Breakfast",
      "Guesthouse",
      "Hostel",
      "Capsule hotel",
      "Inn",
      "Love hotel",
      "Motel",
      "Riad",
      "Ryokan",
    ],
    defaultType: "Hotel",
  },
  {
    id: "alternative",
    label: "Alternative places",
    description: "Properties like resorts, unique stays, and more.",
    // The Alternative card asks what guests can book, then which of its
    // categories best fits (campsite, boat, luxury tent) before the builder.
    introPath: "/stays/properties/build/book-type",
    scope: { singular: "place", plural: "places" },
    types: ["Resort", "Campsite", "Boat", "Luxury tent", "Other"],
    defaultType: "Resort",
  },
];

/** The group a canonical property type belongs to, or null for unknown types. */
export function propertyGroupForType(type) {
  return PROPERTY_GROUPS.find((group) => group.types.includes(type)) || null;
}

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

/**
 * The amenities checklist, grouped the way the reference page presents them.
 * `FACILITIES` stays as the flat vocabulary for anything that needs it.
 */
export const FACILITY_GROUPS = [
  {
    id: "general",
    label: "General",
    items: ["Air conditioning", "Heating", "Free WiFi", "Electric vehicle charging station"],
  },
  {
    id: "cooking",
    label: "Cooking and cleaning",
    items: ["Kitchen", "Kitchenette", "Washing machine"],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    items: ["Flat-screen TV", "Swimming pool", "Private hot tub", "Minibar", "Sauna"],
  },
  {
    id: "outside",
    label: "Outside and view",
    items: ["Balcony", "Garden view", "Terrace", "View"],
  },
];

export const FACILITIES = FACILITY_GROUPS.flatMap((group) => group.items);

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

/* ── Listing setup (the become-a-host questions Booking asks up front) ───── */

export const LISTING_SCOPES = ["One property", "Multiple properties"];

export const OTHER_LISTINGS = ["Airbnb", "TripAdvisor", "Vrbo", "Another website"];

/**
 * The exclusive answer on the other-listings screen — picking it clears the
 * sites above and vice versa. Kept out of `OTHER_LISTINGS` because it is not a
 * site and must never be rendered as one.
 */
export const NO_OTHER_LISTINGS = "My property isn't listed on any other websites";

export const SERVICE_CHOICES = {
  breakfast: ["Yes", "No"],
  parking: ["Yes, free", "Yes, paid", "No"],
};

export const LANGUAGES = [
  "English",
  "French",
  "Italian",
  "Russian",
  "Spanish",
  "Twi",
  "Ewe",
  "Ga",
  "Hausa",
  "Arabic",
  "Chinese",
  "Other",
];

export const HOST_PROFILE_FOCUS = [
  "The property",
  "The host",
  "The neighbourhood",
  "None of the above / I'll add these later",
];

/* ── Room detail (Booking splits these across bedroom/bathroom/amenities) ── */

export const BATHROOM_AMENITIES = [
  "Toilet paper",
  "Shower",
  "Bath",
  "Toilet",
  "Hairdryer",
  "Free toiletries",
];

export const ROOM_AMENITIES = [
  "Air conditioning",
  "Heating",
  "Wardrobe or closet",
  "Towels",
  "Linen",
  "Flat-screen TV",
  "Desk",
  "Socket near the bed",
  "Private entrance",
  "Balcony",
  "Kitchenette",
];

/* ── Payments & the closing agreement ────────────────────────────────────── */

export const PAYMENT_MODES = [
  "Online when they book",
  "By card or mobile money at the property",
];

export const OPEN_FOR_BOOKINGS_WINDOWS = ["3 months", "6 months", "12 months", "18 months"];

export const NOT_READY_REASONS = [
  "My property isn't ready to accept guests",
  "I want to connect a channel manager",
  "I want to update my calendar first",
];

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
