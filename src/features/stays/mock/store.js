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
import { computeOfferStatus } from "../utils/offerStatus";
import { seedStays } from "./seed";

const clone = (value) => JSON.parse(JSON.stringify(value));
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Bump when the seed or stored shape changes — old payloads reseed. */
const STORAGE_VERSION = 6;
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

/** Every offer with its derived status and the first target's property name. */
function withOfferStatus(offers) {
  return offers.map((offer) => ({
    ...offer,
    status: computeOfferStatus(offer),
    propertyName:
      offer.targets?.[0]?.propertyName ||
      db.properties.find((p) => p.id === offer.targets?.[0]?.propertyId)?.name ||
      "Property",
  }));
}

function bookingCountFor(propertyId) {
  return db.bookings.filter((b) => b.propertyId === propertyId).length;
}

const nonCancelled = () => db.bookings.filter((b) => b.status !== "Cancelled");

/* ── Finance helpers ─────────────────────────────────────────────────────── */

const FINANCE_CYCLE_OPTIONS = [
  {
    value: "WEEKLY",
    shortLabel: "Weekly",
    runDays: "Every Monday",
    label: "Every week — paid every Monday",
    description: "Payouts are generated every Monday for stays completed by the Sunday before.",
  },
  {
    value: "TWICE_MONTHLY",
    shortLabel: "Twice a month",
    runDays: "The 1st & 15th",
    label: "Twice a month — paid on the 1st & 15th",
    description: "Payouts are generated twice a month, on the 1st and the 15th.",
  },
  {
    value: "MONTHLY",
    shortLabel: "Monthly",
    runDays: "The 1st of each month",
    label: "Monthly — paid on the 1st",
    description: "One payout a month, generated on the 1st for the previous month.",
  },
];

const cycleLabel = (cycle) =>
  FINANCE_CYCLE_OPTIONS.find((option) => option.value === cycle)?.label ||
  FINANCE_CYCLE_OPTIONS[1].label;

function nextPayoutRun() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() < 15 ? 15 : 1);
  if (now.getDate() >= 15) next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

function dayOffsetISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/** One earnings row per non-cancelled booking, at a 15% commission. */
function financeEarnings() {
  const commissionRate = 15;
  return db.bookings
    .filter((booking) => booking.status !== "Cancelled" && booking.status !== "No-show")
    .map((booking) => {
      const gross = booking.amount;
      const commission = Math.round(gross * commissionRate) / 100;
      const payoutStatus =
        booking.status === "Completed" || booking.status === "Checked in"
          ? "PAID"
          : booking.status === "Confirmed"
            ? "ELIGIBLE"
            : "PENDING";
      const property = db.properties.find((row) => row.id === booking.propertyId);
      return {
        id: `earn-${booking.id}`,
        bookingId: booking.id,
        bookingNumber: booking.id,
        travelDate: booking.from,
        stayDate: booking.from,
        paidAt: payoutStatus === "PAID" ? booking.to : null,
        grossAmount: gross,
        supplierPayout: gross - commission,
        commissionAmount: commission,
        commissionRate,
        currency: "USD",
        payoutStatus,
        status: payoutStatus,
        property: property?.name || "Property",
        room: booking.room,
        customer: booking.guest,
        payoutRequest: null,
        openDispute: null,
      };
    });
}

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
        messagesAwaitingReply: (db.conversations || []).reduce(
          (total, conversation) => total + (conversation.unreadCount || 0),
          0,
        ),
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
    const rows = withOfferStatus(db.offers);
    return clone(
      filter === "All" ? rows : rows.filter((offer) => offer.status === filter.toLowerCase()),
    );
  },

  async getOffer(id) {
    await delay();
    const offer = db.offers.find((o) => o.id === id);
    if (!offer) throw new Error("Offer not found");
    return clone(withOfferStatus([offer])[0]);
  },

  async saveOffer(offer) {
    await delay();
    const index = db.offers.findIndex((o) => o.id === offer.id);
    if (index >= 0) {
      db.offers[index] = { ...db.offers[index], ...offer };
    } else {
      db.offers.push({
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
        targets: [],
        ...offer,
        id: offer.id || uid("offer"),
      });
    }
    persist();
    return clone(withOfferStatus(db.offers));
  },

  async toggleOffer(id) {
    await delay();
    const offer = db.offers.find((o) => o.id === id);
    if (!offer) throw new Error("Offer not found");
    offer.isActive = !offer.isActive;
    persist();
    return clone(withOfferStatus([offer])[0]);
  },

  async deleteOffer(id) {
    await delay();
    db.offers = db.offers.filter((o) => o.id !== id);
    persist();
    return { ok: true };
  },

  // ── Customers (conversations) ─────────────────────────────────────────
  async listConversations() {
    await delay();
    return clone(
      (db.conversations || []).map((conversation) => ({
        ...conversation,
        messages: conversation.messages.slice(-1),
      })),
    );
  },

  async listConversationMessages({ conversationId, limit = 50 } = {}) {
    await delay();
    const conversation = (db.conversations || []).find((row) => row.id === conversationId);
    if (!conversation) throw new Error("Conversation not found");
    return {
      messages: clone(conversation.messages.slice(-limit)),
      cursor: null,
      hasMore: false,
    };
  },

  async sendConversationMessage({ conversationId, content, attachment } = {}) {
    await delay();
    const conversation = (db.conversations || []).find((row) => row.id === conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const message = {
      id: uid("msg"),
      conversationId,
      senderId: "stays-supplier",
      sender: { id: "stays-supplier", name: "Akwaaba Coast Hotel" },
      content: content || "",
      attachmentUrl: attachment?.url || null,
      attachmentType: attachment?.type || null,
      createdAt: new Date().toISOString(),
    };
    conversation.messages.push(message);
    conversation.updatedAt = message.createdAt;
    persist();
    return clone(message);
  },

  async markConversationRead(conversationId) {
    await delay();
    const conversation = (db.conversations || []).find((row) => row.id === conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
      persist();
    }
    return { ok: true };
  },

  async deleteConversation(conversationId) {
    await delay();
    db.conversations = (db.conversations || []).filter((row) => row.id !== conversationId);
    persist();
    return { ok: true };
  },

  // ── Reviews ───────────────────────────────────────────────────────────
  async listReviews({ filter = "All" } = {}) {
    await delay();
    const rows = db.reviews.filter((review) =>
      filter === "All" ? true : filter === "Replied" ? Boolean(review.reply) : !review.reply,
    );
    return clone(rows);
  },

  async replyToReview(id, reply) {
    await delay();
    const review = db.reviews.find((row) => row.id === id);
    if (!review) throw new Error("Review not found");
    review.reply = reply;
    persist();
    return clone(review);
  },

  // ── Notifications ─────────────────────────────────────────────────────
  async listNotifications({ limit = 50, unreadOnly = false } = {}) {
    await delay();
    const all = [...(db.notifications || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const unreadCount = all.filter((row) => !row.read).length;
    const rows = unreadOnly ? all.filter((row) => !row.read) : all;
    return { notifications: clone(rows.slice(0, limit)), unreadCount };
  },

  async markNotificationRead(id) {
    await delay();
    const row = (db.notifications || []).find((notification) => notification.id === id);
    if (row) {
      row.read = true;
      persist();
    }
    return { ok: true };
  },

  async markAllNotificationsRead() {
    await delay();
    (db.notifications || []).forEach((notification) => {
      notification.read = true;
    });
    persist();
    return { ok: true };
  },

  async deleteNotification(id) {
    await delay();
    db.notifications = (db.notifications || []).filter((notification) => notification.id !== id);
    persist();
    return { ok: true };
  },

  // ── Verification ──────────────────────────────────────────────────────
  async getVerification() {
    await delay();
    return clone(
      db.verification || {
        profile: { supplierType: "ACCOMMODATION_PROVIDER", documents: [], properties: [] },
        requirements: null,
      },
    );
  },

  async replaceDocument(docId, file) {
    await delay();
    const doc = (db.verification?.profile?.documents || []).find((row) => row.id === docId);
    if (!doc) throw new Error("Document not found");
    doc.status = "PENDING";
    doc.reviewNote = null;
    if (file?.name) doc.fileName = file.name;
    doc.uploadedAt = new Date().toISOString();
    persist();
    return clone(doc);
  },

  async addDocument({ type, file, expiryDate, ownerType, ownerId } = {}) {
    await delay();
    if (!db.verification) {
      db.verification = {
        profile: { supplierType: "ACCOMMODATION_PROVIDER", documents: [], properties: [] },
        requirements: null,
      };
    }
    if (!db.verification.profile) db.verification.profile = { documents: [], properties: [] };
    if (!db.verification.profile.documents) db.verification.profile.documents = [];
    const doc = {
      id: uid("doc"),
      type,
      ownerType: ownerType || "SUPPLIER",
      ownerId: ownerId || null,
      status: "PENDING",
      url: "",
      fileName: file?.name || null,
      expiryDate: expiryDate || null,
      reviewNote: null,
      uploadedAt: new Date().toISOString(),
    };
    db.verification.profile.documents.push(doc);
    persist();
    return clone(doc);
  },

  // ── Account (settings) ────────────────────────────────────────────────
  async getAccount() {
    await delay();
    const account = db.account || {};
    return clone({
      user: account.user || null,
      business: account.business || null,
      notificationPreferences: account.notificationPreferences || null,
      taxInfo: account.taxInfo || null,
    });
  },

  async updateAccountUser(patch = {}) {
    await delay();
    if (!db.account) db.account = {};
    db.account.user = { ...(db.account.user || {}), ...clone(patch) };
    persist();
    return clone(db.account.user);
  },

  async updateBusinessProfile(payload = {}) {
    await delay();
    if (!db.account) db.account = {};
    const business = db.account.business || {};
    db.account.business = {
      ...business,
      ...clone(payload),
      businessInfo: { ...(business.businessInfo || {}), ...(payload.businessInfo || {}) },
      operatingInfo: { ...(business.operatingInfo || {}), ...(payload.operatingInfo || {}) },
      representativeInfo: {
        ...(business.representativeInfo || {}),
        ...(payload.representativeInfo || {}),
      },
    };
    persist();
    return clone(db.account.business);
  },

  async uploadLogo() {
    await delay();
    // The demo keeps the initial mark; the live branch returns a hosted URL.
    return { logoUrl: null };
  },

  async getNotificationPreferences() {
    await delay();
    return clone(db.account?.notificationPreferences || null);
  },

  async updateNotificationPreferences(preferences = {}) {
    await delay();
    if (!db.account) db.account = {};
    db.account.notificationPreferences = {
      ...(db.account.notificationPreferences || {}),
      ...clone(preferences),
    };
    persist();
    return clone(db.account.notificationPreferences);
  },

  async listNotificationRecipients() {
    await delay();
    return clone(db.account?.notificationRecipients || []);
  },

  async addNotificationRecipient({ email, name, preferences } = {}) {
    await delay();
    if (!db.account) db.account = {};
    if (!db.account.notificationRecipients) db.account.notificationRecipients = [];
    const recipient = {
      id: uid("rec"),
      email,
      name: name || "",
      status: "PENDING",
      preferences: preferences || {},
    };
    db.account.notificationRecipients.push(recipient);
    persist();
    return clone(recipient);
  },

  async updateNotificationRecipient(id, patch = {}) {
    await delay();
    const recipient = (db.account?.notificationRecipients || []).find((row) => row.id === id);
    if (!recipient) throw new Error("Recipient not found");
    Object.assign(recipient, clone(patch));
    persist();
    return clone(recipient);
  },

  async resendNotificationRecipient(id) {
    await delay();
    const recipient = (db.account?.notificationRecipients || []).find((row) => row.id === id);
    if (!recipient) throw new Error("Recipient not found");
    return clone(recipient);
  },

  async removeNotificationRecipient(id) {
    await delay();
    if (db.account?.notificationRecipients) {
      db.account.notificationRecipients = db.account.notificationRecipients.filter(
        (row) => row.id !== id,
      );
      persist();
    }
    return { ok: true };
  },

  async getTaxInfo() {
    await delay();
    return clone({ taxInfo: db.account?.taxInfo || null });
  },

  async updateTaxInfo(payload = {}) {
    await delay();
    if (!db.account) db.account = {};
    db.account.taxInfo = { ...(db.account.taxInfo || {}), ...clone(payload) };
    persist();
    return clone({ taxInfo: db.account.taxInfo });
  },

  // ── Team ──────────────────────────────────────────────────────────────
  async listTeamMembers() {
    await delay();
    return clone(db.team || []);
  },

  async inviteTeamMember({ email, roles } = {}) {
    await delay();
    const member = {
      id: uid("tm"),
      email,
      name: "",
      roles: clone(roles) || [],
      status: "PENDING",
      invitedAt: new Date().toISOString(),
    };
    db.team.push(member);
    persist();
    return { member: clone(member), emailSent: true };
  },

  async directAddTeamMember({ email, roles } = {}) {
    await delay();
    const member = {
      id: uid("tm"),
      email,
      name: "",
      roles: clone(roles) || [],
      status: "ACTIVE",
      joinedAt: new Date().toISOString(),
    };
    db.team.push(member);
    persist();
    return clone(member);
  },

  async resendInvite() {
    await delay();
    return { emailSent: true };
  },

  async updateTeamMemberRoles(id, roles = []) {
    await delay();
    const member = (db.team || []).find((row) => row.id === id);
    if (!member) throw new Error("Team member not found");
    member.roles = clone(roles);
    member.role = member.roles[0];
    persist();
    return clone(member);
  },

  async removeTeamMember(id) {
    await delay();
    db.team = (db.team || []).filter((row) => row.id !== id);
    persist();
    return { ok: true };
  },

  async revokeTeamInvite(id) {
    await delay();
    const member = (db.team || []).find((row) => row.id === id);
    if (member) {
      member.status = "REVOKED";
      persist();
    }
    return clone(member || null);
  },

  // ── Reporting ─────────────────────────────────────────────────────────
  async getCancellationSummary({ days = 90, propertyId } = {}) {
    await delay();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const rows = db.bookings.filter(
      (booking) =>
        (!propertyId || booking.propertyId === propertyId) &&
        new Date(booking.from).getTime() >= cutoff,
    );
    const eligibleBookings = rows.length;
    const cancelledRows = rows.filter((booking) => booking.status === "Cancelled");
    const noShowRows = rows.filter((booking) => booking.status === "No-show");
    const confirmed = rows.filter(
      (booking) => booking.status === "Confirmed" || booking.status === "Checked in",
    ).length;
    const completed = rows.filter((booking) => booking.status === "Completed").length;
    const percent = (count) =>
      eligibleBookings ? Math.round((count / eligibleBookings) * 1000) / 10 : 0;
    const cancellationRate = percent(cancelledRows.length);
    const noShowRate = percent(noShowRows.length);
    const completionRate = percent(completed);

    const reasonCounts = new Map();
    for (const row of [...cancelledRows, ...noShowRows]) {
      if (row.reason) reasonCounts.set(row.reason, (reasonCounts.get(row.reason) || 0) + 1);
    }
    const mostCommonReason =
      [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const bookingValueLost = [...cancelledRows, ...noShowRows].reduce(
      (sum, booking) => sum + (booking.amount || 0),
      0,
    );

    // Same vocabulary and thresholds as the Experiences page.
    const status =
      eligibleBookings < 10
        ? "Building performance record"
        : cancellationRate <= 1
          ? "Excellent"
          : cancellationRate <= 2
            ? "Good"
            : cancellationRate <= 5
              ? "Needs attention"
              : "High";

    return {
      days,
      cancellationRate,
      eligibleBookings,
      confirmed,
      cancelled: cancelledRows.length,
      completed,
      noShowRate,
      completionRate,
      status,
      mostCommonReason,
      bookingValueLost,
    };
  },

  async listCancellationRecords({ propertyId, page = 1, limit = 25, days = 90 } = {}) {
    await delay();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const rows = db.bookings
      .filter(
        (booking) =>
          (!propertyId || booking.propertyId === propertyId) &&
          (booking.status === "Cancelled" || booking.status === "No-show") &&
          new Date(booking.from).getTime() >= cutoff,
      )
      .sort((a, b) => new Date(b.from) - new Date(a.from))
      .map((booking) => ({
        id: booking.id,
        travelDate: new Date(booking.from).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        reason: booking.reason || "Cancelled",
        note: booking.note || "",
        bookingReference: booking.id,
        productName:
          db.properties.find((property) => property.id === booking.propertyId)?.name || "Property",
        bookingValue: booking.amount,
        refundAmount: booking.refundAmount ?? null,
        countsTowardRate: booking.countsTowardRate ?? null,
      }));

    const totalCount = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const start = Math.max(0, page - 1) * limit;
    return {
      records: clone(rows.slice(start, start + limit)),
      pagination: { currentPage: page, limit, totalCount, totalPages },
    };
  },

  // ── Finance ───────────────────────────────────────────────────────────
  async getFinanceSummary() {
    await delay();
    const earnings = financeEarnings();
    const eligible = earnings.filter((row) => row.payoutStatus === "ELIGIBLE");
    const pending = earnings.filter((row) => row.payoutStatus === "PENDING");
    const paid = earnings.filter((row) => row.payoutStatus === "PAID");
    const sum = (rows) => rows.reduce((total, row) => total + row.supplierPayout, 0);
    const requests = db.finance?.payoutRequests || [];
    const cycle = db.finance?.payoutSettings?.cycle || "TWICE_MONTHLY";
    const methods = db.finance?.payoutMethods || [];

    return {
      availableBalance: { amount: sum(eligible), bookingCount: eligible.length },
      pendingClearance: { amount: sum(pending), bookingCount: pending.length },
      inReview: {
        total: requests.reduce((total, request) => total + request.amount, 0),
        count: requests.length,
      },
      paidOut: { total: sum(paid), count: paid.length },
      withdrawalWindow: {
        open: true,
        opensAt: dayOffsetISO(-1),
        closesAt: dayOffsetISO(1),
      },
      currentCycle: { label: cycleLabel(cycle) },
      payoutPlan: {
        autoManaged: true,
        autoRunsEnabled: db.finance?.payoutSettings?.autoRunsEnabled !== false,
        cycle,
        defaultCycle: "TWICE_MONTHLY",
        nextRunAt: nextPayoutRun(),
        nextRunPeriodLabel: "the current fortnight",
        hasVerifiedPayoutMethod: methods.some((method) => method.verified),
        scheduleLabel: cycleLabel(cycle),
        options: FINANCE_CYCLE_OPTIONS,
      },
    };
  },

  async getFinanceEarnings({ payoutStatus, page = 1, limit = 25 } = {}) {
    await delay();
    let rows = financeEarnings();
    if (payoutStatus) {
      const allowed = String(payoutStatus).split(",");
      rows = rows.filter((row) => allowed.includes(row.payoutStatus));
    }
    const totalCount = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const start = Math.max(0, page - 1) * limit;
    return {
      earnings: clone(rows.slice(start, start + limit)),
      pagination: { currentPage: page, totalPages, totalCount, limit },
    };
  },

  async getPayoutRequests({ page = 1, limit = 25 } = {}) {
    await delay();
    const rows = clone(db.finance?.payoutRequests || []);
    const totalCount = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const start = Math.max(0, page - 1) * limit;
    return {
      requests: rows.slice(start, start + limit),
      pagination: { currentPage: page, totalPages, totalCount, limit },
      summary: {},
    };
  },

  async createPayoutRequest() {
    await delay();
    const eligible = financeEarnings().filter((row) => row.payoutStatus === "ELIGIBLE");
    const amount = eligible.reduce((total, row) => total + row.supplierPayout, 0);
    db.finance.payoutRequests = db.finance.payoutRequests || [];
    db.finance.payoutRequests.unshift({
      id: uid("pr"),
      requestNumber: `PR-2026-${String(db.finance.payoutRequests.length + 2).padStart(3, "0")}`,
      amount,
      currency: "USD",
      bookingCount: eligible.length,
      status: "IN_REVIEW",
      cycleLabel: "the current fortnight",
      reference: "",
      createdAt: new Date().toISOString(),
      completedAt: null,
      rejectedReason: "",
      autoGenerated: false,
      method: "BANK TRANSFER",
    });
    persist();
    return { ok: true };
  },

  async cancelPayoutRequest(id) {
    await delay();
    db.finance.payoutRequests = (db.finance.payoutRequests || []).filter(
      (request) => request.id !== id,
    );
    persist();
    return { ok: true };
  },

  async getPayoutSettings() {
    await delay();
    const plan = db.finance?.payoutSettings || {};
    const methods = db.finance?.payoutMethods || [];
    return {
      ...plan,
      autoManaged: true,
      defaultCycle: "TWICE_MONTHLY",
      scheduleLabel: cycleLabel(plan.cycle || "TWICE_MONTHLY"),
      nextRunAt: nextPayoutRun(),
      nextRunPeriodLabel: "the current fortnight",
      hasVerifiedPayoutMethod: methods.some((method) => method.verified),
      options: FINANCE_CYCLE_OPTIONS,
    };
  },

  async updatePayoutSettings(cycle) {
    await delay();
    db.finance.payoutSettings = { ...(db.finance.payoutSettings || {}), cycle, pendingCycle: null };
    persist();
    return this.getPayoutSettings();
  },

  async listPayoutMethods() {
    await delay();
    return clone(db.finance?.payoutMethods || []);
  },

  async createPayoutMethod(data) {
    await delay();
    db.finance.payoutMethods = db.finance.payoutMethods || [];
    db.finance.payoutMethods.unshift({
      ...data,
      id: uid("pm"),
      verified: true,
      status: "VERIFIED",
      createdAt: new Date().toISOString(),
    });
    persist();
    return clone(db.finance.payoutMethods);
  },

  async updatePayoutMethod(id, data) {
    await delay();
    db.finance.payoutMethods = (db.finance.payoutMethods || []).map((method) =>
      method.id === id ? { ...method, ...data } : method,
    );
    persist();
    return clone(db.finance.payoutMethods);
  },

  async deletePayoutMethod(id) {
    await delay();
    db.finance.payoutMethods = (db.finance.payoutMethods || []).filter(
      (method) => method.id !== id,
    );
    persist();
    return { ok: true };
  },

  async getFinanceCharges() {
    await delay();
    const charges = db.bookings
      .filter((booking) => booking.status === "Cancelled")
      .map((booking) => ({
        id: `chg-${booking.id}`,
        amount: Math.round(booking.amount * 0.1),
        currency: "USD",
        reason: "Cancellation fee",
        status: "OPEN",
        notes: booking.reason || "",
        createdAt: booking.from,
        settledAt: null,
        bookingId: booking.id,
        bookingNumber: booking.id,
        payoutRequestId: null,
        payoutRequestNumber: null,
      }));
    const openTotal = charges.reduce((total, charge) => total + charge.amount, 0);
    return {
      charges: clone(charges),
      openTotals: openTotal ? [{ currency: "USD", amount: openTotal }] : [],
    };
  },

  async getFinanceDisputes({ status, page = 1, limit = 25 } = {}) {
    await delay();
    let rows = db.finance?.disputes || [];
    if (status) rows = rows.filter((row) => status.split(",").includes(row.status));
    const totalCount = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const start = Math.max(0, page - 1) * limit;
    return {
      disputes: clone(rows.slice(start, start + limit)),
      pagination: { currentPage: page, totalPages, totalCount, limit },
    };
  },

  async createRefundRequest(payload) {
    await delay();
    const booking = db.bookings.find((row) => row.id === payload.bookingId);
    db.finance.disputes = db.finance.disputes || [];
    db.finance.disputes.unshift({
      id: uid("dsp"),
      disputeNumber: `RF-2026-${String(db.finance.disputes.length + 2).padStart(3, "0")}`,
      reason: payload.reason,
      description: payload.description || "",
      status: "OPEN",
      resolution: "",
      refundAmount: booking?.amount || 0,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      bookingId: payload.bookingId,
      bookingNumber: payload.bookingId,
      propertyTitle:
        db.properties.find((property) => property.id === booking?.propertyId)?.name ||
        "Property",
      travelDate: booking?.from,
      grossAmount: booking?.amount || 0,
      currency: "USD",
    });
    persist();
    return { ok: true };
  },

  async withdrawRefundRequest(id) {
    await delay();
    db.finance.disputes = (db.finance.disputes || []).filter((row) => row.id !== id);
    persist();
    return { ok: true };
  },

  async getSupplierClaims() {
    await delay();
    return clone(db.finance?.claims || []);
  },

  async approveClaim(id) {
    await delay();
    const claim = (db.finance?.claims || []).find((row) => row.id === id);
    if (!claim) throw new Error("Claim not found");
    claim.status = "SUPPLIER_APPROVED";
    persist();
    return clone(claim);
  },

  async declineClaim(id, note) {
    await delay();
    const claim = (db.finance?.claims || []).find((row) => row.id === id);
    if (!claim) throw new Error("Claim not found");
    claim.status = "SUPPLIER_DECLINED";
    claim.reviewNote = note || "";
    persist();
    return clone(claim);
  },

  // ── Analytics (the Experiences analytics page's three endpoints) ──────
  async getAnalyticsSummary() {
    await delay();
    const valid = nonCancelled();
    const reviews = db.reviews || [];
    const averageRating = reviews.length
      ? Math.round((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) * 10) /
        10
      : 0;
    return {
      properties: {
        active: db.properties.filter((property) => property.status === "Live").length,
        total: db.properties.length,
      },
      bookings: { total: valid.length },
      earnings: { totalEarnings: valid.reduce((total, booking) => total + booking.amount, 0) },
      reviews: { averageRating, total: reviews.length },
    };
  },

  async getPropertyAnalytics() {
    await delay();
    return db.properties.map((property) => {
      const rows = db.bookings.filter(
        (booking) =>
          booking.propertyId === property.id &&
          booking.status !== "Cancelled" &&
          booking.status !== "No-show",
      );
      return {
        propertyId: property.id,
        name: property.name,
        bookings: rows.length,
        revenue: rows.reduce((total, booking) => total + booking.amount, 0),
        photo: property.photos?.[0] || "",
      };
    });
  },

  async getMonthlyRevenue({ months = 12 } = {}) {
    await delay();
    const now = new Date();
    const buckets = [];
    for (let index = months - 1; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const revenue = db.bookings
        .filter(
          (booking) =>
            booking.status !== "Cancelled" &&
            booking.status !== "No-show" &&
            String(booking.from).startsWith(key),
        )
        .reduce((total, booking) => total + booking.amount, 0);
      buckets.push({ month: key, revenue });
    }
    return buckets;
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
