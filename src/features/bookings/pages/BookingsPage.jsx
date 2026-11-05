import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { useTeamRole } from "@/hooks/useTeamRole";
import useMediaQuery from "@/hooks/useMediaQuery";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
import DatePicker from "@/components/forms/DatePicker";
import Select from "@/components/forms/Select";
import {
  fetchSupplierBookings,
  fetchCommissionCover,
  updateBookingStatus,
  cancelBookingStructured,
  withdrawCancellationRequest,
  exportSupplierBookingsCsv,
  sendBookingPaymentLink,
} from "../api";
import { getAuthToken } from "@/stores/authStore";
import BookingCard from "../components/BookingCard";
import CancelBookingModal from "../components/CancelBookingModal";
import RequestRefundModal from "../components/RequestRefundModal";
import BookingDetailDrawer from "../components/BookingDetailDrawer";
import BulkCancelWizard from "../components/BulkCancelWizard";
import CancellationRequestsPanel from "../components/CancellationRequestsPanel";
import CreateBookingDrawer from "../components/CreateBookingDrawer";
import { listMyProducts } from "@/features/products/api";
import { describeActionError } from "@/lib/errorHandler";

const QUICK_FILTERS = [
  { key: "ALL", label: "All bookings" },
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  // Not a BookingStatus: bookings whose refund is pending, issued or failed.
  // The backend resolves the filter; the label stays a tab, not a status.
  { key: "REFUNDS", label: "Refunds" },
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
  // Persistent inline mutation failure per booking. A toast disappears; a
  // supplier who looks back at the row must still see that the server refused
  // the change and what to do next.
  const [mutationErrors, setMutationErrors] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  // Refund requests are a separate flow: nothing is cancelled, nothing moves
  // until an admin approves.
  const [refundBooking, setRefundBooking] = useState(null);
  const [showBulkCancel, setShowBulkCancel] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState("bookings"); // bookings | requests
  // Supplier-created bookings: the wizard owns its own state; these two hold
  // the drawer and the tour catalogue it picks from (fetched on open).
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [createTours, setCreateTours] = useState([]);
  // No credit: commission on an offline booking must be covered by money the
  // platform already holds for this supplier. Fetched with the list so the
  // button can explain itself instead of failing on submit.
  const [commissionCover, setCommissionCover] = useState(null);
  const { hasPermission, supplierCreatedBookings, uiPreferences } = useTeamRole();
  // `sm` breakpoint. The primary action moves beside the title on phones but
  // must exist only once in the DOM, so the placement is chosen, not CSS-hidden.
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [highlightedBookingId, setHighlightedBookingId] = useState(
    searchParams.get("bookingId") || null
  );
  // The detail panel is URL-driven so a supplier can share or reload a link to
  // one booking, and so Back closes the panel before leaving the page.
  const detailBookingId = searchParams.get("detail") || null;

  // A notification, the chat panel or an email link arrives as `?bookingId=`,
  // but the drawer is driven by `?detail=`. Reconcile the two here instead of
  // relying on the row highlight: the booking targeted by a notification is
  // usually not on the page the list happens to be showing (different filters,
  // page 3 of the supplier's history), so highlighting could do nothing at
  // all and the click looked like it ignored the notification. The drawer
  // fetches by id, so it opens whatever the list contains. Converted once per
  // id, and with `replace`, so Back closes the drawer instead of bouncing
  // between the two params.
  const consumedDeepLinkRef = useRef(null);
  useEffect(() => {
    const target = searchParams.get("bookingId");
    if (!target || consumedDeepLinkRef.current === target) return;
    consumedDeepLinkRef.current = target;
    setHighlightedBookingId(target);
    const next = new URLSearchParams(searchParams);
    next.delete("bookingId");
    if (!next.get("detail")) next.set("detail", target);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  // Commission cover moves whenever a payout settles or a collection is
  // recorded, so it is refreshed alongside the list rather than once.
  useEffect(() => {
    if (!supplierCreatedBookings) return undefined;
    let cancelled = false;
    fetchCommissionCover()
      .then((cover) => {
        if (!cancelled) setCommissionCover(cover);
      })
      .catch(() => {
        // A failed read is not permission to create: leave the last known
        // answer in place (null on first load blocks the button).
        if (!cancelled) setCommissionCover((prev) => prev);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierCreatedBookings, bookings.length]);

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
    (booking) => updateFilters({ detail: booking.id, bookingId: undefined }),
    [updateFilters]
  );
  const closeDetail = useCallback(
    // `bookingId` goes too: a deep link is consumed into `detail`, and closing
    // the drawer must not re-open it from a leftover param.
    () => updateFilters({ detail: undefined, bookingId: undefined }),
    [updateFilters]
  );

  const handleTabClick = (tabKey) => updateFilters({ tab: tabKey, page: 0 });

  const clearMutationError = useCallback((bookingId) => {
    setMutationErrors((prev) => {
      if (!prev[bookingId]) return prev;
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });
  }, []);

  const handleStatusUpdate = useCallback(
    async (bookingId, status) => {
      if (status === "CANCELLED") {
        const booking = bookings.find((b) => b.id === bookingId);
        setCancelBooking(booking || { id: bookingId, tour: {} });
        return;
      }
      // Not a status change: opens the refund-request modal. Sending
      // "REFUND_REQUEST" to PATCH /status would be rejected by the server.
      if (status === "REFUND_REQUEST") {
        const booking = bookings.find((b) => b.id === bookingId);
        setRefundBooking(booking || { id: bookingId });
        return;
      }
      setUpdatingId(bookingId);
      clearMutationError(bookingId);
      try {
        await updateBookingStatus(bookingId, { status });
        toast.success("Booking status updated");
        await loadBookings({ silent: true });
      } catch (err) {
        const ambiguous = !err.response;
        const message = ambiguous
          ? "We could not confirm whether the status change went through. Refresh the booking before trying again."
          : err.response?.data?.message || "Failed to update booking status";
        // The last server-confirmed row stays on screen; nothing optimistic is
        // applied. Retry is only offered when the server actually answered.
        setMutationErrors((prev) => ({
          ...prev,
          [bookingId]: { message, status, retry: !ambiguous, code: err.response?.data?.code || null },
        }));
      } finally {
        setUpdatingId(null);
      }
    },
    [bookings, loadBookings, clearMutationError]
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
        const ambiguous = !err.response;
        setMutationErrors((prev) => ({
          ...prev,
          [cancelBooking.id]: {
            message: ambiguous
              ? "We could not confirm whether the cancellation went through. Refresh the booking before trying again."
              : err.response?.data?.message || "Failed to cancel booking",
            retry: !ambiguous,
            code: err.response?.data?.code || null,
          },
        }));
        throw err;
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
        toast.error(describeActionError(err, "Couldn't withdraw the request"));
        throw err;
      }
    },
    [loadBookings]
  );

  const handlePaymentLinkAction = useCallback(
    async (booking, payload) => {
      const mode =
        payload.action === "RESEND_PAYMENT_LINK"
          ? "resend"
          : payload.action === "REGENERATE_PAYMENT_LINK"
            ? "regenerate"
            : "create";
      const response = await sendBookingPaymentLink(booking.id, {
        mode,
        sendInChat: payload.sendInChat,
        idempotencyKey: payload.idempotencyKey,
      });
      // Re-read the list so the badge/attention reflect the server's new
      // projection rather than a local guess about what the click did. A failed
      // refresh must not turn a delivered link into an apparent action failure.
      await loadBookings({ silent: true }).catch(() => {});
      return response.data?.data || {};
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
      toast.error(describeActionError(err, "Couldn't export bookings"));
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
      refunds:
        summaryCounts.REFUNDS ??
        filteredData.filter(
          (b) =>
            b.status === "REFUNDED" ||
            ["PENDING", "SUCCEEDED", "FAILED"].includes(b.refundStatus)
        ).length,
      revenue:
        bookingSummary?.totalRevenue ??
        filteredData.reduce((sum, b) => sum + (Number(b.total) || 0), 0),
    };
  }, [filteredData, bookingSummary, pagination]);

  const canSeeRevenue = hasPermission("bookings.revenue.view") || hasPermission("earnings.view");
  const canExport = hasPermission("bookings.export");
  const canManageBookings = hasPermission("bookings.manage");
  const bookingKpis = [
    { key: "total", label: "Total Bookings", value: stats.total, icon: ShoppingCart, tint: "bg-slate-50 text-slate-500" },
    { key: "pending", label: "Pending", value: stats.pending, icon: Clock, tint: "bg-amber-50 text-amber-600" },
    { key: "confirmed", label: "Confirmed", value: stats.confirmed, icon: CheckCircle2, tint: "bg-blue-50 text-blue-600" },
    { key: "completed", label: "Completed", value: stats.completed, icon: BadgeCheck, tint: "bg-emerald-50 text-emerald-600" },
    { key: "cancellations", label: "Cancellations", value: stats.cancelled, icon: AlertTriangle, tint: "bg-rose-50 text-rose-600" },
    { key: "revenue", label: "Revenue", value: formatCurrency(stats.revenue), icon: TrendingUp, tint: "bg-emerald-50 text-emerald-700" },
  ].filter((card) => {
    if (card.key === "revenue" && !canSeeRevenue) return false;
    const kpis = uiPreferences?.bookings?.kpis;
    return !Array.isArray(kpis) || kpis.includes(card.key);
  });

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
  // The tab row doubles as the summary: a count beside each status beats a
  // second set of numbers that says the same thing.
  const tabCounts = {
    ALL: stats.total,
    PENDING: stats.pending,
    CONFIRMED: stats.confirmed,
    COMPLETED: stats.completed,
    CANCELLED: stats.cancelled,
    REFUNDS: stats.refunds,
  };

  // Supplier-created bookings: the server decides whether this supplier may
  // create one, and the platform's own balance decides whether commission can
  // be covered. The backend enforces both; the button only reflects them.
  const canCreateBooking =
    hasPermission("bookings.manage") && supplierCreatedBookings;
  const coverUsd = commissionCover?.currencies?.find((c) => c.currency === "USD");
  const coverReady = Boolean(commissionCover?.usable);
  const coverTitle = commissionCover == null
    ? "Checking your available earnings…"
    : coverReady
      ? "Create a booking and record the money you collect"
      : `You have no available earnings to cover commission${coverUsd ? ` (${formatCurrency(coverUsd.available, "USD")} available)` : ""}. `
        + "Commission on money you collect offline is deducted from earnings the platform already holds for you — "
        + "it cannot be extended on credit. Settle your balance or wait for an eligible payout first.";

  const openCreateBooking = async () => {
    if (!coverReady) return;
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
  };

  // Rendered in two slots: beside the title on phones, in the toolbar from
  // `sm` up. Exactly one is ever visible, so there is no duplicate focus stop.
  const createBookingButton = canCreateBooking ? (
    <button
      type="button"
      disabled={!coverReady}
      title={coverTitle}
      aria-disabled={!coverReady}
      onClick={openCreateBooking}
      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-600 sm:h-auto sm:py-2"
    >
      <Calendar size={14} /> Create booking
    </button>
  ) : null;

  return (
    <div className="space-y-5">
      {/* ====== HEADER ====== */}
      {/* On phones the primary action sits beside the page title. A toggle, a
          CTA and a refresh sharing one row needed 432px, which widened the
          layout viewport on every phone and made the drawers overflow with it. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex items-start justify-between gap-3 sm:block">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Ticket size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Bookings</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Every reservation across your tours.
              </p>
            </div>
          </div>
          {!isDesktop && view === "bookings" && createBookingButton && (
            <div className="shrink-0">{createBookingButton}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("bookings")}
              aria-pressed={view === "bookings"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === "bookings"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <ShoppingCart size={13} /> Bookings
            </button>
            <button
              type="button"
              onClick={() => setView("requests")}
              aria-pressed={view === "requests"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === "requests"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <ClipboardList size={13} />
              {/* The full label wraps the toggle onto two lines below 360px; the
                  short one keeps the control a single line on the narrowest phones. */}
              <span className="max-[359px]:hidden">Cancellation requests</span>
              <span className="min-[360px]:hidden">Requests</span>
            </button>
          </div>
          {view === "bookings" && (
            <>
              {isDesktop && createBookingButton}
              {/* Icon-only on phones so the toggle keeps its natural width. */}
              <button
                type="button"
                onClick={loadBookings}
                disabled={loading}
                aria-label="Refresh bookings"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 sm:w-auto sm:gap-1.5 sm:px-3"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                <span className="hidden sm:inline">Refresh</span>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {bookingKpis.map((s) => (
          <div
            key={s.key}
            className="rounded-xl border border-slate-200/80 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-tight text-slate-500">
                {s.label}
              </p>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  s.tint
                )}
              >
                <s.icon size={14} />
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums leading-tight tracking-tight text-slate-900 sm:text-2xl">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ====== TOOLBAR ====== */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        {/* Quick filters: the counts are the summary, so the KPI row above has
            nothing to repeat. */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 px-2 scrollbar-none">
          {QUICK_FILTERS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                aria-pressed={isActive}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {tabCounts[tab.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + advanced filters */}
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              aria-label="Search bookings by traveller, customer, reference or tour"
              placeholder="Search traveller, customer, reference or tour…"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:text-sm"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
              showFilters || hasFilters
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            <Calendar size={14} /> Filters
            {hasFilters && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            )}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={13} /> Clear
            </button>
          )}

          {canExport && (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loading}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 sm:ml-auto"
            >
              {exporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Export CSV
            </button>
          )}

          {canManageBookings && (
            <button
              onClick={() => setShowBulkCancel(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <CalendarX2 size={13} /> Cancel multiple
            </button>
          )}
        </div>

        {/* Expandable date filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 px-3 py-3">
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
              className="rounded-xl border border-slate-200/80 bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 animate-pulse rounded-lg bg-slate-100 sm:h-16 sm:w-16" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                  <div className="h-2 w-20 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-5 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
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
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">
              {totalItems} booking{totalItems !== 1 ? "s" : ""}
              {hasFilters ? " match your filters" : ""}
            </p>
            {activeTab !== "ALL" && (
              <p className="text-[11px] text-slate-400">
                {QUICK_FILTERS.find((t) => t.key === activeTab)?.label}
              </p>
            )}
          </div>
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
                onPaymentLinkAction={(booking, payload) => {
                  clearMutationError(booking.id);
                  return handlePaymentLinkAction(booking, payload);
                }}
                onRefresh={() => loadBookings({ silent: true })}
                mutationError={mutationErrors[booking.id]}
              />
            ))}
          </div>
        </>
      )}

      {/* ====== PAGINATION ====== */}
      {totalPages > 1 && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
            <span>Show</span>
            {/* The shared Select: the bare <select> had no focus indicator at
                all (focus:outline-none with nothing to replace it) and wore
                the OS's own arrow, which never matched the rest of the
                toolbar. */}
            <Select
              value={pageSize}
              onChange={(e) =>
                updateFilters({ pageSize: Number(e.target.value), page: 0 })
              }
              aria-label="Bookings per page"
              className="h-7 w-auto cursor-pointer px-2.5 py-0 pr-7 text-xs font-medium text-slate-700"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <span>of {totalItems}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => updateFilters({ page: page - 1 })}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-40"
            >
              Prev
            </button>
            {/* Numbered buttons need 280px on their own. Below `sm` the page
                counter says the same thing in a third of the space. */}
            <div className="hidden items-center gap-1 sm:flex">
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
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p + 1}
                  </button>
                );
              })}
            </div>
            <span className="px-1 text-xs font-medium tabular-nums text-slate-500 sm:hidden">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => updateFilters({ page: page + 1 })}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-40"
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
          onRefresh={() => loadBookings({ silent: true })}
          onPaymentLinkUpdated={() => loadBookings({ silent: true })}
          mutationError={mutationErrors[detailBookingId]}
        />
      )}
      <CancelBookingModal
        isOpen={!!cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={handleConfirmCancel}
        booking={cancelBooking}
        isLoading={!!updatingId}
        onRefresh={() => loadBookings({ silent: true })}
      />
      <RequestRefundModal
        // Remount per booking: the modal's state is per-request, so a second
        // booking must never inherit the first one's form.
        key={refundBooking?.id || "none"}
        isOpen={!!refundBooking}
        onClose={() => setRefundBooking(null)}
        booking={refundBooking}
        onSubmitted={() => loadBookings({ silent: true })}
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
