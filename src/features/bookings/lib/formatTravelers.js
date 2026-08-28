// The storefront stores travelers as an object {adults, children, infants,
// phoneNumber, location, details[]}, but older/seed data can be a JSON string
// or a bare array of {name, age}. Normalize every shape so the supplier UI
// renders a correct count + party summary regardless of source.

function normalizeTravelers(travelers) {
  if (!travelers) return null;
  if (typeof travelers === "string") {
    try {
      travelers = JSON.parse(travelers);
    } catch {
      return null;
    }
  }
  if (!travelers || typeof travelers !== "object") return null;
  return travelers;
}

// Count heads the same way the backend's availabilityCore.travelerCount does:
// every numeric field (adults, children, infants, seniors, students, …) counts;
// metadata (phone, location, details) never inflates the total.
export function getTravelerCount(travelers) {
  const t = normalizeTravelers(travelers);
  if (!t) return 0;
  if (Array.isArray(t)) return t.filter(Boolean).length;
  let total = 0;
  for (const value of Object.values(t)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      total += value;
    } else if (typeof value === "string" && /^[0-9]+$/.test(value)) {
      total += Number(value);
    }
  }
  return total;
}

function categoryLabel(key, count) {
  const map = {
    adults: ["Adult", "Adults"],
    children: ["Child", "Children"],
    infants: ["Infant", "Infants"],
    seniors: ["Senior", "Seniors"],
    students: ["Student", "Students"],
  };
  const pair = map[key];
  if (pair) return `${count} ${count === 1 ? pair[0] : pair[1]}`;
  return `${count} ${key.charAt(0).toUpperCase() + key.slice(1)}`;
}

export function formatPartySummary(travelers) {
  const t = normalizeTravelers(travelers);
  if (!t) return "";
  if (Array.isArray(t)) {
    const count = t.filter(Boolean).length;
    return `${count} Traveler${count === 1 ? "" : "s"}`;
  }
  const parts = [];
  for (const [key, value] of Object.entries(t)) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (Array.isArray(value) || typeof value === "object") continue;
    if (["phoneNumber", "location"].includes(key)) continue;
    parts.push(categoryLabel(key, n));
  }
  return parts.join(" · ");
}

export function formatTravelerDetails(travelers) {
  const t = normalizeTravelers(travelers);
  if (!t) return "";
  const details = Array.isArray(t) ? t : t.details;
  if (!Array.isArray(details)) return "";
  return details
    .map((d) => {
      if (!d) return "";
      const name = d.name || "";
      const age = d.age != null ? ` (${d.age})` : "";
      return `${name}${age}`.trim();
    })
    .filter(Boolean)
    .join(", ");
}

export function getTravelerDetails(travelers) {
  const t = normalizeTravelers(travelers);
  if (!t) return [];
  const details = Array.isArray(t) ? t : t.details;
  if (Array.isArray(details) && details.length > 0) {
    return details.filter(Boolean).map((d) => ({
      name: d.name || d.firstName || "",
      age: d.age ?? null,
      type: d.ageGroup || d.type || "adult",
    }));
  }
  const parts = [];
  const counts = { adults: t.adults, children: t.children, infants: t.infants, seniors: t.seniors };
  for (const [type, count] of Object.entries(counts)) {
    const n = Number(count);
    if (Number.isFinite(n) && n > 0) {
      for (let i = 0; i < n; i++) {
        parts.push({ name: "", age: null, type });
      }
    }
  }
  if (parts.length === 0) {
    const total = Object.values(t).reduce((s, v) => {
      const n = Number(v);
      return s + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
    for (let i = 0; i < Math.max(1, total); i++) {
      parts.push({ name: "", age: null, type: "adult" });
    }
  }
  return parts;
}
