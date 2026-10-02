/**
 * Offer status, shared by the list page and the builder.
 *
 * This is a client-side mirror of `computeOfferStatus` in the backend's
 * `src/core/services/offerStatus.js`, which both backend status producers share.
 * Both sides must agree exactly, otherwise the pill shown while editing and the
 * badge shown after saving would contradict each other — which is precisely how
 * suppliers ended up believing an edit "hadn't taken": the nightly job had
 * flipped `isActive` off and nothing in the builder ever said so.
 *
 * THREE states only: `active` | `scheduled` | `expired`.
 *
 * There is deliberately no `inactive`. A switched-off offer earns nothing and
 * will never go live by itself — exactly the position an offer whose window has
 * run out is in — so both carry `expired`: one badge, one filter, one stat
 * card. Where the difference actually matters the two are still told apart by
 * `statusIfActivated` below: if the window alone already works, flipping the
 * switch is the whole fix, and the builder says so in as many words.
 *
 * Order matters and is deliberate — the DATES win:
 *   1. `endDate` past → `expired`.
 *   2. switch off     → `expired`.
 *   3. otherwise the window decides `scheduled` / `active`.
 *
 * Rules 1 and 2 share a label, so the order between them no longer changes any
 * outcome. What still matters is that BOTH outrank `scheduled`: the backend's
 * nightly job writes `isActive: false` the moment a date passes, and nothing
 * turns a switched-off offer on by itself, so neither may ever be labelled
 * `scheduled` — that would promise a launch the switch prevents.
 *
 * `endDate` is stored at the last millisecond of its UTC day, so an offer is
 * `active` for the whole of the day the supplier picked.
 */
export const STATUS_CONFIG = {
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  scheduled: { label: "Scheduled", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  expired: { label: "Expired", dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200" },
};

export function computeOfferStatus(offer) {
  const now = new Date();
  if (offer?.endDate && now > new Date(offer.endDate)) return "expired";
  if (!offer?.isActive) return "expired";
  if (offer.startDate && now < new Date(offer.startDate)) return "scheduled";
  return "active";
}

/** The status this offer WOULD have if it were switched on. This, not the badge,
 *  is what separates "the window has run out" from "only the switch is in the
 *  way" now that both read as `expired`. */
export function statusIfActivated(offer) {
  return computeOfferStatus({ ...offer, isActive: true });
}
