import api from "@/lib/axios";

export async function fetchCurrentUser() {
  const response = await api.get("/users/me", { skipGlobalErrorHandler: true });
  return response.data?.data?.user || null;
}

export function updateCurrentUser(data) {
  return api.patch("/users/updateMe", data, { skipGlobalErrorHandler: true });
}

export async function uploadSupplierLogo(formData) {
  const response = await api.post("/suppliers/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}

export async function fetchBusinessProfile() {
  const response = await api.get("/suppliers/settings/business-profile", { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function updateBusinessProfile(data) {
  const response = await api.patch("/suppliers/settings/business-profile", data, { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function fetchNotificationPreferences() {
  const response = await api.get("/suppliers/settings/notification-preferences", { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function updateNotificationPreferences(data) {
  const response = await api.put("/suppliers/settings/notification-preferences", data, { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function fetchTaxInfo() {
  const response = await api.get("/suppliers/settings/tax-info", { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function updateTaxInfo(data) {
  const response = await api.patch("/suppliers/settings/tax-info", data, { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function fetchBookingRules() {
  const response = await api.get("/suppliers/settings/booking-rules", { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function updateBookingRules(data) {
  const response = await api.put("/suppliers/settings/booking-rules", data, { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function fetchTeamMembers() {
  const response = await api.get("/suppliers/settings/team/members", { skipGlobalErrorHandler: true });
  return response.data?.data?.members || [];
}

export async function inviteTeamMember(data) {
  const response = await api.post("/suppliers/settings/team/invite", data, { skipGlobalErrorHandler: true });
  return response.data?.data?.member || null;
}

export async function resendInvite(email) {
  const response = await api.post("/suppliers/settings/team/invite/resend", { email }, { skipGlobalErrorHandler: true });
  return response.data;
}

export async function removeTeamMember(id) {
  return api.delete(`/suppliers/settings/team/members/${id}`, { skipGlobalErrorHandler: true });
}

export async function updateTeamMemberRole(id, role) {
  return api.patch(`/suppliers/settings/team/members/${id}/role`, { role }, { skipGlobalErrorHandler: true });
}

export async function directAddTeamMember(data) {
  const response = await api.post("/suppliers/settings/team/direct-add", data, { skipGlobalErrorHandler: true });
  return response.data?.data?.member || null;
}

export async function fetchInviteDetails(token) {
  const response = await api.get(`/suppliers/settings/team/invite/${token}`, { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function acceptInvite(token) {
  const response = await api.post(`/suppliers/settings/team/invite/${token}/accept`, {}, { skipGlobalErrorHandler: true });
  return response.data?.data?.member || null;
}

export async function declineInvite(token) {
  return api.post(`/suppliers/settings/team/invite/${token}/decline`, {}, { skipGlobalErrorHandler: true });
}

// Payout functions are shared from the finance feature to avoid duplication.
export { fetchPayoutMethods, createPayoutMethod, deletePayoutMethod, fetchPayouts } from "@/features/finance/api";
