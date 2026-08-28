import api from "@/lib/axios";

export const fetchSpecialOffers = (params = {}) =>
  api.get("/suppliers/special-offers", { params });

export const createSpecialOffer = (data) =>
  api.post("/suppliers/special-offers", data);

export const getSpecialOffer = (id) =>
  api.get(`/suppliers/special-offers/${id}`);

export const updateSpecialOffer = (id, data) =>
  api.put(`/suppliers/special-offers/${id}`, data);

export const deleteSpecialOffer = (id) =>
  api.delete(`/suppliers/special-offers/${id}`);

export const toggleSpecialOffer = (id) =>
  api.patch(`/suppliers/special-offers/${id}/toggle`);

export const fetchOfferListings = (params = {}) =>
  api.get("/tours/offers", { params });
