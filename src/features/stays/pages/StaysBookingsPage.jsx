import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  X,
  RefreshCw,
  Calendar,
  Loader2,
  ShoppingCart,
  Clock,
  CheckCircle2,
  BadgeCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import DatePicker from "@/components/forms/DatePicker";
import StaysSurface from "../components/StaysSurface";
import StaysBookingCard from "../components/StaysBookingCard";
import { listStaysBookings, updateBookingStatus, STAYS_KEYS } from "../api";
import { BOOKING_STATUSES } from "../utils/status";
import { formatMoney } from "../utils/money";

/**
 * Bookings — the Stays mirror of the Experiences bookings page: the same
 * header + Refresh, six stat tiles, the quick-filter / search / date-filter
 * toolbar, expandable reservation cards and the pagination footer, populated
 * with the property workspace's own reservations.
 *
 * Status changes happen through the cards' actions (no editor modal): every
 * transition writes through `updateBookingStatus` and refreshes the bookings
 * and dashboard queries.
 */
export default function StaysBookingsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All");
  const [localSearch, setLocalSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [stayFrom, setStayFrom] = useState("");
  const [stayTo, setStayTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [updatingId, setUpdatingId] = useState(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: STAYS_KEYS.bookings(),
    queryFn: () => listStaysBookings(),
    staleTime: 20_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stays", "bookings"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
      toast.success("Reservation updated");
    },
    onError: () => toast.error("Could not update the reservation"),
    onSettled: () => setUpdatingId(null),
  });

  const handleStatusUpdate = (id, status) => {
    setUpdatingId(id);
    updateMutation.mutate({ id, status });
  };

  const hasFilters = Boolean(localSearch || stayFrom || stayTo);

  const clearFilters = () => {
    setLocalSearch("");
    setStayFrom("");
    setStayTo("");
    setPage(0);
  };

  const filteredData = useMemo(() => {
    let data = bookings.filter((booking) => filter === "All" || booking.status === filter);
    const query = localSearch.toLowerCase().trim();
    if (query) {
      data = data.filter((booking) =>
        `${booking.guest} ${booking.id} ${booking.propertyName || ""} ${booking.room}`
          .toLowerCase()
          .includes(query),
      );
    }
    if (stayFrom) data = data.filter((booking) => booking.from >= stayFrom);
    if (stayTo) data = data.filter((booking) => booking.to <= stayTo);
    return data;
  }, [bookings, filter, localSearch, stayFrom, stayTo]);

  const stats = useMemo(
    () => ({
      total: bookings.length,
      newCount: bookings.filter((booking) => booking.status === "New").length,
      confirmed: bookings.filter((booking) => booking.status === "Confirmed").length,
      checkedIn: bookings.filter((booking) => booking.status === "Checked in").length,
      cancelled: bookings.filter(
        (booking) => booking.status === "Cancelled" || booking.status === "No-show",
      ).length,
      revenue: bookings
        .filter((booking) => booking.status !== "Cancelled" && booking.status !== "No-show")
        .reduce((sum, booking) => sum + booking.amount, 0),
    }),
    [bookings],
  );

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filteredData.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <StaysSurface className="space-y-5">
      {/* ====== HEADER ====== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage and track all guest reservations
          </p>
        </div>
        <button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["stays", "bookings"] })
          }
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-100/60 rounded-xl text-sm font-medium text-slate-600 hover:bg-emerald-50/40 hover:text-slate-800 transition-all disabled:opacity-50 shadow-sm"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* ====== STATS ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {[
          {
            label: "Total Bookings",
            value: stats.total,
            icon: ShoppingCart,
            color: "text-slate-900",
            bar: "bg-slate-200",
          },
          {
            label: "New",
            value: stats.newCount,
            icon: Clock,
            color: "text-amber-600",
            bar: "bg-amber-400",
          },
          {
            label: "Confirmed",
            value: stats.confirmed,
            icon: CheckCircle2,
            color: "text-blue-600",
            bar: "bg-blue-400",
          },
          {
            label: "Checked in",
            value: stats.checkedIn,
            icon: BadgeCheck,
            color: "text-green-700",
            bar: "bg-green-500",
          },
          {
            label: "Cancellations",
            value: stats.cancelled,
            icon: AlertTriangle,
            color: "text-red-600",
            bar: "bg-red-400",
          },
          {
            label: "Revenue",
            value: formatMoney(stats.revenue),
            icon: TrendingUp,
            color: "text-emerald-700",
            bar: "bg-emerald-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-emerald-100/60 p-3 sm:p-4 lg:p-2 xl:p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-6 lg:h-6 xl:w-9 xl:h-9 rounded-lg bg-emerald-50/40 border border-emerald-100/60 flex items-center justify-center shrink-0">
                <stat.icon size={14} className={`${stat.color} lg:w-3 lg:h-3`} />
              </div>
              <span
                className={`text-base sm:text-lg lg:text-xs xl:text-sm 2xl:text-lg font-bold ${stat.color} text-right truncate min-w-0`}
              >
                {stat.value}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500">{stat.label}</p>
            <div className={`mt-2 h-0.5 w-full rounded-full ${stat.bar} opacity-30`} />
          </div>
        ))}
      </div>

      {/* ====== TOOLBAR ====== */}
      <div className="bg-white rounded-xl border border-emerald-100/60 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 pb-2 overflow-x-auto scrollbar-none">
          {["All", ...BOOKING_STATUSES].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? "bg-[#044b3b] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-emerald-50/40"
              }`}
            >
              {status === "All" ? "All bookings" : status}
            </button>
          ))}
        </div>

        <div className="px-4 pb-3 pt-1 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Search guest, reference or property..."
              value={localSearch}
              onChange={(event) => {
                setLocalSearch(event.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-2 bg-emerald-50/40 border border-emerald-100/60 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={() => setShowFilters((current) => !current)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              showFilters || hasFilters
                ? "border-[#044b3b] bg-emerald-50 text-[#044b3b]"
                : "border-emerald-100/60 bg-white text-slate-500 hover:bg-emerald-50/40"
            }`}
          >
            <Calendar size={13} /> Filters{" "}
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#044b3b]" />}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="px-4 pb-4 border-t border-emerald-100/40 pt-3 flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
              <Calendar size={12} />
              <span>Stay dates</span>
              <DatePicker
                value={stayFrom}
                onChange={(value) => {
                  setStayFrom(value);
                  setPage(0);
                }}
                placeholder="From"
                size="sm"
                className="w-28"
                maxDate={stayTo || undefined}
              />
              <span className="text-slate-300">–</span>
              <DatePicker
                value={stayTo}
                onChange={(value) => {
                  setStayTo(value);
                  setPage(0);
                }}
                placeholder="To"
                size="sm"
                className="w-28"
                minDate={stayFrom || undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* ====== BOOKINGS ====== */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="bg-white rounded-xl border border-emerald-100/60 p-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-emerald-100/40 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-emerald-100/40 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-emerald-100/40 rounded animate-pulse" />
                  <div className="h-2 w-20 bg-emerald-100/40 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-emerald-100/40 rounded-full animate-pulse" />
                <div className="h-4 w-16 bg-emerald-100/40 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-xl border border-emerald-100/60">
          <div className="w-14 h-14 rounded-full bg-emerald-50/40 flex items-center justify-center mb-4">
            <ShoppingCart size={24} className="text-slate-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No bookings yet</p>
          <p className="text-xs text-slate-500 mb-4">
            Reservations will appear here once guests book your properties
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-[#044b3b] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {totalItems} booking{totalItems !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {pageRows.map((booking) => (
              <StaysBookingCard
                key={booking.id}
                booking={booking}
                isUpdating={updatingId === booking.id}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        </>
      )}

      {/* ====== PAGINATION ====== */}
      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between pt-4 border-t border-emerald-100/60">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              className="px-2 py-1 border border-emerald-100/60 rounded-lg text-xs text-slate-700 bg-white focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>of {totalItems}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="px-2.5 py-1.5 border border-emerald-100/60 rounded-lg text-xs font-medium text-slate-600 hover:bg-emerald-50/40 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
              const start = Math.max(0, Math.min(safePage - 2, totalPages - 5));
              const pageNumber = start + index;
              if (pageNumber >= totalPages) return null;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    safePage === pageNumber
                      ? "bg-[#044b3b] text-white shadow-sm"
                      : "text-slate-600 hover:bg-emerald-50/40 border border-emerald-100/60"
                  }`}
                >
                  {pageNumber + 1}
                </button>
              );
            })}
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
              className="px-2.5 py-1.5 border border-emerald-100/60 rounded-lg text-xs font-medium text-slate-600 hover:bg-emerald-50/40 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </StaysSurface>
  );
}
