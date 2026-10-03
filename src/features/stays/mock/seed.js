/**
 * Sample data for the Stays workspace while the backend endpoints are being
 * built. It mirrors the signed-off prototype's dataset exactly, so parity
 * screenshots of the dashboard compare 1:1.
 *
 * Status vocabulary: the UI shows Live / Draft / Under review / Paused, which
 * maps onto the API's Tour-style enum when the real endpoints ship
 * (ACTIVE → Live, DRAFT → Draft, PENDING_APPROVAL → Under review,
 * INACTIVE → Paused). The mock keeps the display strings the prototype used.
 */
import { defaultPlanForRoom } from "../utils/ratePlans";

/** The prototype's default rate plan for a room (`.defaultPlan`). */
export const defaultRatePlan = defaultPlanForRoom;

const akwaabaRoom = {
  id: "r1",
  kind: "Deluxe Room",
  name: "Deluxe King Room",
  count: 6,
  adults: 2,
  children: 1,
  beds: "1 king bed",
  size: 38,
  price: 750,
  weekend: 850,
  bathroom: "Private",
  bathroomAmenities: ["Toilet paper", "Shower", "Toilet", "Hairdryer", "Free toiletries"],
  amenities: ["Air conditioning", "Wardrobe or closet", "Towels", "Linen", "Flat-screen TV", "Desk"],
  meal: "Breakfast included",
};

export const seedStays = {
  properties: [
    {
      id: "p1",
      name: "Akwaaba Coast Hotel",
      type: "Hotel",
      bookingType: "Individual rooms",
      operating: "Open now",
      region: "Greater Accra",
      country: "Ghana",
      city: "Accra",
      address: "Labone, Accra",
      apartment: "",
      postcode: "",
      lat: 5.557,
      lng: -0.172,
      mapAddress: "Labone, Accra, Greater Accra, Ghana",
      gps: "",
      landmark: "",
      shortDescription: "",
      description:
        "A comfortable base for discovering Accra, with warm service and easy access to the city.",
      status: "Live",
      step: 10,
      facilities: ["Air conditioning", "Free WiFi", "Flat-screen TV", "Terrace"],
      photos: [],
      rooms: [akwaabaRoom],
      ratePlans: [defaultRatePlan(akwaabaRoom)],
      start: "2026-10-01",
      advance: "12 months",
      // Become-a-host answers (see scripts/booking-host-crawl/STEP-MAP.md).
      listingScope: "One property",
      sameAddress: null,
      propertyCount: null,
      otherListings: [],
      noOtherListings: false,
      channelManager: { connected: false, name: "" },
      services: { breakfast: "Yes", parking: "Yes, free" },
      languages: ["English", "Twi"],
      hostProfile: {
        property: {
          included: false,
          about: "A comfortable base for discovering Accra, run by a small team that knows the city.",
        },
        host: { included: false, name: "", about: "" },
        neighbourhood: { included: false, about: "" },
        none: false,
      },
      // Property details (step 10)
      sleeping: {
        bedrooms: [{ id: "bed-1", name: "Bedroom 1", doubleBeds: 1, singleBeds: 0 }],
        livingRoomBeds: 0,
        otherSpacesBeds: 0,
      },
      maxGuests: 2,
      excludeInfants: false,
      bathrooms: 1,
      children: "Welcome",
      cots: "Not available",
      size: "",
      sizeUnit: "square metres",
      bookingPreference: "instant",
      pricePerNight: "29.00",
      currency: "GHS",
      promotion: true,
      startMode: "asap",
      calendarWindow: "365 days",
      calendarImport: { mode: "import", url: "" },
      longStays: null,
      payments: { mode: "Online when they book" },
      invoicing: { name: "Akwaaba Coast Hotel", legalName: "Akwaaba Coast Ltd", sameAddress: true, address: "" },
      agreement: {
        certifyBusiness: true,
        certifyTerms: true,
        openMonths: "18 months",
        notReadyReason: "",
      },
      // Policies (the prototype's property-level rule block)
      checkin: "14:00",
      checkinEnd: "18:00",
      checkoutStart: "08:00",
      checkout: "11:00",
      cancellation: "Flexible",
    },
  ],
  bookings: [
    {
      id: "TG-S-20493",
      guest: "Sarah Johnson",
      propertyId: "p1",
      room: "Deluxe King Room",
      from: "2026-10-04",
      to: "2026-10-08",
      amount: 3000,
      status: "Confirmed",
      guests: 2,
    },
    {
      id: "TG-S-20494",
      guest: "Kwame Agyeman",
      propertyId: "p1",
      room: "Deluxe King Room",
      from: "2026-10-10",
      to: "2026-10-12",
      amount: 1700,
      status: "New",
      guests: 2,
    },
    {
      id: "TG-S-20495",
      guest: "Rebecca Smith",
      propertyId: "p1",
      room: "Deluxe King Room",
      from: "2026-10-15",
      to: "2026-10-18",
      amount: 2250,
      status: "Confirmed",
      guests: 1,
    },
  ],
  messages: [
    { id: "m1", guest: "Sarah Johnson", text: "Is airport pickup available for my arrival?", reply: "", date: "Today" },
    { id: "m2", guest: "Kwame Agyeman", text: "Could we check in a little earlier?", reply: "", date: "Yesterday" },
  ],
  reviews: [
    { id: "v1", guest: "Ama B.", rating: 5, text: "Helpful staff and a lovely breakfast.", reply: "" },
    { id: "v2", guest: "David R.", rating: 4, text: "Comfortable room and a convenient location.", reply: "" },
  ],
  offers: [],
  team: [],
  /** `${roomId}|${date}` → { price, count, closed, minStay } */
  overrides: {},
  payoutMethod: "Bank transfer",
  readNotifications: [],
  preferences: {},
};
