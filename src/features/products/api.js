import api from "@/lib/axios";

/**
 * Create a new product/tour
 * Accepts either a plain JSON object (legacy) or a FormData (multipart with files).
 * @param {Object|FormData} payload
 * @returns {Promise} Axios response
 */
export const createProduct = (payload, config) => api.post("/tours", payload, config);

/**
 * Update an existing product/tour
 * Accepts either a plain JSON object (legacy) or a FormData (multipart with files).
 * @param {string} id - Product ID
 * @param {Object|FormData} payload
 * @returns {Promise} Axios response
 */
export const updateProduct = (id, payload, config) => api.patch(`/tours/${id}`, payload, config);

/**
 * Fetch a single product/tour by ID
 * @param {string} id - Product ID
 * @returns {Promise} Axios response
 */
export const getProduct = (id) => api.get(`/tours/${id}`);

/**
 * List all products/tours (public, ACTIVE only)
 * @param {Object} params - Query params (page, limit, status, etc.)
 * @returns {Promise} Axios response
 */
export const listProducts = (params = {}) => api.get("/tours", { params });

/**
 * List supplier's own products/tours (authenticated, all statuses)
 * @param {Object} params - Query params (page, limit, status, etc.)
 * @returns {Promise} Axios response
 */
export const listMyProducts = (params = {}) => api.get("/tours/supplier/my-tours", { params });

/**
 * Fetch a single product by ID for the supplier (includes DRAFT/INACTIVE tours)
 * Falls back to fetching from supplier's own tours list if public GET fails
 * @param {string} id - Product ID
 * @returns {Promise} Axios response
 */
export const getMyProduct = async (id) => {
  try {
    const res = await api.get(`/tours/${id}`, { skipGlobalErrorHandler: true });
    return res;
  } catch (err) {
    if (err.response?.status === 404) {
      const listRes = await api.get(`/tours/supplier/my-tours`, { params: { limit: 100 }, skipGlobalErrorHandler: true });
      const tours = listRes.data?.data?.tours || [];
      const tour = tours.find((t) => t.id === id);
      if (!tour) throw err;
      return { data: { status: "success", data: { tour } } };
    }
    throw err;
  }
};

/**
 * Fetch the pending draft snapshot + diff for a product the supplier owns.
 * Returns the merged draft content (live + pending edits) so the builder can
 * continue editing exactly what an admin will review.
 * @param {string} id - Product ID
 * @returns {Promise} Axios response
 */
export const getTourDraft = (id) => api.get(`/tours/${id}/draft`, { skipGlobalErrorHandler: true });

/**
 * Upload photos to Cloudinary (standalone, no tour creation)
 * @param {FormData} formData - FormData with `photos` field containing File[]
 * @returns {Promise} Axios response with { data: { photos: string[] } }
 */
export const uploadPhotos = (formData) =>
  api.post('/tours/upload-photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    skipGlobalErrorHandler: true,
  });

/**
 * Delete a product/tour
 * @param {string} id - Product ID
 * @returns {Promise} Axios response
 */
export const deleteProduct = (id) => api.delete(`/tours/${id}`);

/**
 * Submit a product/tour for admin review (replaces direct publishing)
 * Sets status to PENDING_APPROVAL and notifies the admins.
 * The full submitted payload is passed so the server persists + validates
 * exactly what the supplier submitted (no stale stored draft).
 * @param {string} id - Product ID
 * @param {object} [payload] - Current builder state (buildPayload output)
 * @returns {Promise} Axios response
 */
export const submitProductForReview = (id, payload) => {
  return api.post(`/tours/${id}/submit-for-review`, payload, { skipGlobalErrorHandler: true });
};

/**
 * Withdraw a pending submission so the supplier can edit again.
 * Only allowed while the tour/draft is PENDING_APPROVAL.
 * @param {string} id - Product ID
 * @returns {Promise} Axios response
 */
export const withdrawProductForReview = (id) => api.post(`/tours/${id}/withdraw-review`, undefined, { skipGlobalErrorHandler: true });

/**
 * Request a new keyword to be added to the pre-approved list
 * @param {string} keyword
 * @returns {Promise} Axios response
 */
export const requestKeyword = (keyword) => api.post('/keywords/request', { keyword }, { skipGlobalErrorHandler: true });

/**
 * Clean up uploaded but unsaved media URLs from Cloudinary
 * @param {string[]} urls - Cloudinary URLs to clean up if still pending
 * @returns {Promise} Axios response
 */
export const cleanupMediaUrls = (urls) =>
  api.delete('/media/cleanup', { data: { urls } }).catch(() => {});

/**
 * Query key for the products list, scoped by whether we're fetching the
 * supplier's own tours or the public active-only list.
 */
export const PRODUCTS_LIST_KEY = (useSupplier) => ['products', 'list', useSupplier ? 'supplier' : 'public'];

/**
 * Shared query definition for the products list.  Both the list page and any
 * consumer (prefetch, invalidation) must use this factory so the cached shape
 * and key are always consistent.
 */
export const productsListQuery = (useSupplier) => ({
  queryKey: PRODUCTS_LIST_KEY(useSupplier),
  queryFn: async () => {
    const res = useSupplier
      ? await listMyProducts({ limit: 200 })
      : await listProducts({ limit: 200 });
    return { tours: res.data?.data?.tours || [], useSupplier };
  },
});
