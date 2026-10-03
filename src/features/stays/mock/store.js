/**
 * Stays preview dataset used while the backend endpoints are being built.
 *
 * Every function mirrors an API call from `features/stays/api.js` — same
 * arguments, same response shape — so switching `staysDataSource` to "api"
 * changes nothing for the pages. Edits are persisted to localStorage so a
 * draft in progress survives a page reload; when the real endpoints ship, the
 * backend owns persistence and this layer is no longer used.
 */
import { STAYS_BUILDER_STEP_COUNT } from "../config/staysSteps";
import { defaultRatePlan, seedStays } from "./seed";

const clone = (value) => JSON.parse(JSON.stringify(value));
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Bump when the seed or stored shape changes — old payloads reseed. */
const STORAGE_VERSION = 2;
export const STAYS_MOCK_STORAGE_KEY = "stays-mock-db-v1";

/**
 * Read the persisted dataset, falling back to the reference seed for a
 * missing, corrupt or outdated payload.
 */
function loadDb() {
  if (typeof localStorage === "undefined") return clone(seedStays);
  try {
    const raw = localStorage.getItem(STAYS_MOCK_STORAGE_KEY);
    if (!raw) return clone(seedStays);
    const stored = JSON.parse(raw);
    if (stored?.version !== STORAGE_VERSION || !stored.db) return clone(seedStays);
    const data = stored.db;
    if (!Array.isArray(data.properties) || !Array.isArray(data.bookings)) return clone(seedStays);
    return data;
  } catch {
    return clone(seedStays);
  }
}

/**
 * Persist the dataset after every mutation. Photos are data URLs, so a full
 * draft can exceed the ~5MB localStorage quota — fall back to dropping the
 * image payloads before giving up; the fields users care about survive a
 * reload either way.
 */
function persist() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STAYS_MOCK_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, db }));
    return;
  } catch {
    // Most likely QuotaExceededError from photo data URLs.
  }
  try {
    const light = clone(db);
    for (const property of light.properties) {
      property.photos = (property.photos || []).filter(
        (src) => typeof src === "string" && !src.startsWith("data:"),
      );
    }
    localStorage.setItem(STAYS_MOCK_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, db: light }));
  } catch {
    // Storage unavailable or still full: keep the session copy working.
  }
}

let db = loadDb();

function property(id) {
  const found = db.properties.find((p) => p.id === id);
  if (!found) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }
  return found;
}

function offersWithStatus(offers) {
  const today = new Date().toISOString().slice(0, 10);
  return offers.map((offer) => ({
    ...offer,
    status: offer.from && offer.from > today
      ? "Scheduled"
      : offer.to && offer.to < today
        ? "Ended"
        : "Active",
  }));
}

function bookingCountFor(propertyId) {
  return db.bookings.filter((b) => b.propertyId === propertyId).length;
}

const nonCancelled = () => db.bookings.filter((b) => b.status !== "Cancelled");

export const staysMock = {
  /** Test hook — restore the reference dataset (and the stored copy). */
  reset() {
    db = clone(seedStays);
    persist();
  },

  /** Test hook — simulate a page reload by re-reading persisted state. */
  reload() {
    db = loadDb();
  },

  // ── Dashboard ─────────────────────────────────────────────────────────
  async getDashboard() {
    await delay();
    const gross = nonCancelled().reduce((sum, b) => sum + b.amount, 0);
    const cancelled = db.bookings.filter((b) => b.status === "Cancelled").length;
    const topProperties = db.properties
      .map((p) => ({
        id: p.id,
        name: p.name,
        bookings: bookingCountFor(p.id),
        roomTypes: p.rooms.length,
        revenue: db.bookings
          .filter((b) => b.propertyId === p.id && b.status !== "Cancelled")
          .reduce((sum, b) => sum + b.amount, 0),
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    return {
      stats: {
        upcomingArrivals: nonCancelled().length,
        newReservations: db.bookings.filter((b) => b.status === "New").length,
        liveProperties: db.properties.filter((p) => p.status === "Live").length,
        grossBookingValue: gross,
      },
      currency: "GHS",
      cancellation: {
        rate: db.bookings.length ? Math.round((cancelled / db.bookings.length) * 1000) / 10 : 0,
        cancelled,
        total: db.bookings.length,
      },
      actionRequired: {
        messagesAwaitingReply: db.messages.filter((m) => !m.reply).length,
        bookingsToReview: db.bookings.filter((b) => b.status === "New").length,
        draftProperties: db.properties.filter((p) => p.status === "Draft").length,
      },
      recentBookings: clone(
        db.bookings.slice(0, 5).map((b) => ({
          ...b,
          propertyName: db.properties.find((p) => p.id === b.propertyId)?.name || "Property",
        })),
      ),
      topProperties,
    };
  },

  // ── Properties ────────────────────────────────────────────────────────
  async listProperties({ status = "All", query = "" } = {}) {
    await delay();
    const q = query.trim().toLowerCase();
    return clone(
      db.properties
        .filter((p) => {
          if (status !== "All" && p.status !== status) return false;
          if (!q) return true;
          return `${p.name} ${p.city} ${p.type}`.toLowerCase().includes(q);
        })
        .map((p) => ({ ...p, bookings: bookingCountFor(p.id) })),
    );
  },

  async getProperty(id) {
    await delay();
    return clone(property(id));
  },

  async createProperty(payload = {}) {
    await delay();
    const created = {
      id: uid("p"),
      name: "Untitled property",
      type: "Hotel",
      bookingType: "Individual rooms",
      operating: "Open now",
      region: "Greater Accra",
      country: "Ghana",
      city: "",
      address: "",
      apartment: "",
      postcode: "",
      lat: null,
      lng: null,
      mapAddress: "",
      gps: "",
      landmark: "",
      shortDescription: "",
      description: "",
      status: "Draft",
      step: 0,
      facilities: [],
      photos: [],
      rooms: [],
      ratePlans: [],
      start: "",
      advance: "12 months",
      checkin: "14:00",
      checkinEnd: "18:00",
      checkoutStart: "08:00",
      checkout: "11:00",
      cancellation: "Flexible",
      // Become-a-host answers (see scripts/booking-host-crawl/STEP-MAP.md).
      listingScope: "One property",
      sameAddress: null,
      propertyCount: null,
      otherListings: [],
      noOtherListings: false,
      channelManager: { connected: false, name: "" },
      services: { breakfast: "No", parking: "No" },
      languages: [],
      hostProfile: {
        property: { included: false, about: "" },
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
      invoicing: { name: "", legalName: "", sameAddress: true, address: "" },
      agreement: {
        certifyBusiness: false,
        certifyTerms: false,
        openMonths: "18 months",
        notReadyReason: "",
      },
      ...payload,
    };
    db.properties.push(created);
    persist();
    return clone(created);
  },

  async updateProperty(id, patch = {}) {
    await delay();
    Object.assign(property(id), patch);
    persist();
    return clone(property(id));
  },

  async submitProperty(id) {
    await delay();
    Object.assign(property(id), { status: "Under review", step: STAYS_BUILDER_STEP_COUNT });
    persist();
    return clone(property(id));
  },

  async deleteProperty(id) {
    await delay();
    db.properties = db.properties.filter((p) => p.id !== id);
    db.bookings = db.bookings.filter((b) => b.propertyId !== id);
    persist();
    return { ok: true };
  },

  // ── Rooms ─────────────────────────────────────────────────────────────
  async saveRoom(propertyId, room) {
    await delay();
    const p = property(propertyId);
    const existingIndex = p.rooms.findIndex((r) => r.id === room.id);
    if (existingIndex >= 0) {
      p.rooms[existingIndex] = { ...p.rooms[existingIndex], ...room };
    } else {
      const created = { ...room, id: room.id || uid("r"), meal: room.meal || "Room only" };
      p.rooms.push(created);
      // The prototype gives every new room a Standard rate plan automatically.
      p.ratePlans = p.ratePlans || [];
      p.ratePlans.push(defaultRatePlan(created));
    }
    persist();
    return clone(p);
  },

  async deleteRoom(propertyId, roomId) {
    await delay();
    const p = property(propertyId);
    p.rooms = p.rooms.filter((r) => r.id !== roomId);
    p.ratePlans = (p.ratePlans || []).filter((plan) => plan.roomId !== roomId);
    persist();
    return clone(p);
  },

  // ── Rate plans ────────────────────────────────────────────────────────
  async saveRatePlan(propertyId, plan) {
    await delay();
    const p = property(propertyId);
    p.ratePlans = p.ratePlans || [];
    const index = p.ratePlans.findIndex((x) => x.id === plan.id);
    if (index >= 0) p.ratePlans[index] = { ...p.ratePlans[index], ...plan };
    else p.ratePlans.push({ ...plan, id: plan.id || uid("plan") });
    persist();
    return clone(p);
  },

  async deleteRatePlan(propertyId, planId) {
    await delay();
    const p = property(propertyId);
    const plan = (p.ratePlans || []).find((x) => x.id === planId);
    const siblings = (p.ratePlans || []).filter((x) => x.roomId === plan?.roomId);
    if (plan && siblings.length <= 1) {
      throw new Error("Keep at least one rate plan for this room");
    }
    p.ratePlans = p.ratePlans.filter((x) => x.id !== planId);
    persist();
    return clone(p);
  },

  // ── Availability ──────────────────────────────────────────────────────
  async getAvailability(propertyId, { from, to } = {}) {
    await delay();
    const p = property(propertyId);
    const inRange = (date) => (!from || date >= from) && (!to || date <= to);
    const overrides = {};
    for (const [key, value] of Object.entries(db.overrides)) {
      const [roomId, date] = key.split("|");
      if (p.rooms.some((r) => r.id === roomId) && inRange(date)) {
        overrides[`${roomId}|${date}`] = clone(value);
      }
    }
    return { overrides, currency: "GHS" };
  },

  async setAvailabilityCell(propertyId, { roomId, date, values }) {
    await delay();
    property(propertyId);
    db.overrides[`${roomId}|${date}`] = { ...values };
    persist();
    return { ok: true };
  },

  /** Removes the override so the room's defaults apply again. */
  async clearAvailabilityCell(propertyId, { roomId, date }) {
    await delay();
    property(propertyId);
    delete db.overrides[`${roomId}|${date}`];
    persist();
    return { ok: true };
  },

  // ── Bookings ──────────────────────────────────────────────────────────
  async listBookings({ status = "All" } = {}) {
    await delay();
    const rows = db.bookings.filter((b) => status === "All" || b.status === status);
    return clone(
      rows.map((b) => ({
        ...b,
        propertyName: db.properties.find((p) => p.id === b.propertyId)?.name || "—",
      })),
    );
  },

  async updateBookingStatus(id, status) {
    await delay();
    const booking = db.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");
    booking.status = status;
    persist();
    return clone(booking);
  },

  // ── Offers ────────────────────────────────────────────────────────────
  async listOffers({ filter = "All" } = {}) {
    await delay();
    const rows = offersWithStatus(db.offers).map((offer) => ({
      ...offer,
      propertyName: db.properties.find((p) => p.id === offer.propertyId)?.name || "Property",
    }));
    return clone(filter === "All" ? rows : rows.filter((o) => o.status === filter));
  },

  async saveOffer(offer) {
    await delay();
    const index = db.offers.findIndex((o) => o.id === offer.id);
    if (index >= 0) db.offers[index] = { ...db.offers[index], ...offer };
    else db.offers.push({ ...offer, id: offer.id || uid("offer") });
    persist();
    return clone(db.offers);
  },

  async deleteOffer(id) {
    await delay();
    db.offers = db.offers.filter((o) => o.id !== id);
    persist();
    return { ok: true };
  },

  // ── Messages / reviews ────────────────────────────────────────────────
  async listMessages({ filter = "All" } = {}) {
    await delay();
    const rows = db.messages.filter((m) =>
      filter === "All" ? true : filter === "Unread" ? !m.reply : Boolean(m.reply),
    );
    return clone(rows);
  },

  async replyToMessage(id, reply) {
    await delay();
    const message = db.messages.find((m) => m.id === id);
    if (!message) throw new Error("Message not found");
    message.reply = reply;
    persist();
    return clone(message);
  },

  async listReviews({ filter = "All" } = {}) {
    await delay();
    const rows = db.reviews.filter((r) =>
      filter === "All" ? true : filter === "Replied" ? Boolean(r.reply) : !r.reply,
    );
    return clone(rows);
  },

  async replyToReview(id, reply) {
    await delay();
    const review = db.reviews.find((r) => r.id === id);
    if (!review) throw new Error("Review not found");
    review.reply = reply;
    persist();
    return clone(review);
  },

  // ── Reporting ─────────────────────────────────────────────────────────
  async getCancellationSummary({ days = 30 } = {}) {
    await delay();
    const cancelled = db.bookings.filter((b) => b.status === "Cancelled").length;
    const total = db.bookings.length;
    return {
      days,
      rate: total ? Math.round((cancelled / total) * 1000) / 10 : 0,
      cancelled,
      total,
      byStatus: {
        confirmed: db.bookings.filter((b) => b.status === "Confirmed").length,
        cancelled,
        completed: db.bookings.filter((b) => b.status === "Completed").length,
      },
    };
  },

  async getAnalytics({ period = "90 days" } = {}) {
    await delay();
    const valid = nonCancelled();
    const gross = valid.reduce((sum, b) => sum + b.amount, 0);
    const count = valid.length;
    return {
      period,
      totalBookings: count,
      grossBookingValue: gross,
      averageBookingValue: count ? Math.round(gross / count) : 0,
      liveProperties: db.properties.filter((p) => p.status === "Live").length,
      // Illustrative series — matches the prototype's chart while the real
      // reporting endpoint is built (it is labelled as such in the UI).
      revenueTrend: [
        { month: "May", value: 12 },
        { month: "Jun", value: 24 },
        { month: "Jul", value: 18 },
        { month: "Aug", value: 45 },
        { month: "Sep", value: 34 },
        { month: "Oct", value: 62 },
      ],
      bookingsByProperty: db.properties.map((p) => ({
        id: p.id,
        name: p.name,
        count: bookingCountFor(p.id),
      })),
      bestSelling: db.properties
        .map((p) => ({
          id: p.id,
          name: p.name,
          bookings: bookingCountFor(p.id),
          revenue: db.bookings
            .filter((b) => b.propertyId === p.id && b.status !== "Cancelled")
            .reduce((sum, b) => sum + b.amount, 0),
        }))
        .sort((a, b) => b.bookings - a.bookings),
    };
  },

  // ── Photos ────────────────────────────────────────────────────────────
  async addPhotos(propertyId, dataUrls = []) {
    await delay();
    const p = property(propertyId);
    p.photos = [...(p.photos || []), ...dataUrls];
    persist();
    return clone(p.photos);
  },

  async removePhoto(propertyId, index) {
    await delay();
    const p = property(propertyId);
    p.photos.splice(index, 1);
    persist();
    return clone(p.photos);
  },
};
