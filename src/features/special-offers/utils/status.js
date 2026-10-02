/**
 * Offer status, shared by the list page and the builder.
 *
 * This is a client-side mirror of `computeStatus` in the backend's
 * `specialOfferController`. Both sides must agree exactly, otherwise the pill
 * shown while editing and the badge shown after saving would contradict each
 * other — which is precisely how suppliers ended up believing an edit "hadn't
 * taken": the nightly job had flipped `isActive` off and nothing in the builder
 * ever said so.
 *
 * Order matters and is deliberate — the DATES win:
 *   1. `endDate` past → `expired`. Switching the offer off cannot revive a
 *      window that has already run out, so the badge has to say what actually
 *      needs fixing: new dates.
 *   2. switch off → `inactive`. The window is still usable; flipping the
 *      switch is the whole fix.
 *   3. otherwise the window decides `scheduled` / `active`.
 *
 * Checking `isActive` first (the original order) reported every dead offer as
 * `inactive`, because the backend's nightly job writes `isActive: false` as
 * soon as a date passes — leaving the `expired` filter permanently empty.
 *
 * `endDate` is stored at the last millisecond of its UTC day, so an offer is
 * `active` for the whole of the day the supplier picked.
 */
export const STATUS_CONFIG = {
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  scheduled: { label: "Scheduled", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  expired: { label: "Expired", dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200" },
  inactive: { label: "Inactive", dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
};

export function computeOfferStatus(offer) {
  const now = new Date();
  if (offer?.endDate && now > new Date(offer.endDate)) return "expired";
  if (!offer?.isActive) return "inactive";
  if (offer.startDate && now < new Date(offer.startDate)) return "scheduled";
  return "active";
}

/** The status this offer WOULD have if it were switched on. Used to explain
 *  why a saved offer still isn't taking effect. */
export function statusIfActivated(offer) {
  return computeOfferStatus({ ...offer, isActive: true });
}
