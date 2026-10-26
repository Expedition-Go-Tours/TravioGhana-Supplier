/**
 * Stays verification API — the Stays twin of `features/supplier/api.js`'s
 * document endpoints, plus the status payload the Verification page reads.
 *
 * Stays verification is its own domain (/stays/supplier/verification), not the
 * tour supplier KYC. In mock mode the payload and uploads live in the Stays
 * mock so the page works without a backend.
 */
import api from "@/lib/axios";
import { staysMock } from "../mock/store";
import { staysUsesMockData } from "../api";

const requestConfig = { skipGlobalErrorHandler: true };

/** Supplier profile (documents + properties) and the accommodation requirements. */
export async function loadStaysVerification() {
  if (staysUsesMockData) return staysMock.getVerification();
  const response = await api.get("/stays/supplier/verification", requestConfig);
  return response.data?.data || { profile: null, requirements: null };
}

/** Re-upload a replacement file for a rejected / replacement-requested / expired document. */
export function replaceStaysDocument(docId, file) {
  if (staysUsesMockData) return staysMock.replaceDocument(docId, file);
  const formData = new FormData();
  formData.append("document", file);
  return api.post(`/stays/supplier/verification/documents/${docId}/replace`, formData, requestConfig);
}

/**
 * Upload a document for review. Pass `ownerType` + `ownerId` (PROPERTY) to
 * attach it to a property instead of the supplier — the "repair" path that
 * fixes a property missing one of its documents.
 */
export function addStaysDocument({ type, file, expiryDate, ownerType, ownerId }) {
  if (staysUsesMockData) {
    return staysMock.addDocument({ type, file, expiryDate, ownerType, ownerId });
  }
  const formData = new FormData();
  formData.append("document", file);
  formData.append("type", type);
  if (expiryDate) formData.append("expiryDate", expiryDate);
  if (ownerType) formData.append("ownerType", ownerType);
  if (ownerId) formData.append("ownerId", ownerId);
  return api.post("/stays/supplier/verification/documents", formData, requestConfig);
}
