import api from "@/lib/axios";

export function mapReviewRow(review) {
  return {
    id: review.id,
    tourName: review.tour?.title || "—",
    tourId: review.tourId,
    tourPhoto: review.tour?.coverPhoto || review.tour?.photos?.[0] || null,
    customerId: review.customer?.id || null,
    customerName: review.customer?.name || "—",
    customerPhoto: review.customer?.avatar || review.customer?.photoURL || null,
    customerEmail: review.customer?.email || null,
    customerPhone: review.customer?.phone || null,
    rating: review.rating,
    title: review.title || "",
    comment: review.comment || "",
    date: review.createdAt,
    status: review.status?.toLowerCase() || "pending",
    photos: review.photos?.length || 0,
    photoUrls: review.photos || [],
    helpful: review.helpfulCount || 0,
    bookingId: review.bookingId,
    supplierResponse: review.supplierResponse || null,
    supplierResponseAt: review.supplierResponseAt || null,
    flagReason: review.flagReason || null,
    flagComment: review.flagComment || null,
    flaggedAt: review.flaggedAt || null,
    flagged: review.status?.toUpperCase() === "FLAGGED",
  };
}

export async function fetchSupplierReviews(params = {}) {
  const response = await api.get("/reviews/supplier/reviews", {
    params,
    skipGlobalErrorHandler: true,
  });

  const payload = response.data?.data || {};
  return {
    reviews: (payload.reviews || []).map(mapReviewRow),
    pagination: payload.pagination || null,
  };
}

export function addReviewResponse(id, response) {
  return api.post(`/reviews/${id}/response`, { response }, { skipGlobalErrorHandler: true });
}

export function updateReviewResponse(id, response) {
  return api.patch(`/reviews/${id}/response`, { response }, { skipGlobalErrorHandler: true });
}

export function deleteReviewResponse(id) {
  return api.delete(`/reviews/${id}/response`, { skipGlobalErrorHandler: true });
}

export function flagReview(id, { reason, comment }) {
  return api.post(`/reviews/${id}/flag`, { reason, comment }, { skipGlobalErrorHandler: true });
}
