/**
 * Stays offer status — the Stays mirror of
 * `features/special-offers/utils/status.js` so the list page, the detail
 * modal and the builder all agree on one derivation:
 *
 *   1. `isActive` is checked FIRST — a switched-off offer is `inactive`
 *      regardless of its dates.
 *   2. otherwise the window decides `scheduled` / `expired` / `active`.
 */
export const OFFER_STATUS_CONFIG = {
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  scheduled: { label: "Scheduled", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  expired: { label: "Expired", dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200" },
  inactive: { label: "Inactive", dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
};

export const OFFER_TYPE_LABELS = {
  LIMITED_TIME: "Limited Time",
  EARLY_BIRD: "Early Bird",
  LAST_MINUTE: "Last Minute",
};

export function computeOfferStatus(offer) {
  const now = new Date();
  if (!offer?.isActive) return "inactive";
  if (offer.startDate && now < new Date(offer.startDate)) return "scheduled";
  if (offer.endDate && now > new Date(offer.endDate)) return "expired";
  return "active";
}

/** The status this offer WOULD have if it were switched on. */
export function statusIfActivated(offer) {
  return computeOfferStatus({ ...offer, isActive: true });
}

/** Percentage or fixed-amount discount, applied to one nightly price. */
export function discountedPrice(price, offer) {
  const base = Number(price) || 0;
  if (offer?.discountType === "FIXED_AMOUNT") {
    return Math.max(base - (Number(offer.fixedDiscountValue) || 0), 0);
  }
  return Math.round(base * (1 - (Number(offer.discountPercentage) || 0) / 100));
}
