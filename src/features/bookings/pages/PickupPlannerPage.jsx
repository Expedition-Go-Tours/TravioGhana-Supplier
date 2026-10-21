import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  RefreshCw,
  Loader2,
  Search,
  CalendarDays,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { useTeamRole } from "@/hooks/useTeamRole";
import {
  fetchAllPickupPlanner,
  fetchPickupPlanner,
  reorderPickupStops,
  updateBookingPickup,
} from "../api";
import { getAuthToken } from "@/stores/authStore";
import PickupBookingCard from "../components/pickup/PickupBookingCard";
import EditPickupModal from "../components/pickup/EditPickupModal";
import ExportMenu from "../components/pickup/ExportMenu";
import SegmentedControl from "../components/pickup/SegmentedControl";
import { resolvePickupState } from "../lib/pickupState";

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

const STATE_OPTIONS = [
  { key: "all", label: "All" },
  { key: "deferred", label: "Awaiting" },
  { key: "incomplete", label: "Needs info" },
  { key: "confirmed", label: "Confirmed" },
];

const READ_ONLY_STATUSES = ["CANCELLED", "REFUNDED", "COMPLETED", "NO_SHOW"];
const REORDER_BLOCKED_STATUSES = ["CANCELLED", "REFUNDED"];

function toDateKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  // Travel dates are stored at UTC midnight. Reading the UTC calendar date keeps
  // the booking on the day the supplier sold, regardless of the browser zone.
  return dt.toISOString().slice(0, 10);
}

function localDateKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${month}-${day}`;
}

function addLocalDays(date, days) {
  // Calendar arithmetic, not 86,400,000ms arithmetic, so DST transitions do
  // not skip or repeat a day in the range.
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
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
  return date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
}

export default function PickupPlannerPage() {
  const { hasPermission } = useTeamRole();
  const canManage = hasPermission("bookings.manage");

  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("7d");
  const [status, setStatus] = useState("");
  const [pickupFilter, setPickupFilter] = useState("all");
  const [pickedUpOnly, setPickedUpOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [pickedBusy, setPickedBusy] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [dragId, setDragId] = useState(null);
  const draggingRef = useRef(null);
  const abortRef = useRef(null);

  const computeRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Inclusive ranges: "7 days" is today plus the next six, not eight days.
    const span = range === "today" ? 0 : range === "30d" ? 29 : 6;
    return {
      from: localDateKey(today),
      to: localDateKey(addLocalDays(today, span)),
    };
  }, [range]);

  const loadPlanner = useCallback(async () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const { from, to } = computeRange();
      const result = await fetchPickupPlanner({
        from,
        to,
        ...(status ? { status } : {}),
        ...(pickupFilter !== "all" ? { pickupState: pickupFilter } : {}),
        ...(pickedUpOnly ? { pickedUp: "true" } : {}),
        ...(searchQuery ? { q: searchQuery } : {}),
        page,
        limit: 50,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setBookings(result.bookings);
      setCounts(result.counts);
      setPagination(result.pagination);
      setLastLoadedAt(new Date());
    } catch (err) {
      if (controller.signal.aborted || err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
      if (err.code === "AUTH_REQUIRED") return;
      setError(err.response?.data?.message || err.message || "Failed to load pickups");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [computeRange, status, pickupFilter, pickedUpOnly, searchQuery, page]);

  useEffect(() => {
    Promise.resolve().then(loadPlanner);
    return () => abortRef.current?.abort();
  }, [loadPlanner]);

  // Server-side search, debounced. The old input filtered only the current
  // page, so a customer with a booking on page 2 looked "missing".
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const resetToFirstPage = () => setPage(1);

  const resetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setStatus("");
    setPickupFilter("all");
    setPickedUpOnly(false);
    setPage(1);
  };

  const { from, to } = computeRange();
  const dateRangeLabel = `${from} to ${to}`;

  const groupedBookings = useMemo(() => {
    const groups = {};
    bookings.forEach((b) => {
      const dateKey = toDateKey(b.travelDate);
      if (!dateKey) return;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(b);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [bookings]);

  const stateOptions = STATE_OPTIONS.map((o) => ({
    ...o,
    count: counts ? counts[o.key === "all" ? "all" : o.key] : o.key === "all" ? bookings.length : 0,
  }));

  const handleTogglePicked = async (booking) => {
    if (!canManage || READ_ONLY_STATUSES.includes(booking.status)) return;
    setPickedBusy(booking.id);
    try {
      await updateBookingPickup(booking.id, { pickedUp: !booking.pickedUpAt });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, pickedUpAt: booking.pickedUpAt ? null : new Date().toISOString() } : b
        )
      );
      loadPlanner();
    } catch {
      toast.error("Failed to update pickup");
    } finally {
      setPickedBusy(null);
    }
  };

  const fetchFullDay = useCallback(async (dateKey) => {
    const result = await fetchAllPickupPlanner({ from: dateKey, to: dateKey });
    return result.bookings;
  }, []);

  const persistDayOrder = useCallback(async (dateKey, nextOrder) => {
    await reorderPickupStops(dateKey, nextOrder);
  }, []);

  const handleDrop = async (dateKey, targetId) => {
    const sourceId = draggingRef.current;
    draggingRef.current = null;
    setDragId(null);
    if (!canManage || !sourceId || sourceId === targetId || reordering) return;
    if (REORDER_BLOCKED_STATUSES.includes(status)) {
      toast.error("Cancelled bookings cannot be reordered");
      return;
    }

    setReordering(true);
    try {
      // Reorder against the complete day, not the filtered/paginated rows.
      // A partial order used to reset hidden stops to 0..n-1 and corrupt the run.
      const dayRows = await fetchFullDay(dateKey);
      const ids = dayRows.map((b) => b.id);
      const fromIndex = ids.indexOf(sourceId);
      const toIndex = ids.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) {
        toast.error("That stop is no longer part of this day. Refresh and try again.");
        return;
      }
      const next = [...ids];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, sourceId);
      await persistDayOrder(dateKey, next);
      await loadPlanner();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save the pickup order");
      loadPlanner();
    } finally {
      setReordering(false);
    }
  };

  const handleMove = async (booking, direction) => {
    if (!canManage || reordering) return;
    if (REORDER_BLOCKED_STATUSES.includes(status)) {
      toast.error("Cancelled bookings cannot be reordered");
      return;
    }
    const dateKey = toDateKey(booking.travelDate);
    if (!dateKey) return;

    setReordering(true);
    try {
      const dayRows = await fetchFullDay(dateKey);
      const ids = dayRows.map((b) => b.id);
      const index = ids.indexOf(booking.id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= ids.length) return;
      [ids[index], ids[target]] = [ids[target], ids[index]];
      await persistDayOrder(dateKey, ids);
      await loadPlanner();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save the pickup order");
      loadPlanner();
    } finally {
      setReordering(false);
    }
  };

  const fetchAllForExport = useCallback(() => {
    const { from, to } = computeRange();
    return fetchAllPickupPlanner({
      from,
      to,
      ...(status ? { status } : {}),
      ...(pickupFilter !== "all" ? { pickupState: pickupFilter } : {}),
      ...(pickedUpOnly ? { pickedUp: "true" } : {}),
      ...(searchQuery ? { q: searchQuery } : {}),
    });
  }, [computeRange, status, pickupFilter, pickedUpOnly, searchQuery]);

  const totalPages = pagination?.totalPages || 1;
  const filtersActive = !!searchQuery || pickupFilter !== "all" || pickedUpOnly || !!status;
  // Up/down can be disabled at the true day boundary only when the whole day
  // is visible. With a search/filter/page, hidden stops may sit above/below.
  const fullDayView = !searchQuery && !status && pickupFilter === "all" && !pickedUpOnly && totalPages === 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Pickup Planner</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Confirm each booking&rsquo;s pickup point and time, then order the day&rsquo;s run.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            getBookings={fetchAllForExport}
            dateRange={dateRangeLabel}
            disabled={bookings.length === 0}
          />
          <button
            type="button"
            onClick={loadPlanner}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI strip (whole range, not just this page) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div data-testid="kpi-deferred">
          <StatCard
            icon={<Clock size={16} />}
            accent="cyan"
            label="Awaiting customer"
            value={counts?.deferred ?? 0}
            subtitle="Customer hasn't chosen yet"
            onClick={() => { setPickupFilter("deferred"); setPickedUpOnly(false); resetToFirstPage(); }}
            className={cn("cursor-pointer", pickupFilter === "deferred" && "ring-2 ring-sky-200")}
          />
        </div>
        <div data-testid="kpi-incomplete">
          <StatCard
            icon={<AlertTriangle size={16} />}
            accent="red"
            label="Needs info"
            value={counts?.incomplete ?? 0}
            subtitle="Missing time or location"
            onClick={() => { setPickupFilter("incomplete"); setPickedUpOnly(false); resetToFirstPage(); }}
            className={cn("cursor-pointer", pickupFilter === "incomplete" && "ring-2 ring-red-200")}
          />
        </div>
        <div data-testid="kpi-confirmed">
          <StatCard
            icon={<CheckCircle2 size={16} />}
            accent="emerald"
            label="Confirmed"
            value={counts?.confirmed ?? 0}
            subtitle="Ready for the run"
            onClick={() => { setPickupFilter("confirmed"); setPickedUpOnly(false); resetToFirstPage(); }}
            className={cn("cursor-pointer", pickupFilter === "confirmed" && "ring-2 ring-emerald-200")}
          />
        </div>
        <div data-testid="kpi-pickedup">
          <StatCard
            icon={<Check size={16} />}
            accent="blue"
            label="Picked up"
            value={counts?.pickedUp ?? 0}
            subtitle="Completed on the day"
            onClick={() => { setPickedUpOnly((v) => !v); resetToFirstPage(); }}
            className={cn("cursor-pointer", pickedUpOnly && "ring-2 ring-blue-200")}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              options={RANGE_OPTIONS}
              value={range}
              ariaLabel="Date range"
              onChange={(next) => { setRange(next); resetToFirstPage(); }}
            />
            <select
              value={status}
              aria-label="Booking status"
              onChange={(e) => { setStatus(e.target.value); resetToFirstPage(); }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors focus:border-[#044b3b] focus:outline-none focus:ring-2 focus:ring-[#044b3b]/15"
            >
              <option value="">All active statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="NO_SHOW">No-show</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                maxLength={100}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search customer, booking #, address…"
                aria-label="Search pickups"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-[#044b3b] focus:outline-none focus:ring-2 focus:ring-[#044b3b]/15"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {searchQuery && pagination && (
              <span className="text-[11px] text-slate-400">
                {pagination.totalCount} {pagination.totalCount === 1 ? "result" : "results"}
              </span>
            )}
            {pickedUpOnly && (
              <button
                type="button"
                onClick={() => { setPickedUpOnly(false); resetToFirstPage(); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/15 transition-colors hover:bg-blue-100"
              >
                <X size={12} /> Picked up only
              </button>
            )}
            <span className="ml-auto hidden text-xs text-slate-400 lg:block">{from} → {to}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">Pickup state</span>
          <div className="min-w-0">
            <SegmentedControl
              options={stateOptions}
              value={pickupFilter}
              ariaLabel="Pickup state filter"
              onChange={(next) => { setPickupFilter(next); resetToFirstPage(); }}
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            {lastLoadedAt && (
              <span className="text-[10px] text-slate-400">
                Updated {lastLoadedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            {reordering && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <Loader2 size={11} className="animate-spin" /> Saving order…
              </span>
            )}
            {!canManage && (
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                View only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
          <Loader2 size={26} className="animate-spin text-emerald-600" />
          <p className="text-sm">Loading pickups…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <button
            type="button"
            onClick={loadPlanner}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      ) : groupedBookings.length === 0 ? (
        <div>
          <EmptyState
            icon="bookings"
            title={filtersActive ? "No matching bookings" : "No pickups in this range"}
            description={
              filtersActive
                ? "Try adjusting your search or filters."
                : "Bookings with a pickup selection will appear here. Switch the date range above to see more."
            }
          />
          {filtersActive && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <X size={12} /> Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-7">
          {groupedBookings.map(([dateKey, dayBookings]) => {
            const needsAttention = dayBookings.filter((b) => resolvePickupState(b) !== "confirmed").length;
            const incomplete = dayBookings.filter((b) => resolvePickupState(b) === "incomplete").length;
            return (
              <div key={dateKey}>
                <div className="sticky top-0 z-10 -mx-1 mb-3 flex items-center gap-2 bg-slate-50/95 px-1 py-2 backdrop-blur">
                  <CalendarDays size={14} className="text-slate-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {formatDateHeader(dateKey)}
                  </h3>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    {dayBookings.length} {dayBookings.length === 1 ? "stop" : "stops"}
                  </span>
                  {needsAttention > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/15">
                      <span className="h-1 w-1 rounded-full bg-sky-500" />
                      {needsAttention} need attention
                    </span>
                  )}
                  {incomplete > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/15">
                      <span className="h-1 w-1 rounded-full bg-red-500" />
                      {incomplete} need info
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {dayBookings.map((booking, index) => {
                    const canEditBooking = canManage && !READ_ONLY_STATUSES.includes(booking.status);
                    return (
                      <PickupBookingCard
                        key={booking.id}
                        booking={booking}
                        index={index}
                        canManage={canEditBooking}
                        isFirst={fullDayView && index === 0}
                        isLast={fullDayView && index === dayBookings.length - 1}
                        onEdit={setEditing}
                        onTogglePicked={handleTogglePicked}
                        onMove={canEditBooking ? handleMove : undefined}
                        pickedBusy={pickedBusy === booking.id}
                        isDragging={dragId === booking.id}
                        dragHandlers={canEditBooking ? {
                          draggable: true,
                          onDragStart: (e) => {
                            draggingRef.current = booking.id;
                            setDragId(booking.id);
                            if (e.dataTransfer) {
                              e.dataTransfer.setData("text/plain", booking.id);
                              e.dataTransfer.effectAllowed = "move";
                            }
                          },
                          onDragOver: (e) => {
                            e.preventDefault();
                            if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                          },
                          onDrop: (e) => {
                            e.preventDefault();
                            handleDrop(dateKey, booking.id);
                          },
                          onDragEnd: () => {
                            draggingRef.current = null;
                            setDragId(null);
                          },
                        } : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Edit modal */}
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
