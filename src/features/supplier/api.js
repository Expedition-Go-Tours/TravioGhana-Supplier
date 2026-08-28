import api from "@/lib/axios";

/**
 * Supplier verification API client — per-document re-upload and vehicle/guide
 * management against the supplier verification endpoints.
 */

/** Re-upload a replacement file for a rejected / replacement-requested / expired document. */
export async function replaceDocument(docId, file) {
  const formData = new FormData();
  formData.append("document", file);
  const response = await api.post(`/suppliers/documents/${docId}/replace`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}

/** Upload an additional document for review. */
export async function addDocument({ type, file, expiryDate }) {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("type", type);
  if (expiryDate) formData.append("expiryDate", expiryDate);
  const response = await api.post("/suppliers/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}

/** Add a vehicle with its documents and photos (multipart). */
export async function addVehicle({ data, documents, vehiclePhotos }) {
  const formData = new FormData();
  formData.append("vehicles", JSON.stringify([data]));
  if (vehiclePhotos && vehiclePhotos.length > 0) {
    formData.append("vehiclePhotoMeta", JSON.stringify(vehiclePhotos.map(() => ({ vehicleKey: data.key }))));
    vehiclePhotos.forEach((file) => formData.append("vehiclePhotos", file));
  }
  if (documents && documents.length > 0) {
    formData.append("documentMeta", JSON.stringify(documents.map((d) => ({
      type: d.type,
      ownerType: "VEHICLE",
      ownerKey: data.key,
    }))));
    documents.forEach((d) => formData.append("documents", d.file));
  }
  const response = await api.post("/suppliers/vehicles", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}

export async function removeVehicle(vehicleId) {
  const response = await api.delete(`/suppliers/vehicles/${vehicleId}`, { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

/** Add a guide with their licence documents (multipart). */
export async function addGuide({ data, documents }) {
  const formData = new FormData();
  formData.append("guides", JSON.stringify([data]));
  if (documents && documents.length > 0) {
    formData.append("documentMeta", JSON.stringify(documents.map((d) => ({
      type: d.type,
      ownerType: "GUIDE",
      ownerKey: data.key,
    }))));
    documents.forEach((d) => formData.append("documents", d.file));
  }
  const response = await api.post("/suppliers/guides", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || null;
}

export async function removeGuide(guideId) {
  const response = await api.delete(`/suppliers/guides/${guideId}`, { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}
