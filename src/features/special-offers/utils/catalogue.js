import { listMyProducts } from "@/features/products/api";

const PUBLISHED_STATUSES = ["ACTIVE", "PAUSED"];
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

// Option keys are matched contract-symbolically against the customer's
// checkout `tourOptionKey`: the slugified schedule name. Both sides must use
// the same transformation, so keep this in sync with the booking engine.
export function optionKeyFor(name) {
  const key = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return key || "option";
}

export function parseBlob(value) {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value || null;
}

export function scheduleOptions(tour) {
  const blob = parseBlob(tour?.schedulesAndPricing);
  const schedules = blob?.pricingSchedules?.schedules;
  if (!Array.isArray(schedules) || schedules.length <= 1) return [];
  return schedules.map((s, i) => ({
    key: optionKeyFor(s?.name || `Option ${i + 1}`),
    label: s?.name || `Option ${i + 1}`,
  }));
}

// Tier-aware "from" price: the cheapest retail price across the product's
// pricing categories and tiers (lowest tier pricePerPerson), or the base
// price when no tiers exist. `per` reports the booking unit so callers can
// label the price correctly (per person vs. per group tours).
export function startPriceOf(tour) {
  const blob = parseBlob(tour?.schedulesAndPricing);
  const td = blob?.travelerDetails || {};
  const pricingModel = td.pricingModel || "perPerson";
  const pricingApproach = td.pricingApproach || "dependsOnAge";

  if (pricingModel === "perGroup") {
    const groupPrices = (Array.isArray(td.groupSizes) ? td.groupSizes : [])
      .map((gs) => Number(gs?.price))
      .filter((n) => Number.isFinite(n) && n != null);
    if (groupPrices.length > 0) return { price: Math.min(...groupPrices), per: "group" };
    return null;
  }

  if (pricingApproach === "sameForEveryone") {
    const uniform = Number(td.uniformPrice);
    if (Number.isFinite(uniform) && uniform != null) return { price: uniform, per: "person" };
    return null;
  }

  const cats = Array.isArray(td.pricingCategories) && td.pricingCategories.length > 0
    ? td.pricingCategories
    : (Array.isArray(td.ageGroups) ? td.ageGroups : []);

  // Tiers live on the adult category, so when an adult category exists only
  // its base/tier prices are considered — quoting against a child rate would
  // make the discount math diverge from a real adult booking.
  const adultish = cats.filter((cat) => {
    const label = String((cat?.name ?? cat?.label) ?? "").toLowerCase();
    return label === "adult" || label === "adults";
  });
  const base = adultish.length > 0 ? adultish : cats;

  const candidates = [];
  for (const cat of base) {
    if (!cat) continue;
    if (cat.price != null) candidates.push(Number(cat.price));
    if (Array.isArray(cat.tiers)) {
      for (const tier of cat.tiers) {
        if (tier?.pricePerPerson != null) candidates.push(Number(tier.pricePerPerson));
      }
    }
  }
  const finite = candidates.filter((n) => Number.isFinite(n));
  if (finite.length > 0) return { price: Math.min(...finite), per: "person" };

  // Last resort: derived schedule prices on legacy blobs that predate
  // travelerDetails.
  const schedules = Array.isArray(blob?.pricingSchedules?.schedules) ? blob.pricingSchedules.schedules : [];
  const legacy = [];
  for (const s of schedules) {
    if (Array.isArray(s?.prices)) {
      for (const p of s.prices) {
        const n = Number(p?.retailPrice);
        if (Number.isFinite(n) && n != null) legacy.push(n);
      }
    }
  }
  if (legacy.length > 0) return { price: Math.min(...legacy), per: "person" };

  return null;
}

// Loads every page of the supplier's own product catalogue, keeping only
// published products (draft/rejected products can't receive offers).
export async function fetchPublishedCatalogue() {
  const collected = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await listMyProducts({ page, limit: PAGE_SIZE });
    const data = res.data?.data;
    const batch = data?.tours || [];
    collected.push(...batch);
    const pagination = data?.pagination;
    if (!pagination || page >= pagination.totalPages) break;
  }
  return collected.filter((tour) => PUBLISHED_STATUSES.includes(tour.status));
}