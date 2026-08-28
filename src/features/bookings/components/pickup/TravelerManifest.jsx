import { Users, User } from "lucide-react";

function normalizeTravelers(travelers) {
  if (!travelers) return null;
  if (typeof travelers === "string") {
    try { travelers = JSON.parse(travelers); } catch { return null; }
  }
  if (!travelers || typeof travelers !== "object") return null;
  return travelers;
}

function getTravelerDetails(travelers) {
  const t = normalizeTravelers(travelers);
  if (!t) return [];
  const details = Array.isArray(t) ? t : t.details;
  if (Array.isArray(details) && details.length > 0) {
    return details.filter(Boolean).map((d) => ({
      name: d.name || d.firstName || "",
      age: d.age,
      type: d.ageGroup || d.type || "adult",
    }));
  }
  const parts = [];
  const counts = { adults: t.adults, children: t.children, infants: t.infants };
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

function travelerTypeLabel(type) {
  const map = { adult: "A", child: "C", infant: "I" };
  return map[type] || "T";
}

export default function TravelerManifest({ travelers, compact = false }) {
  const details = getTravelerDetails(travelers);
  if (details.length === 0) return null;

  const adults = details.filter((d) => d.type === "adult" || d.type === "Adult").length;
  const children = details.filter((d) => d.type === "child" || d.type === "Child").length;
  const infants = details.filter((d) => d.type === "infant" || d.type === "Infant").length;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Users size={11} />
        {adults > 0 && <span>{adults}A</span>}
        {children > 0 && <span>{children}C</span>}
        {infants > 0 && <span>{infants}I</span>}
        <span className="text-slate-400">({details.length} total)</span>
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <Users size={12} />
        <span>Passenger Manifest</span>
        <span className="text-slate-400 font-normal">({details.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {details.map((d, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-slate-600"
          >
            <span className="font-medium">
              {d.name || `Traveler ${i + 1}`}
            </span>
            <span className="text-slate-400">
              {d.age != null ? `(${d.age})` : travelerTypeLabel(d.type)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export { getTravelerDetails, normalizeTravelers };
