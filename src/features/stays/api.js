/**
 * Stays workspace API.
 *
 * Every function resolves to already-unwrapped data (the convention used by
 * `features/finance/api.js` and friends) and reads either from:
 *
 *   - the in-feature mock dataset (`features/stays/mock`), or
 *   - the live supplier API,
 *
 * decided by `config.stays.dataSource` (`VITE_STAYS_DATA_SOURCE`). The live
 * endpoint paths and response shapes below ARE the backend contract; the mock
 * mirrors them function-for-function, so flipping the switch is a config
 * change, never a page change.
 *
 * The live calls intentionally use `skipGlobalErrorHandler` — pages surface
 * their own error states with retry, the same pattern as the products list.
 */
import api from "@/lib/axios";
import { config } from "@/config";
import { staysMock } from "./mock/store";

export const staysUsesMockData = config.stays.dataSource !== "api";

const BASE = "/stays/supplier";

/* ── Query keys ──────────────────────────────────────────────────────────── */
export const STAYS_KEYS = {
  dashboard: ["stays", "dashboard"],
  properties: (filters = {}) => ["stays", "properties", filters],
  property: (id) => ["stays", "property", id],
  bookings: (filters = {}) => ["stays", "bookings", filters],
  availability: (propertyId, from, to) => ["stays", "availability", propertyId, from, to],
  offers: (filter = "All") => ["stays", "offers", filter],
  messages: (filter = "All") => ["stays", "messages", filter],
  reviews: (filter = "All") => ["stays", "reviews", filter],
  analytics: (period) => ["stays", "analytics", period],
  cancellation: (days) => ["stays", "cancellation", days],
};

const requestConfig = { skipGlobalErrorHandler: true };

/* ── Dashboard ───────────────────────────────────────────────────────────── */
export async function fetchStaysDashboard() {
  if (staysUsesMockData) return staysMock.getDashboard();
  const res = await api.get(`${BASE}/dashboard`, requestConfig);
  return res.data?.data;
}

/* ── Properties ──────────────────────────────────────────────────────────── */
export async function listProperties(params = {}) {
  if (staysUsesMockData) return staysMock.listProperties(params);
  const res = await api.get(`${BASE}/properties`, { ...requestConfig, params });
  return res.data?.data?.properties || [];
}

export async function getProperty(id) {
  if (staysUsesMockData) return staysMock.getProperty(id);
  const res = await api.get(`${BASE}/properties/${id}`, requestConfig);
  return res.data?.data?.property;
}

export async function createProperty(payload) {
  if (staysUsesMockData) return staysMock.createProperty(payload);
  const res = await api.post(`${BASE}/properties`, payload, requestConfig);
  return res.data?.data?.property;
}

export async function updateProperty(id, patch) {
  if (staysUsesMockData) return staysMock.updateProperty(id, patch);
  const res = await api.patch(`${BASE}/properties/${id}`, patch, requestConfig);
  return res.data?.data?.property;
}

export async function submitProperty(id) {
  if (staysUsesMockData) return staysMock.submitProperty(id);
  const res = await api.post(`${BASE}/properties/${id}/submit-for-review`, {}, requestConfig);
  return res.data?.data?.property;
}

export async function deleteProperty(id) {
  if (staysUsesMockData) return staysMock.deleteProperty(id);
  const res = await api.delete(`${BASE}/properties/${id}`, requestConfig);
  return res.data?.data;
}

export async function addPropertyPhotos(id, dataUrls) {
  if (staysUsesMockData) return staysMock.addPhotos(id, dataUrls);
  // Live: multipart upload, one request per file batch.
  const res = await api.post(`${BASE}/properties/${id}/photos`, { photos: dataUrls }, requestConfig);
  return res.data?.data?.photos || [];
}

export async function removePropertyPhoto(id, index) {
  if (staysUsesMockData) return staysMock.removePhoto(id, index);
  const res = await api.delete(`${BASE}/properties/${id}/photos/${index}`, requestConfig);
  return res.data?.data?.photos || [];
}

/* ── Rooms & rate plans ──────────────────────────────────────────────────── */
export async function saveRoom(propertyId, room) {
  if (staysUsesMockData) return staysMock.saveRoom(propertyId, room);
  const res = room.id
    ? await api.patch(`${BASE}/properties/${propertyId}/rooms/${room.id}`, room, requestConfig)
    : await api.post(`${BASE}/properties/${propertyId}/rooms`, room, requestConfig);
  return res.data?.data?.property;
}

export async function deleteRoom(propertyId, roomId) {
  if (staysUsesMockData) return staysMock.deleteRoom(propertyId, roomId);
  const res = await api.delete(`${BASE}/properties/${propertyId}/rooms/${roomId}`, requestConfig);
  return res.data?.data?.property;
}

export async function saveRatePlan(propertyId, plan) {
  if (staysUsesMockData) return staysMock.saveRatePlan(propertyId, plan);
  const res = plan.id
    ? await api.patch(`${BASE}/properties/${propertyId}/rate-plans/${plan.id}`, plan, requestConfig)
    : await api.post(`${BASE}/properties/${propertyId}/rate-plans`, plan, requestConfig);
  return res.data?.data?.property;
}

export async function deleteRatePlan(propertyId, planId) {
  if (staysUsesMockData) return staysMock.deleteRatePlan(propertyId, planId);
  const res = await api.delete(`${BASE}/properties/${propertyId}/rate-plans/${planId}`, requestConfig);
  return res.data?.data?.property;
}

/* ── Availability ────────────────────────────────────────────────────────── */
export async function getAvailability(propertyId, { from, to } = {}) {
  if (staysUsesMockData) return staysMock.getAvailability(propertyId, { from, to });
  const res = await api.get(`${BASE}/properties/${propertyId}/availability`, {
    ...requestConfig,
    params: { from, to },
  });
  return res.data?.data;
}

export async function setAvailabilityCell(propertyId, { roomId, date, values }) {
  if (staysUsesMockData) return staysMock.setAvailabilityCell(propertyId, { roomId, date, values });
  const res = await api.put(
    `${BASE}/properties/${propertyId}/availability`,
    { roomId, date, ...values },
    requestConfig,
  );
  return res.data?.data;
}

/** Removes the room/date override so the room's defaults apply again. */
export async function clearAvailabilityCell(propertyId, { roomId, date }) {
  if (staysUsesMockData) return staysMock.clearAvailabilityCell(propertyId, { roomId, date });
  const res = await api.delete(`${BASE}/properties/${propertyId}/availability`, {
    ...requestConfig,
    params: { roomId, date },
  });
  return res.data?.data;
}

/* ── Bookings ────────────────────────────────────────────────────────────── */
export async function listStaysBookings(params = {}) {
  if (staysUsesMockData) return staysMock.listBookings(params);
  const res = await api.get(`${BASE}/bookings`, { ...requestConfig, params });
  return res.data?.data?.bookings || [];
}

export async function updateBookingStatus(id, status) {
  if (staysUsesMockData) return staysMock.updateBookingStatus(id, status);
  const res = await api.patch(`${BASE}/bookings/${id}/status`, { status }, requestConfig);
  return res.data?.data?.booking;
}

/* ── Offers ──────────────────────────────────────────────────────────────── */
export async function listOffers(params = {}) {
  if (staysUsesMockData) return staysMock.listOffers(params);
  const res = await api.get(`${BASE}/offers`, { ...requestConfig, params });
  return res.data?.data?.offers || [];
}

export async function saveOffer(offer) {
  if (staysUsesMockData) return staysMock.saveOffer(offer);
  const res = offer.id
    ? await api.patch(`${BASE}/offers/${offer.id}`, offer, requestConfig)
    : await api.post(`${BASE}/offers`, offer, requestConfig);
  return res.data?.data?.offers || [];
}

export async function deleteOffer(id) {
  if (staysUsesMockData) return staysMock.deleteOffer(id);
  const res = await api.delete(`${BASE}/offers/${id}`, requestConfig);
  return res.data?.data;
}

/* ── Guest messages & reviews ────────────────────────────────────────────── */
export async function listGuestMessages(params = {}) {
  if (staysUsesMockData) return staysMock.listMessages(params);
  const res = await api.get(`${BASE}/messages`, { ...requestConfig, params });
  return res.data?.data?.messages || [];
}

export async function replyToGuestMessage(id, reply) {
  if (staysUsesMockData) return staysMock.replyToMessage(id, reply);
  const res = await api.post(`${BASE}/messages/${id}/reply`, { reply }, requestConfig);
  return res.data?.data?.message;
}

export async function listStaysReviews(params = {}) {
  if (staysUsesMockData) return staysMock.listReviews(params);
  const res = await api.get(`${BASE}/reviews`, { ...requestConfig, params });
  return res.data?.data?.reviews || [];
}

export async function replyToStaysReview(id, reply) {
  if (staysUsesMockData) return staysMock.replyToReview(id, reply);
  const res = await api.post(`${BASE}/reviews/${id}/reply`, { reply }, requestConfig);
  return res.data?.data?.review;
}

/* ── Reporting ───────────────────────────────────────────────────────────── */
export async function fetchCancellationSummary(params = {}) {
  if (staysUsesMockData) return staysMock.getCancellationSummary(params);
  const res = await api.get(`${BASE}/cancellation`, { ...requestConfig, params });
  return res.data?.data;
}

export async function fetchStaysAnalytics(params = {}) {
  if (staysUsesMockData) return staysMock.getAnalytics(params);
  const res = await api.get(`${BASE}/analytics`, { ...requestConfig, params });
  return res.data?.data;
}
