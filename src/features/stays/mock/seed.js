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

/**
 * ISO instant `days` from now — offers are seeded relative to today so their
 * derived status (scheduled / active / expired) is stable whenever the mock
 * is loaded, unlike the fixed dates the prototype used.
 */
function dayOffsetISO(days, endOfDay = false) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

/** The date-part (`YYYY-MM-DD`) of `days` from now — bookings store plain dates. */
function dayOffsetDate(days) {
  return dayOffsetISO(days).slice(0, 10);
}

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
    // Cancellation records — the reporting page's dataset. `countsTowardRate`
    // mirrors the Experiences rule: supplier-caused cancellations count;
    // guest-requested ones and no-shows do not.
    {
      id: "TG-S-20496",
      guest: "Emily Carter",
      propertyId: "p1",
      room: "Deluxe King Room",
      from: dayOffsetDate(-18),
      to: dayOffsetDate(-15),
      amount: 1400,
      status: "Cancelled",
      guests: 2,
      reason: "Property unavailable",
      note: "Maintenance overran — the room could not be prepared.",
      refundAmount: 1400,
      countsTowardRate: true,
    },
    {
      id: "TG-S-20497",
      guest: "Daniel Owusu",
      propertyId: "p1",
      room: "Deluxe King Room",
      from: dayOffsetDate(-38),
      to: dayOffsetDate(-35),
      amount: 1800,
      status: "Cancelled",
      guests: 3,
      reason: "Guest requested cancellation",
      note: "Travel plans changed — full refund issued.",
      refundAmount: 1800,
      countsTowardRate: false,
    },
    {
      id: "TG-S-20498",
      guest: "Sophie Turner",
      propertyId: "p1",
      room: "Deluxe King Room",
      from: dayOffsetDate(-55),
      to: dayOffsetDate(-52),
      amount: 950,
      status: "Cancelled",
      guests: 1,
      reason: "Property unavailable",
      note: "Double-booked by mistake — moved the guest to a partner hotel.",
      refundAmount: 950,
      countsTowardRate: true,
    },
    {
      id: "TG-S-20499",
      guest: "Mark Addo",
      propertyId: "p1",
      room: "Deluxe King Room",
      from: dayOffsetDate(-72),
      to: dayOffsetDate(-70),
      amount: 700,
      status: "No-show",
      guests: 1,
      reason: "Guest did not arrive",
      note: "No contact after two reminder messages.",
      refundAmount: 0,
      countsTowardRate: false,
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
  offers: [
    {
      id: "offer-1",
      name: "Weekend escape",
      offerType: "LIMITED_TIME",
      discountType: "PERCENTAGE",
      discountPercentage: 15,
      fixedDiscountValue: null,
      startDate: dayOffsetISO(-3),
      endDate: dayOffsetISO(30, true),
      isActive: true,
      capacityType: "UNLIMITED",
      maxSpots: null,
      spotsSold: 0,
      timeSlotMode: "ALL_DAYS",
      specificWeekdays: [],
      earlyBirdAdvanceDays: 7,
      lastMinuteWindowHours: 72,
      promoCode: "",
      minQuantity: null,
      minSpendAmount: null,
      maxRedemptionsPerCustomer: null,
      stackable: false,
      targets: [
        {
          propertyId: "p1",
          propertyName: "Akwaaba Coast Hotel",
          roomId: "r1",
          roomLabel: "Deluxe King Room",
        },
      ],
    },
    {
      id: "offer-2",
      name: "Early bird special",
      offerType: "EARLY_BIRD",
      discountType: "FIXED_AMOUNT",
      discountPercentage: 0,
      fixedDiscountValue: 80,
      startDate: dayOffsetISO(14),
      endDate: dayOffsetISO(45, true),
      isActive: true,
      capacityType: "CAPPED",
      maxSpots: 50,
      spotsSold: 12,
      timeSlotMode: "SPECIFIC_WEEKDAYS",
      specificWeekdays: ["monday", "tuesday", "wednesday"],
      earlyBirdAdvanceDays: 21,
      lastMinuteWindowHours: 72,
      promoCode: "EARLY80",
      minQuantity: null,
      minSpendAmount: null,
      maxRedemptionsPerCustomer: 1,
      stackable: false,
      targets: [
        { propertyId: "p1", propertyName: "Akwaaba Coast Hotel", roomId: null, roomLabel: null },
      ],
    },
  ],
  team: [],
  /** `${roomId}|${date}` → { price, count, closed, minStay } */
  overrides: {},
  payoutMethod: "Bank transfer",
  readNotifications: [],
  preferences: {},
  // Finance — payouts, methods, refund requests and the cancellation-fee
  // ledger. Earnings rows are derived from the bookings at read time.
  finance: {
    payoutSettings: {
      cycle: "TWICE_MONTHLY",
      autoRunsEnabled: true,
      hasVerifiedPayoutMethod: true,
    },
    payoutMethods: [
      {
        id: "pm-1",
        type: "BANK_TRANSFER",
        isDefault: true,
        verified: true,
        status: "VERIFIED",
        bankName: "Ecobank Ghana",
        accountName: "Akwaaba Coast Ltd",
        accountNumber: "1400123456789",
        country: "GH",
        currency: "USD",
        createdAt: dayOffsetISO(-90),
      },
    ],
    payoutRequests: [
      {
        id: "pr-1",
        requestNumber: "PR-2026-001",
        amount: 1530,
        currency: "USD",
        bookingCount: 2,
        status: "IN_REVIEW",
        cycleLabel: "1–15 Oct",
        reference: "",
        createdAt: dayOffsetISO(-2),
        completedAt: null,
        rejectedReason: "",
        autoGenerated: true,
        method: "BANK TRANSFER",
      },
    ],
    disputes: [
      {
        id: "dsp-1",
        disputeNumber: "RF-2026-001",
        reason: "SERVICE_NOT_PROVIDED",
        description: "The room was not ready when the guest arrived.",
        status: "OPEN",
        resolution: "",
        refundAmount: 350,
        createdAt: dayOffsetISO(-5),
        resolvedAt: null,
        bookingId: "TG-S-20496",
        bookingNumber: "TG-S-20496",
        propertyTitle: "Akwaaba Coast Hotel",
        travelDate: dayOffsetDate(-18),
        grossAmount: 1400,
        currency: "USD",
      },
    ],
    claims: [],
  },
};
