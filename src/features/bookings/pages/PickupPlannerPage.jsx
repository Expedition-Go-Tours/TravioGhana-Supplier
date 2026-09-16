import { useState, useCallback, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Loader2,
  Search,
  CalendarDays,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import { fetchPickupPlanner } from "../api";
import { getAuthToken } from "@/stores/authStore";
import PickupBookingCard from "../components/pickup/PickupBookingCard";
import EditPickupModal from "../components/pickup/EditPickupModal";
import ExportMenu from "../components/pickup/ExportMenu";
import { pickupLabel, isPickupIncomplete } from "../lib/pickupHelpers";

const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Next 7 days" },
  { key: "30d", label: "Next 30 days" },
];

const PICKUP_FILTERS = [
  { key: "all", label: "All" },
  { key: "deferred", label: "Awaiting customer" },
  { key: "incomplete", label: "Incomplete" },
  { key: "confirmed", label: "Confirmed" },
];

/** Server-computed pickup state, falling back to client inference. */
function pickupStateOf(booking) {
  if (booking.pickupStatus) return booking.pickupStatus;
  if (booking.pickupDeferred) return "deferred";
  return isPickupIncomplete(booking.pickup) ? "incomplete" : "confirmed";
}

function toDateKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function formatDateHeader(dateKey) {
  if (!dateKey) return "Unknown date";
  const date = new Date(dateKey + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sortBookingsByPriority(bookings) {
  return [...bookings].sort((a, b) => {
    const aIncomplete = isPickupIncomplete(a.pickup) ? 0 : 1;
    const bIncomplete = isPickupIncomplete(b.pickup) ? 0 : 1;
    if (aIncomplete !== bIncomplete) return aIncomplete - bIncomplete;
    return new Date(a.travelDate) - new Date(b.travelDate);
  });
}

export default function PickupPlannerPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("7d");
  const [status, setStatus] = useState("");
  const [pickupFilter, setPickupFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const computeRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (range === "today")
      return { from: toDateKey(today), to: toDateKey(today) };
    if (range === "30d")
      return {
        from: toDateKey(today),
        to: toDateKey(new Date(today.getTime() + 30 * 86400000)),
      };
    return {
      from: toDateKey(today),
      to: toDateKey(new Date(today.getTime() + 7 * 86400000)),
    };
  }, [range]);

  const loadPlanner = useCallback(async () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { from, to } = computeRange();
      const result = await fetchPickupPlanner({
        from,
        to,
        ...(status ? { status } : {}),
        page,
        limit: 50,
      });
      setBookings(result.bookings);
      setPagination(result.pagination);
    } catch (err) {
      if (err.code === "AUTH_REQUIRED") return;
      setError(err.response?.data?.message || err.message || "Failed to load pickups");
    } finally {
      setLoading(false);
    }
  }, [computeRange, status, page]);

  // Changing the range or status resets back to page 1 (event-handler driven —
  // not an effect, so the linter stays happy and the reset is deterministic).
  const handleRangeChange = useCallback((next) => {
    setRange(next);
    setPage(1);
  }, []);
  const handleStatusChange = useCallback((e) => {
    setStatus(e.target.value);
    setPage(1);
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadPlanner());
  }, [loadPlanner]);

  const { from, to } = computeRange();
  const dateRangeLabel = `${from} to ${to}`;

  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.customerName?.toLowerCase().includes(q) ||
          b.tourName?.toLowerCase().includes(q) ||
          b.bookingNumber?.toLowerCase().includes(q) ||
          pickupLabel(b.pickup)?.toLowerCase().includes(q)
      );
    }
    if (pickupFilter !== "all") {
      filtered = filtered.filter((b) => pickupStateOf(b) === pickupFilter);
    } else if (showIncompleteOnly) {
      filtered = filtered.filter((b) =>
        b.isIncomplete != null ? b.isIncomplete : isPickupIncomplete(b.pickup)
      );
    }
    return sortBookingsByPriority(filtered);
  }, [bookings, searchQuery, pickupFilter, showIncompleteOnly]);

  const groupedBookings = useMemo(() => {
    const groups = {};
    filteredBookings.forEach((b) => {
      const dateKey = toDateKey(b.travelDate);
      if (!dateKey) return;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(b);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredBookings]);

  const incompleteCount = useMemo(
    () =>
      bookings.filter((b) => (b.isIncomplete != null ? b.isIncomplete : isPickupIncomplete(b.pickup)))
        .length,
    [bookings]
  );

  const stateCounts = useMemo(() => {
    const counts = { deferred: 0, incomplete: 0, confirmed: 0 };
    for (const b of bookings) {
      const s = pickupStateOf(b);
      if (s === "deferred") counts.deferred += 1;
      else if (s === "confirmed") counts.confirmed += 1;
      else counts.incomplete += 1;
    }
    return counts;
  }, [bookings]);

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pickup Planner</h1>
          <p className="text-sm text-slate-500 mt-1">
            Coordinate pickup details for every booking that includes pickup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu bookings={filteredBookings} dateRange={dateRangeLabel} />
          <button
            type="button"
            onClick={loadPlanner}
            className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-200/60 rounded-xl text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Incomplete Alert */}
      {incompleteCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">{incompleteCount}</span> booking
            {incompleteCount !== 1 ? "s" : ""} missing pickup details.{" "}
            <button
              type="button"
              onClick={() => setShowIncompleteOnly(true)}
              className="underline font-semibold hover:text-amber-900 transition-colors"
            >
              Show incomplete only
            </button>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-emerald-50/60 border border-emerald-100/60 rounded-xl">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => handleRangeChange(preset.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all",
                range === preset.key
                  ? "bg-[#044b3b] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-emerald-50/40"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <select
          value={status}
          onChange={handleStatusChange}
          className="h-10 rounded-xl border border-emerald-100/60 bg-emerald-50/30 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] focus:bg-white transition-all"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="NO_SHOW">No-show</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookings..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-emerald-100/60 bg-emerald-50/30 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] focus:bg-white transition-all"
          />
        </div>

        {showIncompleteOnly && (
          <button
            type="button"
            onClick={() => setShowIncompleteOnly(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
          >
            <X size={12} /> Clear filter
          </button>
        )}

        {/* Pickup state filter — deferred / incomplete / confirmed */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PICKUP_FILTERS.map((f) => {
            const count = f.key === "all" ? bookings.length : stateCounts[f.key] || 0;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setPickupFilter(f.key);
                  if (f.key !== "all") setShowIncompleteOnly(false);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  pickupFilter === f.key
                    ? "bg-[#044b3b] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    pickupFilter === f.key ? "bg-white/20 text-white" : "bg-white text-slate-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <span className="text-xs text-slate-400 ml-auto hidden sm:block">
          {from} → {to}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
          <p className="text-sm">Loading pickups...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      ) : groupedBookings.length === 0 ? (
        <EmptyState
          icon="bookings"
          title={
            searchQuery || showIncompleteOnly
              ? "No matching bookings"
              : "No pickups in this range"
          }
          description={
            searchQuery || showIncompleteOnly
              ? "Try adjusting your search or filters."
              : "Bookings with a pickup selection will appear here. Switch the date range above to see more."
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedBookings.map(([dateKey, dayBookings]) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="sticky top-0 z-10 bg-[#f8fafc] py-2 px-1 mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {formatDateHeader(dateKey)}
                  </h3>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {dayBookings.length} booking
                    {dayBookings.length !== 1 ? "s" : ""}
                  </span>
                  {dayBookings.some((b) =>
                    b.isIncomplete != null ? b.isIncomplete : isPickupIncomplete(b.pickup)
                  ) && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      {dayBookings.filter((b) =>
                        b.isIncomplete != null ? b.isIncomplete : isPickupIncomplete(b.pickup)
                      ).length}{" "}
                      incomplete
                    </span>
                  )}
                </div>
              </div>

              {/* Booking Cards */}
              <div className="space-y-3">
                {dayBookings.map((booking) => (
                  <PickupBookingCard
                    key={booking.id}
                    booking={booking}
                    onEdit={setEditing}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <EditPickupModal
          booking={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadPlanner();
          }}
        />
      )}
    </div>
  );
}
