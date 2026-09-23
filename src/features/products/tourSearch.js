/**
 * Client-side tour search for the dashboard search bar.
 *
 * Searches a supplier's own products (from the shared React Query list) by the
 * fields a supplier would naturally type: title, category, subcategory, city,
 * country, tags, reference code, description and the itinerary stops (each
 * stop's name plus its city/region).
 */

function extractCategory(tour) {
  return tour?.category || tour?.categorization?.category || tour?.subcategory || "";
}

/**
 * Searchable text from a tour's itinerary: every stop's name plus its
 * city/region/address, and the server-extracted itinerary-city list. Suppliers
 * search their products by stop ("Cedi bead Factory"), not just by title.
 */
function extractItinerary(tour) {
  const parts = [];
  const locations = tour?.productContent?.locations;
  if (Array.isArray(locations)) {
    for (const loc of locations) {
      if (!loc) continue;
      parts.push(loc.name, loc.city, loc.region, loc.address);
    }
  }
  if (Array.isArray(tour?.itineraryCities)) parts.push(...tour.itineraryCities);
  return parts;
}

/** Lower-cased bag of searchable text for a tour. */
export function tourSearchText(tour) {
  if (!tour) return "";
  const tags = Array.isArray(tour.tags) ? tour.tags : [];
  return [tour.title, extractCategory(tour), tour.subcategory, tour.city, tour.country, tour.referenceCode, ...tags, tour.description, ...extractItinerary(tour)]
    .filter((v) => typeof v === "string" && v.length > 0)
    .join(" ")
    .toLowerCase();
}

/** Filter a tour list by a raw query (case-insensitive substring match). */
export function searchTours(tours, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return (tours || []).filter((tour) => tourSearchText(tour).includes(q));
}

/** Short subtitle for a search result row, e.g. "Adventure • Accra, Ghana". */
export function tourSubtitle(tour) {
  const parts = [extractCategory(tour), [tour?.city, tour?.country].filter(Boolean).join(", ")].filter(Boolean);
  if (parts.length) return parts.join(" • ");
  if (tour?.status) return tour.status.replace(/_/g, " ");
  return "";
}
