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
      gps: "",
      landmark: "",
      shortDescription: "",
      description:
        "A comfortable base for discovering Accra, with warm service and easy access to the city.",
      status: "Live",
      step: 10,
      facilities: ["Free Wi-Fi", "Restaurant", "Free parking", "Air conditioning"],
      photos: [],
      rooms: [akwaabaRoom],
      ratePlans: [defaultRatePlan(akwaabaRoom)],
      start: "2026-10-01",
      advance: "12 months",
      // Policies (the prototype's property-level rule block)
      checkin: "14:00",
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
