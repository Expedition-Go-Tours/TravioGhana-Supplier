/**
 * Stays settings API — the Stays twin of `features/settings/api.js`.
 *
 * The live endpoints mirror the shared supplier settings contract; in mock
 * mode the account (business profile, notification preferences/recipients,
 * tax info, team) lives in the Stays mock. Payout methods, payout settings and
 * the finance summary come straight from `financeApi` — the Stays mirror that
 * already backs the Finance page, in USD.
 */
import api from "@/lib/axios";
import { staysMock } from "./mock/store";
import { staysUsesMockData } from "./api";

const requestConfig = { skipGlobalErrorHandler: true };

/* ── Personal + business profile ─────────────────────────────────────────── */

export async function fetchCurrentUser() {
  if (staysUsesMockData) return (await staysMock.getAccount()).user;
  const response = await api.get("/users/me", requestConfig);
  return response.data?.data?.user || null;
}

export async function updateCurrentUser(data) {
  if (staysUsesMockData) return staysMock.updateAccountUser(data);
  return api.patch("/users/updateMe", data, requestConfig);
}

export async function uploadSupplierLogo(formData) {
  if (staysUsesMockData) {
    const file = formData?.get?.("logo");
    if (file && typeof FileReader !== "undefined") {
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { logoUrl: url };
    }
    return { logoUrl: null };
  }
  const response = await api.post("/suppliers/logo", formData, {
    ...requestConfig,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data?.data || null;
}

export async function fetchBusinessProfile() {
  if (staysUsesMockData) return (await staysMock.getAccount()).business;
  const response = await api.get("/suppliers/settings/business-profile", requestConfig);
  return response.data?.data || null;
}

export async function updateBusinessProfile(data) {
  if (staysUsesMockData) return staysMock.updateBusinessProfile(data);
  const response = await api.patch("/suppliers/settings/business-profile", data, requestConfig);
  return response.data?.data || null;
}

/* ── Notification preferences + recipients ───────────────────────────────── */

export async function fetchNotificationPreferences() {
  if (staysUsesMockData) return staysMock.getNotificationPreferences();
  const response = await api.get("/suppliers/settings/notification-preferences", requestConfig);
  return response.data?.data || null;
}

export async function updateNotificationPreferences(data) {
  if (staysUsesMockData) return staysMock.updateNotificationPreferences(data);
  const response = await api.put("/suppliers/settings/notification-preferences", data, requestConfig);
  return response.data?.data || null;
}

export async function fetchNotificationRecipients() {
  if (staysUsesMockData) return staysMock.listNotificationRecipients();
  const response = await api.get("/suppliers/settings/notification-recipients", requestConfig);
  return response.data?.data?.recipients || [];
}

export async function addNotificationRecipient(data) {
  if (staysUsesMockData) return staysMock.addNotificationRecipient(data);
  const response = await api.post("/suppliers/settings/notification-recipients", data, requestConfig);
  return response.data?.data?.recipient || null;
}

export async function updateNotificationRecipient(id, data) {
  if (staysUsesMockData) return staysMock.updateNotificationRecipient(id, data);
  const response = await api.patch(`/suppliers/settings/notification-recipients/${id}`, data, requestConfig);
  return response.data?.data?.recipient || null;
}

export async function resendNotificationRecipient(id) {
  if (staysUsesMockData) return staysMock.resendNotificationRecipient(id);
  const response = await api.post(`/suppliers/settings/notification-recipients/${id}/resend`, {}, requestConfig);
  return response.data?.data?.recipient || null;
}

export async function removeNotificationRecipient(id) {
  if (staysUsesMockData) return staysMock.removeNotificationRecipient(id);
  await api.delete(`/suppliers/settings/notification-recipients/${id}`, requestConfig);
  return { ok: true };
}

/* ── Tax information ─────────────────────────────────────────────────────── */

export async function fetchTaxInfo() {
  if (staysUsesMockData) return staysMock.getTaxInfo();
  const response = await api.get("/suppliers/settings/tax-info", requestConfig);
  return response.data?.data || null;
}

export async function updateTaxInfo(data) {
  if (staysUsesMockData) return staysMock.updateTaxInfo(data);
  const response = await api.patch("/suppliers/settings/tax-info", data, requestConfig);
  return response.data?.data || null;
}

/* ── Payouts (the Stays finance mirror, already mock-backed in USD) ──────── */

export {
  fetchPayoutMethods,
  createPayoutMethod,
  deletePayoutMethod,
  fetchPayoutSettings,
  fetchFinanceSummary,
} from "./financeApi";

/**
 * Recent payouts for the settings tab. The Stays backend models payouts as
 * payout requests, so the mock maps those rows into the same card shape the
 * Experiences settings page renders.
 */
export async function fetchPayouts(params = {}) {
  if (staysUsesMockData) {
    const [requestsPayload, financeSummary] = await Promise.all([
      staysMock.getPayoutRequests({ limit: params.limit || 10 }),
      staysMock.getFinanceSummary(),
    ]);
    return {
      payouts: (requestsPayload.requests || []).map((request) => ({
        id: request.id,
        amount: Number(request.amount) || 0,
        status: request.status,
        date: request.createdAt,
        currency: request.currency || "USD",
        bookingNumber: request.requestNumber || "Payout request",
        tour: request.cycleLabel || "",
        method: request.method || "—",
        account: "—",
        reference: request.reference || "",
      })),
      summary: { totalEarned: financeSummary.paidOut?.total || 0, currency: "USD" },
      pagination: null,
    };
  }
  const response = await api.get("/payouts/me", { ...requestConfig, params });
  const payload = response.data?.data || {};
  return {
    payouts: (payload.payouts || []).map((payout) => ({
      id: payout.id,
      amount: Number(payout.amount) || 0,
      status: payout.status,
      date: payout.paidAt || payout.processedAt || payout.createdAt,
      currency: payout.currency || "USD",
      bookingNumber: payout.booking?.bookingNumber || "—",
      tour: payout.booking?.property?.name || "—",
      method: payout.payoutMethod?.type?.replace(/_/g, " ") || payout.paymentMethod || "—",
      account:
        payout.payoutMethod?.accountNumber?.slice(-4) ||
        payout.payoutMethod?.mobileNumber?.slice(-4) ||
        payout.payoutMethod?.paypalEmail ||
        "—",
      reference: payout.reference || "",
    })),
    summary: payload.summary || {},
    pagination: payload.pagination || null,
  };
}

/* ── Team ────────────────────────────────────────────────────────────────── */

export async function fetchTeamMembers() {
  if (staysUsesMockData) return staysMock.listTeamMembers();
  const response = await api.get("/suppliers/settings/team/members", requestConfig);
  return response.data?.data?.members || [];
}

export async function inviteTeamMember(data) {
  if (staysUsesMockData) return staysMock.inviteTeamMember(data);
  const response = await api.post("/suppliers/settings/team/invite", data, requestConfig);
  return {
    member: response.data?.data?.member || null,
    emailSent: response.data?.data?.emailSent !== false,
    message: response.data?.message,
  };
}

export async function resendInvite(email) {
  if (staysUsesMockData) return staysMock.resendInvite(email);
  const response = await api.post("/suppliers/settings/team/invite/resend", { email }, requestConfig);
  return {
    emailSent: response.data?.data?.emailSent !== false,
    message: response.data?.message,
  };
}

export async function removeTeamMember(id) {
  if (staysUsesMockData) return staysMock.removeTeamMember(id);
  return api.delete(`/suppliers/settings/team/members/${id}`, requestConfig);
}

export async function revokeTeamInvite(id) {
  if (staysUsesMockData) return staysMock.revokeTeamInvite(id);
  return api.delete(`/suppliers/settings/team/invite/${id}`, requestConfig);
}

export async function updateTeamMemberRole(id, roles) {
  const list = Array.isArray(roles) ? roles : [roles];
  if (staysUsesMockData) return staysMock.updateTeamMemberRoles(id, list);
  return api.patch(
    `/suppliers/settings/team/members/${id}/role`,
    { roles: list, role: list[0] },
    requestConfig,
  );
}

export async function directAddTeamMember(data) {
  if (staysUsesMockData) return staysMock.directAddTeamMember(data);
  const response = await api.post("/suppliers/settings/team/direct-add", data, requestConfig);
  return response.data?.data?.member || null;
}

/* ── Security ────────────────────────────────────────────────────────────── */

export async function changeStaysPassword({ currentPassword, newPassword }) {
  if (staysUsesMockData) return { ok: true };
  return api.patch("/auth/change-password", { currentPassword, newPassword }, requestConfig);
}
