import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  X,
  RefreshCw,
  Download,
  Calendar,
  CalendarX2,
  Loader2,
  ShoppingCart,
  Clock,
  CheckCircle2,
  BadgeCheck,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { useTeamRole } from "@/hooks/useTeamRole";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import DatePicker from "@/components/forms/DatePicker";
import {
  fetchSupplierBookings,
  updateBookingStatus,
  cancelBookingStructured,
  withdrawCancellationRequest,
  exportSupplierBookingsCsv,
} from "../api";
import { getAuthToken } from "@/stores/authStore";
import BookingCard from "../components/BookingCard";
import CancelBookingModal from "../components/CancelBookingModal";
import BookingDetailDrawer from "../components/BookingDetailDrawer";
import BulkCancelWizard from "../components/BulkCancelWizard";
import CancellationRequestsPanel from "../components/CancellationRequestsPanel";
import CreateBookingDrawer from "../components/CreateBookingDrawer";
import { listMyProducts } from "@/features/products/api";

const QUICK_FILTERS = [
  { key: "ALL", label: "All bookings" },
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default function BookingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [bookingSummary, setBookingSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [showBulkCancel, setShowBulkCancel] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState("bookings"); // bookings | requests
  // Supplier-created bookings: the wizard owns its own state; these two hold
  // the drawer and the tour catalogue it picks from (fetched on open).
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [createTours, setCreateTours] = useState([]);
  const { hasPermission } = useTeamRole();
  const [highlightedBookingId, setHighlightedBookingId] = useState(
    searchParams.get("bookingId") || null
  );
  // The detail panel is URL-driven so a supplier can share or reload a link to
  // one booking, and so Back closes the panel before leaving the page.
  const detailBookingId = searchParams.get("detail") || null;

  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(
    searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE),
    10
  );
  const activeTab = searchParams.get("tab") || "ALL";
  const searchTerm = searchParams.get("search") || "";
  // Exact customer scoping (from the header search's customer rows). Unlike
  // `search`, this is unambiguous — two guests can share a name.
  const customerIdParam = searchParams.get("customerId") || "";
  const purchaseDateFrom = searchParams.get("purchaseFrom") || "";
  const purchaseDateTo = searchParams.get("purchaseTo") || "";
  const activityDateFrom = searchParams.get("activityFrom") || "";
  const activityDateTo = searchParams.get("activityTo") || "";

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [locPurchaseFrom, setLocPurchaseFrom] = useState(purchaseDateFrom);
  const [locPurchaseTo, setLocPurchaseTo] = useState(purchaseDateTo);
  const [locActivityFrom, setLocActivityFrom] = useState(activityDateFrom);
  const [locActivityTo, setLocActivityTo] = useState(activityDateTo);

  const apiStatus = activeTab !== "ALL" ? activeTab : undefined;

  const loadBookings = useCallback(async ({ silent = false } = {}) => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await fetchSupplierBookings({
        page: page + 1,
        limit: pageSize,
        ...(apiStatus ? { status: apiStatus } : {}),
        ...(customerIdParam ? { customerId: customerIdParam } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(purchaseDateFrom ? { purchaseFrom: purchaseDateFrom } : {}),
        ...(purchaseDateTo ? { purchaseTo: purchaseDateTo } : {}),
        ...(activityDateFrom ? { activityFrom: activityDateFrom } : {}),
        ...(activityDateTo ? { activityTo: activityDateTo } : {}),
      });
      setBookings(result.bookings);
      setPagination(result.pagination);
      setBookingSummary(result.summary);
    } catch (err) {
      if (err.code === "AUTH_REQUIRED") return;
      if (!silent) {
        setError(
          err.response?.data?.message || err.message || "Failed to load bookings"
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [
    page,
    pageSize,
    apiStatus,
    customerIdParam,
    searchTerm,
    purchaseDateFrom,
    purchaseDateTo,
    activityDateFrom,
    activityDateTo,
  ]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadBookings();
    });
    return () => {
      cancelled = true;
    };
  }, [loadBookings]);

  // Auto-refresh every 30 seconds (silent, no loading spinner)
  useEffect(() => {
    const id = setInterval(() => loadBookings({ silent: true }), 30_000);
    return () => clearInterval(id);
  }, [loadBookings]);

  useEffect(() => {
    if (highlightedBookingId && bookings.length > 0) {
      const match = bookings.find((b) => b.id === highlightedBookingId);
      if (match) {
        setTimeout(() => {
          const el = document.getElementById(
            `booking-${highlightedBookingId}`
          );
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        const timer = setTimeout(() => {
          setHighlightedBookingId(null);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("bookingId");
            return next;
          }, { replace: true });
        }, 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightedBookingId, bookings, setSearchParams]);

  const updateFilters = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined)
          params.delete(key);
        else if (Array.isArray(value)) {
          params.delete(key);
          value.forEach((v) => params.append(key, v));
        } else params.set(key, String(value));
      });
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const clearFilters = () => {
    setLocalSearch("");
    setLocPurchaseFrom("");
    setLocPurchaseTo("");
    setLocActivityFrom("");
    setLocActivityTo("");
    setSearchParams({});
  };


  // Search is a server-side filter. Debouncing keeps a fast typist from
  // firing one request per keystroke, and pushing it into the URL makes the
  // result shareable and reload-safe (the previous implementation filtered
  // only the rows already on the current page, so page 2 was invisible).
  useEffect(() => {
    const trimmed = localSearch.trim();
    if (trimmed === searchTerm) return undefined;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (trimmed) params.set("search", trimmed);
      else params.delete("search");
      params.set("page", "0");
      setSearchParams(params, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, searchTerm, searchParams, setSearchParams]);

  // Back/forward and "clear filters" update the URL, so the input must follow.
  // Adjusted during render (React's recommended "derive from props" pattern)
  // rather than in an effect, which would cascade a second render.
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  if (prevSearchTerm !== searchTerm) {
    setPrevSearchTerm(searchTerm);
    setLocalSearch(searchTerm);
  }

  const setDateFilter = (key, value, setLocal) => {
    setLocal(value);
    updateFilters({ [key]: value || undefined, page: 0 });
  };

  const openDetail = useCallback(
    (booking) => updateFilters({ detail: booking.id }),
    [updateFilters]
  );
  const closeDetail = useCallback(
    () => updateFilters({ detail: undefined }),
    [updateFilters]
  );

  const handleTabClick = (tabKey) => updateFilters({ tab: tabKey, page: 0 });

  const handleStatusUpdate = useCallback(
    async (bookingId, status) => {
      if (status === "CANCELLED") {
        const booking = bookings.find((b) => b.id === bookingId);
        setCancelBooking(booking || { id: bookingId, tour: {} });
        return;
      }
      setUpdatingId(bookingId);
      try {
        await updateBookingStatus(bookingId, { status });
        toast.success("Booking status updated");
        await loadBookings();
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to update booking status"
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [bookings, loadBookings]
  );

  /**
   * Structured cancellation (GYG-style wizard). Resolves to
   * { booking, cancellation } on success so the modal can render its summary,
   * or null on failure (the server's 400 { message } is surfaced as a toast).
   */
  const handleConfirmCancel = useCallback(
    async (payload) => {
      if (!cancelBooking) return null;
      setUpdatingId(cancelBooking.id);
      try {
        const response = await cancelBookingStructured(cancelBooking.id, payload);
        const data = response.data?.data || null;
        if (data?.request) {
          toast.success("Cancellation request submitted for review");
        } else {
          toast.success("Booking cancelled");
        }
        await loadBookings({ silent: true });
        return data;
      } catch (err) {
        if (err.code !== "AUTH_REQUIRED") {
          toast.error(
            err.response?.data?.message || "Failed to cancel booking"
          );
        }
        return null;
      } finally {
        setUpdatingId(null);
      }
    },
    [cancelBooking, loadBookings]
  );

  /**
   * Withdraw a pending cancellation request straight from a booking row. 404
   * means an admin already decided it, so just refresh and explain.
   */
  const handleWithdrawRequest = useCallback(
    async (requestId) => {
      try {
        const response = await withdrawCancellationRequest(requestId);
        const reverted = response.data?.data?.revertedDates;
        toast.success(
          reverted
            ? `Request withdrawn — ${reverted} date${reverted === 1 ? "" : "s"} re-opened`
            : "Cancellation request withdrawn"
        );
        await loadBookings({ silent: true });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error(
            "This request was already decided and can no longer be withdrawn."
          );
          await loadBookings({ silent: true });
          return;
        }
        toast.error(
          err.response?.data?.message || "Failed to withdraw the request"
        );
        throw err;
      }
    },
    [loadBookings]
  );

  /**
   * Export the CURRENT filters as CSV. The server generates the file from the
   * same query the list uses, so it can never contain a different set of
   * bookings than the screen the supplier just filtered.
   */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { blob, filename } = await exportSupplierBookingsCsv({
        ...(apiStatus ? { status: apiStatus } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(purchaseDateFrom ? { purchaseFrom: purchaseDateFrom } : {}),
        ...(purchaseDateTo ? { purchaseTo: purchaseDateTo } : {}),
        ...(activityDateFrom ? { activityFrom: activityDateFrom } : {}),
        ...(activityDateTo ? { activityTo: activityDateTo } : {}),
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Bookings exported");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to export bookings");
    } finally {
      setExporting(false);
    }
  }, [
    apiStatus,
    searchTerm,
    purchaseDateFrom,
    purchaseDateTo,
    activityDateFrom,
    activityDateTo,
  ]);

  const handleMessageCustomer = useCallback(
    (booking) => {
      const params = new URLSearchParams();
      if (booking?.customerId) params.set("customerId", booking.customerId);
      if (booking?.id) params.set("bookingId", booking.id);
      if (booking?.bookingNumber) params.set("bookingNumber", booking.bookingNumber);
      if (booking?.tourName) params.set("tourTitle", booking.tourName);
      navigate(`/chat?${params.toString()}`);
    },
    [navigate]
  );

  // Search and date filters are applied by the API (they have to be: a
  // supplier can have thousands of bookings and the browser only holds one
  // page). Keep a copy for rendering so we never mutate the state array.
  const filteredData = useMemo(
    () =>
      [...bookings].sort(
        (a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)
      ),
    [bookings]
  );

  const stats = useMemo(() => {
    const summaryCounts = bookingSummary?.counts || {};
    return {
      total:
        bookingSummary?.totalBookings ??
        pagination?.totalCount ??
        filteredData.length,
      pending:
        summaryCounts.PENDING ??
        filteredData.filter((b) => b.status === "PENDING").length,
      confirmed:
        summaryCounts.CONFIRMED ??
        filteredData.filter((b) => b.status === "CONFIRMED").length,
      completed:
        summaryCounts.COMPLETED ??
        filteredData.filter((b) => b.status === "COMPLETED").length,
      cancelled:
        summaryCounts.CANCELLED ??
        filteredData.filter((b) => b.status === "CANCELLED").length,
      revenue:
        bookingSummary?.totalRevenue ??
        filteredData.reduce((sum, b) => sum + (Number(b.total) || 0), 0),
    };
  }, [filteredData, bookingSummary, pagination]);

  const hasFilters = Boolean(
    customerIdParam ||
    searchTerm ||
    purchaseDateFrom ||
    purchaseDateTo ||
    activityDateFrom ||
    activityDateTo
  );
  const totalItems = pagination?.totalCount ?? filteredData.length;
  const totalPages =
    pagination?.totalPages ?? (Math.ceil(filteredData.length / pageSize) || 1);

  return (
    <div className="space-y-5">
      {/* ====== HEADER ====== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage and track all customer reservations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-white border border-emerald-100/60 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={() => setView("bookings")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === "bookings"
                  ? "bg-[#044b3b] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-emerald-50/40"
              }`}
            >
              <ShoppingCart size={13} /> Bookings
            </button>
            <button
              type="button"
              onClick={() => setView("requests")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === "requests"
                  ? "bg-[#044b3b] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-emerald-50/40"
              }`}
            >
              <ClipboardList size={13} /> Cancellation requests
            </button>
          </div>
          {view === "bookings" && (
            <>
              {hasPermission("bookings.manage") && (
                <button
                  type="button"
                  onClick={async () => {
                    setShowCreateBooking(true);
                    if (createTours.length === 0) {
                      try {
                        const res = await listMyProducts({ limit: 200 });
                        const tours = res.data?.data?.tours || [];
                        // Only tours a booking can actually be made on.
                        setCreateTours(
                          tours.filter(
                            (t) => !["DRAFT", "ARCHIVED", "REJECTED"].includes(t.status)
                          )
                        );
                      } catch {
                        setCreateTours([]);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#044b3b] text-white rounded-xl text-sm font-semibold hover:bg-[#033629] transition-colors shadow-sm"
                >
                  <Calendar size={14} /> Create booking
                </button>
              )}
              <button
                onClick={loadBookings}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-100/60 rounded-xl text-sm font-medium text-slate-600 hover:bg-emerald-50/40 hover:text-slate-800 transition-all disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {view === "requests" ? (
        <CancellationRequestsPanel
          onWithdrawn={() => loadBookings({ silent: true })}
        />
      ) : (
        <>
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
            label: "Pending",
            value: stats.pending,
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
            label: "Completed",
            value: stats.completed,
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
            value: formatCurrency(stats.revenue),
            icon: TrendingUp,
            color: "text-[#044b3b]",
            bar: "bg-[#044b3b]",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-emerald-100/60 p-3 sm:p-4 lg:p-2 xl:p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-6 lg:h-6 xl:w-9 xl:h-9 rounded-lg bg-emerald-50/40 border border-emerald-100/60 flex items-center justify-center shrink-0">
                {/* Six columns at exactly 1024px (sidebar expanded) leave ~104px
                    per card. Measured: the value needs 62px at 14px and 80px at
                    18px, beside a 36px icon — so the font steps back up only
                    where the column is genuinely wider. Revenue must never
                    ellipsis at lg+, hence the 2xl step rather than xl. */}
                <s.icon size={14} className={`${s.color} lg:w-3 lg:h-3`} />
              </div>
              <span
                className={`text-base sm:text-lg lg:text-xs xl:text-sm 2xl:text-lg font-bold ${s.color} text-right truncate min-w-0`}
              >
                {s.value}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500">
              {s.label}
            </p>
            <div
              className={`mt-2 h-0.5 w-full rounded-full ${s.bar} opacity-30`}
            />
          </div>
        ))}
      </div>

      {/* ====== TOOLBAR ====== */}
      <div className="bg-white rounded-xl border border-emerald-100/60 shadow-sm">
        {/* Quick filters */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-2 overflow-x-auto scrollbar-none">
          {QUICK_FILTERS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-[#044b3b] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-emerald-50/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + advanced filters */}
        <div className="px-4 pb-3 pt-1 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              aria-label="Search bookings by customer, reference or tour"
              placeholder="Search name, reference or tour..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-emerald-50/40 border border-emerald-100/60 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20 focus:border-[#044b3b] focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              showFilters || hasFilters
                ? "border-[#044b3b] bg-emerald-50 text-[#044b3b]"
                : "border-emerald-100/60 bg-white text-slate-500 hover:bg-emerald-50/40"
            }`}
          >
            <Calendar size={13} /> Filters{" "}
            {hasFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#044b3b]" />
            )}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-100/60 bg-white text-xs font-medium text-slate-600 hover:bg-emerald-50/40 hover:text-slate-800 transition-all disabled:opacity-50 ml-auto"
          >
            {exporting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Export CSV
          </button>

          <button
            onClick={() => setShowBulkCancel(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200/70 bg-white text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
          >
            <CalendarX2 size={13} /> Cancel multiple bookings
          </button>
        </div>

        {/* Expandable date filters */}
        {showFilters && (
          <div className="px-4 pb-4 border-t border-emerald-100/40 pt-3 flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
              <ShoppingCart size={12} />
              <span>Purchased</span>
              <DatePicker
                value={locPurchaseFrom}
                onChange={(value) => setDateFilter("purchaseFrom", value, setLocPurchaseFrom)}
                placeholder="From"
                size="sm"
                className="w-28"
                maxDate={locPurchaseTo || undefined}
              />
              <span className="text-slate-300">–</span>
              <DatePicker
                value={locPurchaseTo}
                onChange={(value) => setDateFilter("purchaseTo", value, setLocPurchaseTo)}
                placeholder="To"
                size="sm"
                className="w-28"
                minDate={locPurchaseFrom || undefined}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
              <Calendar size={12} />
              <span>Activity</span>
              <DatePicker
                value={locActivityFrom}
                onChange={(value) => setDateFilter("activityFrom", value, setLocActivityFrom)}
                placeholder="From"
                size="sm"
                className="w-28"
                maxDate={locActivityTo || undefined}
              />
              <span className="text-slate-300">–</span>
              <DatePicker
                value={locActivityTo}
                onChange={(value) => setDateFilter("activityTo", value, setLocActivityTo)}
                placeholder="To"
                size="sm"
                className="w-28"
                minDate={locActivityFrom || undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* ====== ERROR ====== */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ====== BOOKINGS ====== */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
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
                <div className="h-5 w-5 bg-emerald-100/40 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-xl border border-emerald-100/60">
          <div className="w-14 h-14 rounded-full bg-emerald-50/40 flex items-center justify-center mb-4">
            <ShoppingCart
              size={24}
              className="text-slate-300"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            {hasFilters ? "No bookings match your filters" : "No bookings yet"}
          </p>
          <p className="text-xs text-slate-500 mb-4">
            {hasFilters
              ? "Try a different search term or widen the dates. Your other bookings are still here."
              : "Bookings will appear here once customers make reservations"}
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
            {hasFilters ? " match your filters" : ""}
          </p>
          <div className="space-y-3">
            {filteredData.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onStatusUpdate={handleStatusUpdate}
                isUpdating={updatingId === booking.id}
                isHighlighted={highlightedBookingId === booking.id}
                onMessageCustomer={handleMessageCustomer}
                onWithdrawRequest={handleWithdrawRequest}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
        </>
      )}

      {/* ====== PAGINATION ====== */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between pt-4 border-t border-emerald-100/60">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) =>
                updateFilters({ pageSize: Number(e.target.value), page: 0 })
              }
              className="px-2 py-1 border border-emerald-100/60 rounded-lg text-xs text-slate-700 bg-white focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>of {totalItems}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => updateFilters({ page: page - 1 })}
              className="px-2.5 py-1.5 border border-emerald-100/60 rounded-lg text-xs font-medium text-slate-600 hover:bg-emerald-50/40 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5));
              const p = start + i;
              if (p >= totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => updateFilters({ page: p })}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    page === p
                      ? "bg-[#044b3b] text-white shadow-sm"
                      : "text-slate-600 hover:bg-emerald-50/40 border border-emerald-100/60"
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => updateFilters({ page: page + 1 })}
              className="px-2.5 py-1.5 border border-emerald-100/60 rounded-lg text-xs font-medium text-slate-600 hover:bg-emerald-50/40 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
        </>
      )}
      {detailBookingId && (
        <BookingDetailDrawer
          bookingId={detailBookingId}
          onClose={closeDetail}
          onMessageCustomer={handleMessageCustomer}
          onStatusUpdate={handleStatusUpdate}
          isUpdating={updatingId === detailBookingId}
        />
      )}
      <CancelBookingModal
        isOpen={!!cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={handleConfirmCancel}
        booking={cancelBooking}
        isLoading={!!updatingId}
      />
      <BulkCancelWizard
        isOpen={showBulkCancel}
        onClose={() => setShowBulkCancel(false)}
        onCompleted={() => loadBookings({ silent: true })}
      />
      <CreateBookingDrawer
        open={showCreateBooking}
        onClose={() => setShowCreateBooking(false)}
        tours={createTours}
        onCreated={() => loadBookings({ silent: true })}
      />
    </div>
  );
}
