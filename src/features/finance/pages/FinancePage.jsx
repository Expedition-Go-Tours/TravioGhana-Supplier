import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import RefundClaimsPage from "@/features/refund-claims/pages/RefundClaimsPage";
import { useSearchParams } from "react-router-dom";
import {
  DollarSign, Wallet, CreditCard, Loader2, RefreshCw, Plus, Trash2,
  TrendingUp, Landmark, Smartphone, Eye, EyeOff, FileText,
  CheckCircle2, AlertTriangle, X, ChevronDown, ChevronLeft, ChevronRight, Banknote,
  Calendar, Info, Search, Lock, XCircle, Undo2, ClipboardList,
  ListFilter as FilterIcon,
} from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/shared/StatusBadge";
import { useModalDialog } from "@/components/shared/useModalDialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { PayoutScheduleEditor, PayoutScheduleSummary } from "../components/PayoutScheduleCard";
import PayoutMethodFormSheet from "../components/PayoutMethodFormSheet";
import InvoicesTab from "../components/InvoicesTab";
import {
  cancelPayoutRequest, createPayoutMethod, createPayoutRequest, createRefundRequest, deletePayoutMethod,
  fetchFinanceDisputes, fetchFinanceEarnings, fetchFinanceSummary, fetchMyInvoices, fetchPayoutMethods, fetchPayoutRequestById,
  fetchPayoutRequests,
  getFinanceCharges,
  withdrawRefundRequest,
} from "../api";
import { getAuthToken } from "@/stores/authStore";
import { useTeamRole } from "@/hooks/useTeamRole";
import { DENIED_ACTION_REASON } from "@/config/pageAccess";
import { moneyLine, moneyTotal, hasPositiveAmount } from "../money";
import { COUNTRIES, PAYOUT_METHOD_TYPES, maskTail } from "../config/payoutMethodForm";
import { describeActionError } from "@/lib/errorHandler";

const TABS = [
  { key: "earnings", label: "Earnings", icon: DollarSign },
  { key: "payouts", label: "Payouts", icon: Banknote },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "refunds", label: "Refunds", icon: Undo2 },
  { key: "claims", label: "Refund Requests", icon: ClipboardList },
  { key: "methods", label: "Payout Methods", icon: CreditCard },
];

// "All" comes first and is the default. The list used to open on "Eligible
// now", the narrowest bucket in the set, so a supplier whose money was already
// in a payout request saw an empty table and was told they had no earnings.
// An empty key means no `payoutStatus` param, which the endpoint reads as "every
// bucket".
const FILTER_PILLS = [
  { key: "", label: "All" },
  { key: "ELIGIBLE", label: "Eligible now" },
  { key: "PENDING", label: "Pending clearance" },
  { key: "REQUESTED", label: "In payout request" },
  { key: "PAID", label: "Paid" },
  { key: "DISPUTED", label: "On refund hold" },
  { key: "CANCELLED", label: "Cancelled" },
];

const REFUND_STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "OPEN,UNDER_REVIEW", label: "In review" },
  { key: "RESOLVED_CUSTOMER,RESOLVED_SUPPLIER", label: "Resolved" },
  { key: "WITHDRAWN", label: "Withdrawn" },
];

const REFUND_REASONS = [
  { value: "OPERATIONAL", label: "Operational issue", desc: "Guide, vehicle or venue unavailable · minimum participants not reached" },
  { value: "FORCE_MAJEURE", label: "Force majeure", desc: "Weather, disasters or events beyond your control" },
  { value: "CUSTOMER_REQUESTED", label: "Customer requested", desc: "The customer asked you directly for a refund" },
  { value: "OTHER", label: "Other", desc: "Anything else that warrants a refund" },
];

const INITIAL_REFUND_FORM = { bookingId: "", reason: "", description: "" };

const PAGE_SIZE = 20;

// Searchable booking picker rendered through a portal so it can never be
// clipped by the modal's scroll container. Closes on Escape, outside click,
// or scroll of anything other than its own panel.
function BookingCombobox({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [style, setStyle] = useState(null);

  const selected = options.find((b) => b.id === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((b) =>
      [b.bookingNumber, b.tour, b.customer].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [options, query]);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 16;
    const flip = spaceBelow < 180 && r.top > 240;
    setStyle({
      position: "fixed",
      left: r.left,
      width: r.width,
      ...(flip
        ? { bottom: window.innerHeight - r.top + 4, maxHeight: Math.min(288, r.top - 16) }
        : { top: r.bottom + 4, maxHeight: Math.min(288, Math.max(160, spaceBelow)) }),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => { setOpen((o) => !o); setQuery(""); }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border rounded-lg text-sm bg-white text-left transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400",
          selected ? "border-slate-200" : "border-slate-200 text-slate-400"
        )}
      >
        {selected ? (
          <span className="min-w-0">
            <span className="block font-medium text-slate-900 truncate">{selected.bookingNumber}</span>
            <span className="block text-xs text-slate-500 truncate">
              {selected.tour} · {formatCurrency(selected.grossAmount, selected.currency)}
            </span>
          </span>
        ) : (
          <span>Select a booking…</span>
        )}
        <ChevronDown size={16} className={cn("text-slate-500 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={style}
          className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col z-[60]"
        >
          <div className="p-2 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search booking #, tour or customer…"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">No bookings match “{query.trim()}”</p>
            ) : (
              filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onChange(b.id); setOpen(false); setQuery(""); }}
                  className={cn(
                    "w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors",
                    value === b.id && "bg-emerald-50"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">{b.bookingNumber}</span>
                    <span className="text-sm font-semibold text-slate-700 shrink-0 tabular-nums">
                      {formatCurrency(b.grossAmount, b.currency)}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-500 truncate">
                    {b.tour}{b.travelDate ? ` · ${formatDate(b.travelDate)}` : ""}{b.customer ? ` · ${b.customer}` : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function TablePagination({ pagination, page, onPageChange }) {
  if (!pagination || !pagination.totalPages || pagination.totalPages <= 1) return null;
  const current = pagination.currentPage || page;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
      <p className="text-xs text-slate-500">
        Page {current} of {pagination.totalPages} · {pagination.totalCount ?? "?"} record(s)
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={13} /> Previous
        </button>
        <button
          disabled={current >= pagination.totalPages}
          onClick={() => onPageChange(current + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// Shared shape for the money cards: label and muted icon on one line, the
// figure on its own, then whatever context the card needs. The old cards put a
// coloured strip along the bottom, which read as a chart that wasn't there.
function SummaryCard({ label, value, icon: Icon, tint = "bg-slate-50 text-slate-500", children }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-tight text-slate-500">{label}</p>
          <p className="mt-1.5 text-xl font-bold leading-tight tracking-tight tabular-nums text-slate-900 sm:text-2xl">
            {value}
          </p>
        </div>
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tint)}>
          <Icon size={14} />
        </span>
      </div>
      {/* Detail sits under the header row: inside the label column a payout
          window had roughly 120px on a phone and wrapped into four lines. */}
      {children}
    </div>
  );
}

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Normalize unknown/stale ?tab= values (e.g. legacy "requests" deep links)
  // to the default tab so the page can never render with no active tab.
  const requestedTab = searchParams.get("tab") || "earnings";
  const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : "earnings";
  // Deep links from the notification bell (?payoutRequestId / ?disputeId /
  // ?invoiceId) name the row or invoice the notification is about. The tab
  // alone was never enough: the target may sit on any page of a paginated
  // list, so it is resolved by id below and pulsed in place.
  const focusPayoutRequestId = searchParams.get("payoutRequestId") || null;
  const focusDisputeId = searchParams.get("disputeId") || null;
  const focusInvoiceId = searchParams.get("invoiceId") || null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  // True when /finance/summary failed. Nothing on the money cards may then
  // read as "0": unknown is not zero.
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [earnings, setEarnings] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [methods, setMethods] = useState([]);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [filterPill, setFilterPill] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  // The cadence chooser, reachable from the card. It used to live only in
  // Settings, which meant a supplier reading "paid automatically on your
  // weekly schedule" had to go hunting through a separate settings tab to
  // change it or to find out what "automatic" actually commits them to.
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  // Escape locked while submitting, so a half-sent request cannot be dismissed
  // out from under itself.
  const requestDialog = useModalDialog({
    open: showRequestModal,
    onClose: () => setShowRequestModal(false),
    enabled: !submittingRequest,
  });
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [disputeStatusFilter, setDisputeStatusFilter] = useState("");
  const [expandedDispute, setExpandedDispute] = useState(null);
  const [withdrawingDisputeId, setWithdrawingDisputeId] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState(INITIAL_REFUND_FORM);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const refundDialog = useModalDialog({
    open: showRefundModal,
    onClose: () => setShowRefundModal(false),
    enabled: !submittingRefund,
  });
  const [eligibleBookings, setEligibleBookings] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [page, setPage] = useState(1);
  const [earningsPagination, setEarningsPagination] = useState(null);
  const [payoutsPagination, setPayoutsPagination] = useState(null);
  const [disputesPagination, setDisputesPagination] = useState(null);
  const [charges, setCharges] = useState({ rows: [], openTotals: [], openByReason: {}, loading: true, error: null });
  const [invoices, setInvoices] = useState([]);
  const [invoicesPagination, setInvoicesPagination] = useState(null);
  // Status filter for the Invoices tab. Empty = every status the endpoint
  // returns; a value maps 1:1 onto the server's allow-list.
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("");

  const loadData = useCallback(async () => {
    if (!getAuthToken()) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      // The summary carries the money cards. It used to be swallowed with
      // `.catch(() => null)`, which rendered every card as "$0.00" on a failed
      // fetch — a supplier cannot tell "you have nothing" from "we don't know".
      // A failed summary now renders "—" and says why.
      let summaryResult = null;
      let summaryFailure = false;
      try {
        summaryResult = await fetchFinanceSummary();
      } catch (summaryErr) {
        if (summaryErr.code === "AUTH_REQUIRED") return;
        summaryFailure = true;
      }
      setSummary(summaryResult);
      setSummaryFailed(summaryFailure);

      if (activeTab === "earnings") {
        const params = { page, limit: PAGE_SIZE };
        if (filterPill) params.payoutStatus = filterPill;
        const result = await fetchFinanceEarnings(params);
        setEarnings(result.earnings || []);
        setEarningsPagination(result.pagination || null);
      } else if (activeTab === "payouts") {
        const result = await fetchPayoutRequests({ page, limit: PAGE_SIZE });
        setPayoutRequests(result.requests || []);
        setPayoutsPagination(result.pagination || null);
      } else if (activeTab === "invoices") {
        const invParams = { page, limit: PAGE_SIZE };
        if (invoiceStatusFilter) invParams.status = invoiceStatusFilter;
        const invResult = await fetchMyInvoices(invParams);
        setInvoices(invResult.invoices || []);
        setInvoicesPagination(invResult.pagination || null);
      } else if (activeTab === "refunds") {
        const result = await fetchFinanceDisputes({
          page,
          limit: PAGE_SIZE,
          ...(disputeStatusFilter ? { status: disputeStatusFilter } : {}),
        });
        setDisputes(result.disputes || []);
        setDisputesPagination(result.pagination || null);
      } else if (activeTab === "methods") {
        const result = await fetchPayoutMethods();
        setMethods(result);
      }
      // 'claims' tab loads its own data (RefundClaimsPage) — nothing to fetch here.
    } catch (err) {
      if (err.code === "AUTH_REQUIRED") return;
      setError(err.response?.data?.message || err.message || "Failed to load finance data");
    } finally { setLoading(false); }
  }, [activeTab, disputeStatusFilter, filterPill, page, invoiceStatusFilter]);

  // Reset to the first page whenever the tab or a filter changes
  // (render-phase state adjustment — the linter-approved way to sync state to
  // a prop/derived change without calling setState in an effect).
  const resetKey = `${activeTab}|${disputeStatusFilter ?? ""}|${filterPill ?? ""}|${invoiceStatusFilter ?? ""}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadData();
    });
    return () => { cancelled = true; };
  }, [loadData]);

  /**
   * Deep-link resolution for the rows a notification points at.
   *
   * The list is paginated server-side, so a target that is not on the current
   * page is fetched by id and prepended — the same pattern ReviewsPage uses
   * for `?reviewId`. A failed fetch is left silent: the supplier still lands
   * on the right tab with the rest of the data.
   */
  useEffect(() => {
    if (!focusPayoutRequestId || loading || activeTab !== "payouts") return;
    if (payoutRequests.some((r) => r.id === focusPayoutRequestId)) return;
    let cancelled = false;
    fetchPayoutRequestById(focusPayoutRequestId)
      .then((request) => {
        if (cancelled || !request) return;
        setPayoutRequests((prev) =>
          prev.some((r) => r.id === request.id) ? prev : [request, ...prev],
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [focusPayoutRequestId, activeTab, loading, payoutRequests]);

  useEffect(() => {
    if (!focusDisputeId || loading || activeTab !== "refunds") return;
    if (disputes.some((d) => d.id === focusDisputeId)) return;
    let cancelled = false;
    fetchFinanceDisputes({ disputeId: focusDisputeId })
      .then(({ disputes: found }) => {
        if (cancelled || !found?.[0]) return;
        const target = found[0];
        setDisputes((prev) => (prev.some((d) => d.id === target.id) ? prev : [target, ...prev]));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [focusDisputeId, activeTab, loading, disputes]);

  // Scroll the deep-linked row into view and open its detail, once it exists.
  // The dispute row is a click-to-expand row, so the deep link expands it too.
  useEffect(() => {
    const focusId = focusPayoutRequestId || focusDisputeId;
    if (!focusId || loading) return;
    const onTab =
      (focusPayoutRequestId && activeTab === "payouts" && payoutRequests.some((r) => r.id === focusId)) ||
      (focusDisputeId && activeTab === "refunds" && disputes.some((d) => d.id === focusId));
    if (!onTab) return;
    if (focusDisputeId) setExpandedDispute(focusDisputeId);
    const timer = setTimeout(() => {
      document.getElementById(`finance-row-${focusId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(timer);
  }, [focusPayoutRequestId, focusDisputeId, activeTab, loading, payoutRequests, disputes]);

  // The invoice drawer opens straight from its id (it fetches the invoice
  // itself), so the param only has to be dropped once the supplier closes it —
  // otherwise the drawer reopens on every reload of the same URL.
  const clearInvoiceFocus = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("invoiceId");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // The highlight is a one-off: the param goes after 8s so a reload does not
  // re-scroll to a target the supplier has long since moved past.
  useEffect(() => {
    if (!focusPayoutRequestId && !focusDisputeId) return undefined;
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("payoutRequestId");
        next.delete("disputeId");
        return next;
      }, { replace: true });
    }, 8000);
    return () => clearTimeout(timer);
  }, [focusPayoutRequestId, focusDisputeId, setSearchParams]);

  // Cancellation-fee ledger (shown on the payouts tab)
  const loadCharges = useCallback(async () => {
    setCharges((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await getFinanceCharges();
      setCharges({
        rows: result.charges,
        openTotals: result.openTotals,
        openByReason: result.openByReason || {},
        loading: false,
        error: null,
      });
    } catch (err) {
      if (err.code === "AUTH_REQUIRED") return;
      setCharges((s) => ({
        ...s,
        loading: false,
        error: err.response?.data?.message || "Could not load platform charges.",
      }));
    }
  }, []);

  useEffect(() => {
    loadCharges();
  }, [loadCharges]);

  const handleDeleteMethod = async (id) => {
    if (!confirm("Delete this payout method?")) return;
    try {
      await deletePayoutMethod(id);
      toast.success("Payout method deleted");
      await loadData();
    } catch (err) {
      toast.error(describeActionError(err, "Couldn't delete payout method"));
    }
  };

  // Finance v3: enrolled suppliers are paid via automatic invoices. `balance`
  // is the sum of their unpaid invoices; `nextPayout` is the live projection
  // for the pending window (recalculates on every load and resets once an
  // invoice for the window generates).
  const isEnrolled = Boolean(summary?.nextPayout);
  const nextPayout = summary?.nextPayout || null;
  const balanceRows = useMemo(() => summary?.balance?.byCurrency || [], [summary]);
  const balanceTotal = useMemo(
    () => balanceRows.reduce((s, c) => s + (Number(c.amount) || 0), 0),
    [balanceRows]
  );
  // Compute stats from the finance v2 summary endpoint. The scalar fields are
  // null whenever the account holds more than one currency (see money.js), so
  // the cards fall back to the per-currency lines instead of inventing a total.
  const stats = useMemo(() => {
    const available = summary?.availableBalance ?? null;
    const pending = summary?.pendingClearance ?? null;
    const inReview = summary?.inReview ?? null;
    const paidOut = summary?.paidOut ?? null;
    return {
      available,
      pending,
      inReview,
      paidOut,
      availableTotal: moneyTotal(summary?.availableBalance),
      pendingTotal: moneyTotal(summary?.pendingClearance),
    };
  }, [summary]);

  // When the summary could not be loaded, every money figure is unknown.
  const money = (value) => (summaryFailed ? "—" : value);

  // Money whose payment succeeded but that has not cleared into a window yet
  // (payoutStatus PENDING). Enrolled suppliers have no legacy "Pending
  // clearance" card, so without this line the amount appeared nowhere.
  const clearingAmount = moneyTotal(summary?.pendingClearance);

  // Eligibility for a manual payout request: true when any currency holds a
  // positive balance. The scalar total is deliberately NOT summed across
  // currencies — it is only ever used to answer "is there anything at all".
  const hasAvailable = hasPositiveAmount(summary?.availableBalance);

  const windowInfo = summary?.withdrawalWindow || null;
  const windowOpen = Boolean(windowInfo?.open);
  // Payout actions are gated separately from opening this page: `finance.view`
  // gets you the numbers, `payouts.request` / `payout-methods.manage` get you
  // the buttons. A read-only finance role must see why a button is inert, not
  // click it and read a 403.
  const { hasPermission } = useTeamRole();
  // The API accepts either key for payout methods (add and remove are both
  // `payout-methods.manage` OR `payouts.request`), so the buttons must not be
  // stricter than the server.
  const canRequestPayoutMoney = hasPermission("payouts.request");
  const canManageMethods =
    hasPermission("payout-methods.manage") || hasPermission("payouts.request");
  // Only the legacy (unmigrated) flow has a request button: enrolled suppliers
  // are paid on their automatic invoice schedule and there is nothing to ask
  // for by hand. An open withdrawal window + eligible earnings enables it.
  const canRequestPayout = windowOpen && hasAvailable && !summaryFailed && canRequestPayoutMoney;

  // A payout that finance is already holding. While this exists the supplier has
  // no balance to ask for — the bookings have moved to REQUESTED — so the page
  // must lead with the request's progress instead of offering another one.
  const inFlightRequest = summary?.inReview?.latestRequest || null;

  // Booking counts per payout bucket, so an empty table can say where the
  // bookings went rather than claiming there are none.
  const payoutCounts = summary?.payoutCounts || {};
  const totalBookings = Object.values(payoutCounts).reduce((s, n) => s + (Number(n) || 0), 0);
  const activePillLabel = FILTER_PILLS.find((p) => p.key === filterPill)?.label || "earnings";

  // Why the request button is unavailable, in words. A `title` attribute is not
  // an option: a disabled button does not emit pointer events, so the tooltip
  // never shows and the supplier is left with an unexplained grey box.
  const requestBlockedReason = useMemo(() => {
    if (!canRequestPayoutMoney) return DENIED_ACTION_REASON;
    if (summaryFailed) return "We couldn't load your balance, so nothing can be requested right now.";
    if (inFlightRequest) return "Your payout is already in review.";
    if (!hasAvailable) return "Nothing is eligible to request yet.";
    if (!windowOpen) {
      return windowInfo?.opensAt
        ? `You can request early from ${formatDate(windowInfo.opensAt)}.`
        : "Early requests are not open right now.";
    }
    return null;
  }, [canRequestPayoutMoney, summaryFailed, inFlightRequest, hasAvailable, windowOpen, windowInfo]);

  // Automated payout schedule (twice a month / monthly).
  //
  // Enrolled suppliers (v3) are paid via invoices, so they get the schedule
  // card instead of the legacy withdrawal-window card — including while the
  // scheduler is paused, because their scheduled invoice still fires and their
  // funds must never look stranded. Only legacy (unmigrated) accounts see the
  // calendar window.
  const payoutPlan = summary?.payoutPlan || null;
  const showSchedule = Boolean(payoutPlan?.autoManaged);

  // Cycle display strings from the server-provided summary
  const cycleInfo = useMemo(() => {
    const current = summary?.currentCycle?.label || "";
    const nextWindow = windowInfo
      ? `${formatDate(windowInfo.opensAt)} – ${formatDate(windowInfo.closesAt)}`
      : "";
    return { current, requestWindow: nextWindow };
  }, [summary, windowInfo]);

  const handleRequestPayout = async () => {
    setSubmittingRequest(true);
    try {
      // Legacy (unmigrated) flow only — enrolled suppliers are invoiced
      // automatically and have no manual request. See `showSchedule`.
      await createPayoutRequest({});
      toast.success("Payout request submitted for review");
      setShowRequestModal(false);
      await loadData();
    } catch (err) {
      toast.error(describeActionError(err, "Couldn't submit payout request"));
    } finally { setSubmittingRequest(false); }
  };

  const handleCancelRequest = async (id) => {
    if (!confirm("Cancel this payout request? The bookings will become eligible again.")) return;
    setCancellingRequestId(id);
    try {
      await cancelPayoutRequest(id);
      toast.success("Payout request cancelled");
      await loadData();
    } catch (err) {
      toast.error(describeActionError(err, "Couldn't cancel payout request"));
    } finally { setCancellingRequestId(null); }
  };

  // ── Refund requests ──

  const openRefundModal = async () => {
    setShowRefundModal(true);
    setRefundForm(INITIAL_REFUND_FORM);
    setLoadingEligible(true);
    try {
      const result = await fetchFinanceEarnings({ limit: 500, payoutStatus: "PENDING,ELIGIBLE" });
      const eligible = (result.earnings || []).filter((e) => !e.openDispute);
      setEligibleBookings(eligible);
    } catch {
      setEligibleBookings([]);
    } finally {
      setLoadingEligible(false);
    }
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    if (!refundForm.bookingId) return toast.error("Select a booking");
    if (!refundForm.reason) return toast.error("Choose a reason for the refund");
    setSubmittingRefund(true);
    try {
      await createRefundRequest({
        bookingId: refundForm.bookingId,
        reason: refundForm.reason,
        description: refundForm.description || undefined,
      });
      toast.success("Refund request submitted for review");
      setShowRefundModal(false);
      await loadData();
    } catch (err) {
      toast.error(describeActionError(err, "Couldn't submit refund request"));
    } finally { setSubmittingRefund(false); }
  };

  const handleWithdrawRefund = async (id) => {
    if (!confirm("Withdraw this refund request? The booking's funds will become available for payout again.")) return;
    setWithdrawingDisputeId(id);
    try {
      await withdrawRefundRequest(id);
      toast.success("Refund request withdrawn");
      await loadData();
    } catch (err) {
      toast.error(describeActionError(err, "Couldn't withdraw refund request"));
    } finally { setWithdrawingDisputeId(null); }
  };

  // ── Stat cards. v3 (balance / next payout) for enrolled suppliers; the v2
  // cards stay for legacy accounts. ──
  const inReviewCard = (
    <SummaryCard
      label="In review"
      value={money(moneyLine(summary?.inReview))}
      icon={TrendingUp}
      tint="bg-amber-50 text-amber-600"
    >
      {summary?.inReview?.requestCount > 0 && (
        // slate-600 when this is the request reference: it is the number a
        // supplier quotes to support, and slate-400 sits at 2.60:1.
        <p className={cn("mt-1 text-[11px] leading-tight", inFlightRequest?.reference ? "tabular-nums text-slate-600" : "text-slate-500")}>
          {inFlightRequest?.reference || `${summary.inReview.requestCount} request(s)`}
        </p>
      )}
    </SummaryCard>
  );

  const paidOutCard = (
    <SummaryCard
      label="Paid out"
      value={money(moneyLine(summary?.paidOut))}
      icon={CheckCircle2}
      tint="bg-emerald-50 text-emerald-600"
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Wallet size={18} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Finance</h1>
            <p className="mt-0.5 text-sm text-slate-500">Earnings, invoices and payouts in one place.</p>
          </div>
        </div>
        <button onClick={() => { loadData(); loadCharges(); }} disabled={loading}
          aria-label="Refresh finance"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 sm:w-auto sm:gap-2 sm:px-3"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* The summary endpoint is the source of every money figure on this
          page. When it fails we say so — a supplier must never read "you have
          nothing" out of a fetch that simply did not succeed. */}
      {summaryFailed && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">We couldn't load your balances right now.</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The amounts below are unknown, not zero. Press Refresh to try again.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        {isEnrolled ? (
          <>
            <SummaryCard
              label="Your balance"
              value={money(moneyLine({
                byCurrency: balanceRows,
                // Empty rows mean the summary loaded and found nothing:
                // a real 0.00, not an unknown amount.
                amount: balanceRows.length <= 1 ? balanceTotal : null,
                currency: balanceRows[0]?.currency || "USD",
              }))}
              icon={DollarSign}
              tint="bg-emerald-50 text-emerald-600"
            >
              {(summary?.balance?.openInvoiceCount || 0) > 0 && (
                <p className="mt-1 text-[11px] leading-tight text-slate-500">
                  {summary.balance.openInvoiceCount} unpaid invoice{summary.balance.openInvoiceCount === 1 ? "" : "s"}
                </p>
              )}
            </SummaryCard>

            <SummaryCard
              label="Next payout"
              value={nextPayout?.window ? formatCurrency(nextPayout.netTotal) : "—"}
              icon={Calendar}
              tint="bg-sky-50 text-sky-600"
            >
              {nextPayout?.window ? (
                <>
                  <p className="mt-1 text-[11px] leading-tight text-slate-500">
                    Bookings {formatDate(nextPayout.window.start)} – {formatDate(nextPayout.window.end)}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-slate-400">
                    Invoiced {formatDate(nextPayout.window.invoicedOn)} · paid {formatDate(nextPayout.window.paidOn)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[11px] leading-tight text-slate-500">No pending payout window yet</p>
              )}
              {/* Money whose payment succeeded but that has not cleared into a
                  window yet. On the enrolled flow this state sits between
                  "balance" and "next payout" and used to be visible nowhere — a
                  supplier could reconcile every card and still be missing money
                  they had earned. */}
              {clearingAmount > 0 && (
                <p className="mt-1.5 text-[11px] leading-tight text-amber-700">
                  Plus {moneyLine(summary?.pendingClearance)} still clearing
                  {summary?.pendingClearance?.bookingCount
                    ? ` (${summary.pendingClearance.bookingCount} booking${summary.pendingClearance.bookingCount === 1 ? "" : "s"})`
                    : ""} — not in a window yet
                </p>
              )}
            </SummaryCard>
          </>
        ) : (
          <>
            <SummaryCard
              label="Available for payout"
              value={money(moneyLine(summary?.availableBalance))}
              icon={DollarSign}
              tint="bg-emerald-50 text-emerald-600"
            >
              {summary?.availableBalance?.bookingCount > 0 && (
                <p className="mt-1 text-[11px] leading-tight text-slate-500">
                  {summary.availableBalance.bookingCount} booking(s)
                </p>
              )}
            </SummaryCard>

            <SummaryCard
              label="Pending clearance"
              value={money(moneyLine(summary?.pendingClearance))}
              icon={Loader2}
              tint="bg-slate-100 text-slate-500"
            >
              {stats.pendingTotal > 0 && summary?.nextEligibleAt && (
                // slate-400 is the house muted colour and lands at 2.60:1 on white,
                // below AA. slate-500 clears 4.5:1 at the same visual weight.
                <p className="mt-1 text-[11px] leading-tight text-slate-500">
                  Next clears {formatDate(summary.nextEligibleAt)}
                </p>
              )}
              {summary?.pendingClearance?.bookingCount > 0 && (
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
                  {summary.pendingClearance.bookingCount} booking(s) after their travel date
                </p>
              )}
            </SummaryCard>
          </>
        )}

        {/* In review */}
        {inReviewCard}

        {/* Paid out */}
        {paidOutCard}
      </div>

      {/* Payout section — an automated schedule for enrolled suppliers, the
          legacy withdrawal window for everyone else. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {showSchedule ? (
          <PayoutScheduleSummary
            plan={payoutPlan}
            available={isEnrolled ? (nextPayout?.netTotal ?? 0) : stats.availableTotal}
            nextPayout={nextPayout}
            requestWindow={windowInfo}
            canRequestPayout={canRequestPayout}
            onRequestPayout={() => setShowRequestModal(true)}
            inFlightRequest={inFlightRequest}
            blockedReason={requestBlockedReason}
            onManageSchedule={() => setShowScheduleEditor((v) => !v)}
          />
        ) : (
        <>
        {/* Current Payout Cycle */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:col-span-2 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Calendar size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Current payout cycle</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">{cycleInfo.current || "—"}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {windowOpen ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Withdrawal window open until {formatDate(windowInfo.closesAt)}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    Window closed · opens {cycleInfo.requestWindow || "soon"}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-tight text-slate-400">
                Only completed bookings past their travel date are eligible.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5 lg:items-end">
            <button
              onClick={() => setShowRequestModal(true)}
              disabled={!canRequestPayout}
              className={cn(
                "flex h-10 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors lg:w-auto",
                canRequestPayout
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              )}
            >
              {!canRequestPayout && <Lock size={15} />}
              {canRequestPayout
                ? `Request payout · ${money(moneyLine(summary?.availableBalance))}`
                : "Request payout"}
            </button>
            {/* Visible, not a tooltip: a disabled button emits no pointer events,
                so a `title` never reaches the supplier. */}
            {requestBlockedReason && (
              <p className="max-w-[240px] text-[11px] leading-tight text-slate-500 lg:text-right">{requestBlockedReason}</p>
            )}
          </div>
        </div>
        </>
        )}

        {/* Next Cycle */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            <Calendar size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Accumulating</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEnrolled ? (
                nextPayout?.window ? (
                  <>
                    <span>{nextPayout.bookingCount} booking(s) in this window · </span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(nextPayout.netTotal)} next payout</span>
                  </>
                ) : (
                  <span>Nothing accumulating toward a payout window yet</span>
                )
              ) : (
                <>
                  <span>{summary?.pendingClearance?.bookingCount || 0} booking(s) clearing · </span>
                  <span className="font-semibold text-emerald-700">{money(moneyLine(summary?.pendingClearance))} pending</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* The cadence chooser, opened from the card. Rendered inline rather than
          pushed to Settings so that "paid automatically" and the control that
          changes it are on the same screen. */}
      {showSchedule && showScheduleEditor && (
        <PayoutScheduleEditor
          plan={payoutPlan}
          available={isEnrolled ? (nextPayout?.netTotal ?? 0) : stats.availableTotal}
          onSaved={() => {
            setShowScheduleEditor(false);
            // The plan feeds the summary the whole page renders from, so it has
            // to be refetched or the card keeps describing the old schedule.
            loadData();
          }}
        />
      )}

      {/* Payout Request Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {showRequestModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              onClick={() => !submittingRequest && setShowRequestModal(false)}
            >
            <motion.div
              ref={requestDialog.panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="payout-request-dialog-title"
              // Focus has to be able to land here when the dialog has no enabled
              // control of its own to take it.
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Banknote size={22} className="text-emerald-600" />
                </div>
                <button ref={requestDialog.closeRef} aria-label="Close" onClick={() => setShowRequestModal(false)} disabled={submittingRequest}
                  className="-m-1.5 p-1.5 text-slate-500 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <h3 id="payout-request-dialog-title" className="text-lg font-bold text-slate-900">
                Request payout
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                This bundles all your eligible bookings into a withdrawal request for review.
              </p>
              <div className="mt-4 space-y-2.5 bg-slate-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-900">{money(moneyLine(summary?.availableBalance))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Bookings included</span>
                  <span className="font-medium text-slate-700">{summary?.availableBalance?.bookingCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cycle</span>
                  <span className="font-medium text-slate-700">{windowInfo?.cycleLabel || "—"}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowRequestModal(false)} disabled={submittingRequest}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                  Cancel
                </button>
                <button onClick={handleRequestPayout} disabled={submittingRequest}
                  className="flex-1 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                  {submittingRequest ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {submittingRequest ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* Refund Request Modal */}
      {createPortal(
        <AnimatePresence>
          {showRefundModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              onClick={() => !submittingRefund && setShowRefundModal(false)}
            >
            <motion.div
              ref={refundDialog.panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="refund-request-dialog-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSubmitRefund}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Undo2 size={22} className="text-emerald-600" />
                  </div>
                  <button type="button" onClick={() => setShowRefundModal(false)} disabled={submittingRefund}
                    className="-m-1.5 p-1.5 text-slate-500 hover:text-slate-600 transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <h3 id="refund-request-dialog-title" className="text-lg font-bold text-slate-900">Request a refund</h3>
                <p className="text-sm text-slate-500 mt-1">
                  An admin will review your request. While it is open, the booking's funds are on hold.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Booking</label>
                    {loadingEligible ? (
                      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500">
                        <Loader2 size={15} className="animate-spin shrink-0" />
                        Loading eligible bookings…
                      </div>
                    ) : eligibleBookings.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        <AlertTriangle size={15} className="shrink-0" />
                        No eligible bookings right now. Bookings that are paid out or already disputed can't be refunded here.
                      </div>
                    ) : (
                      <BookingCombobox
                        options={eligibleBookings}
                        value={refundForm.bookingId}
                        onChange={(id) => setRefundForm((p) => ({ ...p, bookingId: id }))}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {REFUND_REASONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRefundForm((p) => ({ ...p, reason: r.value }))}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left transition-all",
                            refundForm.reason === r.value
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <p className={cn(
                            "text-sm font-semibold",
                            refundForm.reason === r.value ? "text-emerald-800" : "text-slate-700"
                          )}>{r.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Explanation <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add context that helps the reviewer decide: what happened, what the customer asked for…"
                      value={refundForm.description}
                      onChange={(e) => setRefundForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={() => setShowRefundModal(false)} disabled={submittingRefund}
                    className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingRefund || !refundForm.bookingId || !refundForm.reason}
                    className="flex-1 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                    {submittingRefund ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />}
                    {submittingRefund ? "Submitting..." : "Submit request"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSearchParams((prev) => ({ ...Object.fromEntries(prev), tab: tab.key }))}
              aria-pressed={isActive}
              className={cn(
                "relative -mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-emerald-700" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="finance-tab-underline"
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-emerald-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700">
              <AlertTriangle size={16} /> {error}
              <button onClick={loadData} className="ml-auto underline hover:no-underline">Retry</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* EARNINGS TAB */}
        {activeTab === "earnings" && (
          <motion.div key="earnings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_PILLS.map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setFilterPill(pill.key)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                      filterPill === pill.key
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    )}
                  >
                    {pill.label}
                    {pill.key && (payoutCounts[pill.key] || 0) > 0 && (
                      <span className={cn("ml-1.5 tabular-nums", filterPill === pill.key ? "text-white/70" : "text-slate-400")}>
                        {payoutCounts[pill.key]}
                      </span>
                    )}
                  </button>
                ))}
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
              <Info size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-xs leading-relaxed text-slate-600">
                {isEnrolled
                  ? (nextPayout?.window
                      ? `Earnings for ${nextPayout.window.label} are invoiced automatically — issued ${formatDate(nextPayout.window.invoicedOn)}, paid ${formatDate(nextPayout.window.paidOn)}.`
                      : "Earnings are invoiced automatically on your schedule — the next window's dates appear once bookings join it.")
                  : showSchedule
                  ? `Payouts are generated automatically on your ${(payoutPlan?.scheduleShortLabel || "chosen").toLowerCase()} schedule — the next run is ${formatDate(payoutPlan?.nextRunAt)}.`
                    // Legacy (unmigrated) schedules keep the manual head-start
                    // window: name the date it opens rather than a range. The old
                    // copy printed "between <opens> and <closes>", which for a
                    // 24-hour window that opened and closed on the same day
                    // rendered as "between 05 Oct 2026 and 05 Oct 2026" and read
                    // as a zero-length window that was somehow always open.
                    + (windowInfo?.opensAt && stats.availableTotal > 0 && !inFlightRequest
                        ? ` You can also request one early from ${formatDate(windowInfo.opensAt)}${windowOpen ? "" : `, for 24 hours`}.`
                        : "")
                  : "Payouts can be requested twice monthly during open withdrawal windows."}{" "}
                Bookings with an open refund request are held until it is resolved.
              </p>
            </div>

            {/* Table */}
            {loading ? (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                <div className="p-5 space-y-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                      <div className="h-3 w-32 bg-slate-100 rounded" />
                      <div className="h-3 w-16 bg-slate-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : earnings.length === 0 ? (
              // Two different situations, one of which used to be a lie. An empty
              // *filter* is not an empty ledger: with "Eligible now" as the
              // default, a supplier whose money had already gone into a payout
              // request saw this and was told they had no earnings at all.
              totalBookings === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <DollarSign size={26} className="text-emerald-300" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 mb-1">No earnings yet</h3>
                  <p className="text-sm text-slate-500 max-w-[220px]">Earnings will appear once bookings start coming in.</p>
                </div>
              ) : (
                <div data-testid="earnings-empty-state" className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                    <FilterIcon size={24} className="text-amber-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 mb-1">
                    Nothing {activePillLabel.toLowerCase()} yet
                  </h3>
                  <p className="text-sm text-slate-500 max-w-[340px]">
                    You have {totalBookings} booking{totalBookings === 1 ? "" : "s"} in total — none in this
                    filter. They are here:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    {FILTER_PILLS.filter((p) => p.key && (payoutCounts[p.key] || 0) > 0).map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setFilterPill(p.key)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        {p.label}
                        <span className="tabular-nums">{payoutCounts[p.key]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70">
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Booking</th>
                        <th className="hidden whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Tour</th>
                        <th className="hidden whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Travel date</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="hidden whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Supplier payout</th>
                        <th className="hidden whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Commission</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((e, i) => (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50"
                        >
                          <td className="py-3 px-4">
                            <span className="whitespace-nowrap text-sm font-medium text-emerald-700">{e.bookingNumber}</span>
                          </td>
                          <td className="hidden py-3 px-4 text-sm text-slate-700 sm:table-cell">{e.tour}</td>
                          <td className="hidden py-3 px-4 text-sm text-slate-500 sm:table-cell">{formatDate(e.travelDate)}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <EarningStatusBadge status={e.payoutStatus} />
                              {e.openDispute && (
                                <span className="inline-flex items-center whitespace-nowrap rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700" title={`Refund request ${e.openDispute.disputeNumber}`}>
                                  <AlertTriangle size={11} className="mr-1" /> Refund hold
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden py-3 px-4 text-right text-sm text-slate-500 tabular-nums sm:table-cell">
                            {e.supplierPayout ? formatCurrency(e.supplierPayout, e.currency) : "—"}
                          </td>
                          <td className="hidden py-3 px-4 text-right text-sm text-slate-500 tabular-nums sm:table-cell">
                            {formatCurrency(e.commissionAmount, e.currency)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-bold text-slate-900 tabular-nums">
                            {formatCurrency(e.grossAmount, e.currency)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={earningsPagination} page={page} onPageChange={setPage} />
              </div>
            )}
          </motion.div>
        )}

        {/* PAYOUTS TAB — withdrawal requests */}
        {activeTab === "payouts" && (
          <motion.div key="payouts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
            {/* Platform charges — commission on offline money + cancellation fees */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <XCircle size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Platform charges</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Commission on money you collected offline, and cancellation fees. Open charges are
                    deducted automatically from your next {isEnrolled ? "invoice" : "payout request"}.
                  </p>
                </div>
              </div>

              {charges.error && (
                <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <span>{charges.error}</span>
                  <button onClick={loadCharges} className="ml-auto underline hover:no-underline shrink-0">Retry</button>
                </div>
              )}

              {!charges.loading && !charges.error && charges.openTotals.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {charges.openTotals.map((total) => (
                      <span
                        key={total.currency}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                      >
                        {total.currency} {formatCurrency(total.amount, total.currency)} open
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {(charges.openByReason?.SUPPLIER_COMMISSION || []).filter((t) => t.amount !== 0).map((t) => (
                      <span key={`comm-${t.currency}`}>
                        Commission on collected money: {t.currency} {formatCurrency(t.amount, t.currency)}
                      </span>
                    ))}
                    {(charges.openByReason?.CANCELLATION_FEE || []).filter((t) => t.amount !== 0).map((t) => (
                      <span key={`fee-${t.currency}`}>
                        Cancellation fees: {t.currency} {formatCurrency(t.amount, t.currency)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {charges.loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                      <div className="h-3 w-32 bg-slate-100 rounded" />
                      <div className="h-3 w-16 bg-slate-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              ) : charges.error ? null : charges.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                    <CheckCircle2 size={22} className="text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">No platform charges yet</h4>
                  <p className="text-sm text-slate-500 max-w-[420px]">
                    When you record money collected for a booking, commission is charged on that money.
                    Cancellation fees are recorded here too. Both settle automatically from your next{" "}
                    {isEnrolled ? "invoice" : "payout request"}.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200/80">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70">
                          <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
                          <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Booking number</th>
                          <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                          <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reason</th>
                          <th className="whitespace-nowrap px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                          <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Settled against</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charges.rows.map((charge) => (
                          <tr key={charge.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(charge.createdAt)}</td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-xs font-medium text-emerald-700">{charge.bookingNumber}</span>
                            </td>
                            <td className={`py-3 px-4 text-right text-sm font-semibold tabular-nums whitespace-nowrap ${
                              charge.isCredit ? "text-emerald-600" : "text-red-600"
                            }`}>
                              {charge.isCredit ? "+" : "-"}{formatCurrency(Math.abs(charge.amount), charge.currency)}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-700 max-w-[240px]">
                              <span className="block truncate" title={charge.notes || charge.label}>
                                {charge.label || "—"}
                              </span>
                              {charge.reversalOfId && (
                                <span className="block text-[11px] text-slate-400">Credit for an earlier charge</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center"><ChargeStatusBadge status={charge.status} /></td>
                            <td className="py-3 px-4 text-sm text-slate-500">
                              {charge.invoiceNumber ? (
                                <span className="font-mono text-xs">{charge.invoiceNumber}</span>
                              ) : charge.payoutRequestNumber ? (
                                <span className="font-mono text-xs">{charge.payoutRequestNumber}</span>
                              ) : charge.status === "WAIVED" ? (
                                "Waived"
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Invoices moved to their own tab. Enrolled suppliers still get a
                pointer here so the payout run they are looking at has an
                obvious path to the documents that back it. No count is shown:
                the payouts tab no longer fetches invoices, and a stale or
                missing number would be worse than none. */}
            {isEnrolled && (
              <button
                onClick={() => setSearchParams((prev) => ({ ...Object.fromEntries(prev), tab: "invoices" }))}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 underline hover:no-underline"
              >
                <FileText size={14} />
                See all invoices
              </button>
            )}

            {loading && !isEnrolled ? (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                <div className="p-5 space-y-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-3 w-16 bg-slate-100 rounded" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                      <div className="h-3 w-14 bg-slate-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : payoutRequests.length === 0 ? (
              // Enrolled suppliers are paid via invoices — the empty legacy
              // request table would say nothing true about where their money is.
              isEnrolled ? null : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <Banknote size={26} className="text-emerald-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">No payout requests yet</h3>
                <p className="text-sm text-slate-500 max-w-[260px]">
                  {showSchedule
                    ? "Payouts are generated automatically on your schedule — your next run will appear here."
                    : "Submit a request during an open withdrawal window to receive your earnings."}
                </p>
              </div>
              )
            ) : (
              <>
              {isEnrolled && (
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-white border border-slate-200 rounded-xl">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Legacy payout requests</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Pre-invoice history — read only. New payouts arrive as invoices.</p>
                  </div>
                </div>
              )}
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70">
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Request</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cycle</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bookings</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutRequests.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          id={`finance-row-${r.id}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={cn(
                            "border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50",
                            focusPayoutRequestId === r.id && "bg-emerald-50/60 ring-2 ring-emerald-300",
                          )}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-medium text-emerald-700">{r.requestNumber}</span>
                              {r.autoGenerated && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 text-sky-700">
                                  <RefreshCw size={10} /> Automatic
                                </span>
                              )}
                            </div>
                            {r.reference && (
                              <p className="text-[11px] text-slate-500 mt-0.5">Ref: {r.reference}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">{r.cycleLabel}</td>
                          <td className="py-3 px-4 text-right text-sm text-slate-700 tabular-nums">{r.bookingCount}</td>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(r.amount, r.currency)}</td>
                          <td className="py-3 px-4 text-center"><StatusBadge status={r.status} label={r.status?.replace(/_/g, " ")} size="sm" /></td>
                          <td className="py-3 px-4 text-sm text-slate-500">{formatDate(r.completedAt || r.createdAt)}</td>
                          <td className="py-3 px-4 text-right">
                            {r.status === "PROCESSING" && (
                              <button
                                onClick={() => handleCancelRequest(r.id)}
                                disabled={cancellingRequestId === r.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
                              >
                                {cancellingRequestId === r.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                                Cancel
                              </button>
                            )}
                            {r.status === "REJECTED" && r.rejectedReason && (
                              <span title={r.rejectedReason} className="text-xs text-slate-500 underline decoration-dotted">Reason</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={payoutsPagination} page={page} onPageChange={setPage} />
              </div>
              </>
            )}
          </motion.div>
        )}

        {/* INVOICES TAB — one invoice per payout window (finance v3) */}
        {activeTab === "invoices" && (
          <motion.div key="invoices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
            <InvoicesTab
              invoices={invoices}
              pagination={invoicesPagination}
              loading={loading}
              error={error}
              page={page}
              onPageChange={setPage}
              onRetry={loadData}
              statusFilter={invoiceStatusFilter}
              onStatusFilterChange={setInvoiceStatusFilter}
              isEnrolled={isEnrolled}
              focusInvoiceId={focusInvoiceId}
              onFocusCleared={clearInvoiceFocus}
            />
          </motion.div>
        )}

        {/* REFUNDS TAB — supplier-initiated refund requests */}
        {activeTab === "refunds" && (
          <motion.div key="refunds" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {REFUND_STATUS_FILTERS.map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setDisputeStatusFilter(pill.key)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                      disputeStatusFilter === pill.key
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
              <button
                onClick={openRefundModal}
                className="flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <Plus size={16} />
                Request refund
              </button>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
              <Info size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-xs leading-relaxed text-slate-600">
                If a customer's money should go back (cancellations, force majeure, or a direct request), file a refund request.
                An admin reviews it: approved means the customer is refunded; denied returns the funds to your eligible balance.
              </p>
            </div>

            {loading ? (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                <div className="p-5 space-y-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                      <div className="h-3 w-36 bg-slate-100 rounded" />
                      <div className="h-3 w-16 bg-slate-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : disputes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <Undo2 size={26} className="text-emerald-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">No refund requests</h3>
                <p className="text-sm text-slate-500 max-w-[280px]">Requests you file will appear here while they await review.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70">
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Request</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Booking</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reason</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Refunded</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Filed</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputes.map((d, i) => {
                        const isExpanded = expandedDispute === d.id;
                        const isOpen = d.status === "OPEN" || d.status === "UNDER_REVIEW";
                        return (
                          <Fragment key={d.id}>
                            <motion.tr
                              key={d.id}
                              id={`finance-row-${d.id}`}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              onClick={() => setExpandedDispute(isExpanded ? null : d.id)}
                              className={cn(
                                "border-b border-slate-100 last:border-0 cursor-pointer transition-colors",
                                isExpanded ? "bg-emerald-50/40" : "hover:bg-slate-50",
                                focusDisputeId === d.id && "ring-2 ring-emerald-300",
                              )}
                            >
                              <td className="py-3 px-4">
                                <span className="font-mono text-xs font-medium text-emerald-700">{d.disputeNumber}</span>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-sm font-medium text-slate-700">{d.bookingNumber}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{d.tourTitle}</p>
                              </td>
                              <td className="py-3 px-4">
                                <RefundReasonBadge reason={d.reason} />
                              </td>
                              <td className="py-3 px-4 text-right text-sm tabular-nums">
                                {d.refundAmount != null ? (
                                  <span className="font-semibold text-red-600">-{formatCurrency(d.refundAmount, d.currency)}</span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center"><RefundStatusBadge status={d.status} /></td>
                              <td className="py-3 px-4 text-sm text-slate-500">{formatDate(d.createdAt)}</td>
                              <td className="py-3 px-4 text-right">
                                {isOpen && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleWithdrawRefund(d.id); }}
                                    disabled={withdrawingDisputeId === d.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
                                  >
                                    {withdrawingDisputeId === d.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                                    Withdraw
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                            {isExpanded && (
                              <tr className="border-b border-slate-100 last:border-0 bg-emerald-50/30">
                                <td colSpan={7} className="px-4 pb-4 pt-1">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Travel date</p>
                                      <p className="text-sm font-medium text-slate-700 mt-1">{formatDate(d.travelDate)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Booking total</p>
                                      <p className="text-sm font-medium text-slate-700 mt-1">{formatCurrency(d.grossAmount, d.currency)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</p>
                                      <p className="text-sm font-medium text-slate-700 mt-1">{d.resolvedAt ? formatDate(d.resolvedAt) : "Awaiting review"}</p>
                                    </div>
                                    {d.description && (
                                      <div className="md:col-span-3">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your explanation</p>
                                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{d.description}</p>
                                      </div>
                                    )}
                                    {d.resolution && (
                                      <div className="md:col-span-3">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin decision</p>
                                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{d.resolution}</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={disputesPagination} page={page} onPageChange={setPage} />
              </div>
            )}
          </motion.div>
        )}

        {/* REFUND REQUESTS TAB — customer claims on completed trips */}
        {activeTab === "claims" && (
          <RefundClaimsPage />
        )}


        {/* PAYOUT METHODS TAB */}
        {activeTab === "methods" && (
          <motion.div key="methods" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="space-y-4">
              {/* Section header + add method */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Payout methods</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Where we send your earnings. Add one method per currency.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowMethodForm((v) => !v)}
                  disabled={!canManageMethods}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
                    canManageMethods
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-slate-100 text-slate-400"
                  )}
                >
                  <Plus size={16} />
                  Add method
                </button>
                {/* Visible, not a tooltip: a disabled button emits no pointer
                    events, so the reason has to be on the page. */}
                {!canManageMethods && (
                  <p className="max-w-[260px] text-xs text-slate-500">{DENIED_ACTION_REASON}</p>
                )}
                </div>
              </div>

              <PayoutMethodFormSheet
                open={showMethodForm}
                onClose={() => setShowMethodForm(false)}
                onSubmit={async (payload) => {
                  await createPayoutMethod(payload);
                  toast.success("Payout method added — we'll check it before your first payout.");
                  setShowMethodForm(false);
                  await loadData();
                }}
              />

              {/* Methods List */}
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-slate-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-28 bg-slate-100 rounded" />
                          <div className="h-3 w-44 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : methods.length === 0 && !showMethodForm ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <CreditCard size={26} className="text-emerald-300" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 mb-1">No payout methods</h3>
                  <p className="text-sm text-slate-500 max-w-[220px]">Add a payout method to start receiving payments.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {methods.map((method) => {
                    const isExpanded = expandedMethod === method.id;
                    return (
                      <motion.div
                        key={method.id}
                        layout
                        className={cn(
                          "bg-white border rounded-xl transition-all cursor-pointer overflow-hidden",
                          isExpanded ? "border-slate-300 shadow-sm" : "border-slate-200/80 hover:border-slate-300"
                        )}
                      >
                        <div className="p-5" onClick={() => setExpandedMethod(isExpanded ? null : method.id)}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                isExpanded ? "bg-emerald-100" : "bg-emerald-50"
                              )}>
                                {method.type === "BANK_TRANSFER"
                                  ? <Landmark size={20} className={isExpanded ? "text-emerald-700" : "text-emerald-600"} />
                                  : method.type === "MOBILE_MONEY"
                                    ? <Smartphone size={20} className={isExpanded ? "text-emerald-700" : "text-emerald-600"} />
                                    : <Wallet size={20} className={isExpanded ? "text-emerald-700" : "text-emerald-600"} />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {payoutTypeLabel(method.type)}
                                    <span className="font-normal text-slate-500"> · {method.currency || "USD"}</span>
                                  </p>
                                  {method.isDefault && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 mt-0.5 truncate">
                                  {method.accountName || method.paypalEmail || method.mobileProvider || "—"}
                                  {methodIdentifier(method) && (
                                    <span className="font-mono text-xs"> {methodIdentifier(method)}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                                method.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", method.verified ? "bg-emerald-500" : "bg-amber-500")} />
                                {method.verified ? "Verified" : "Pending"}
                              </div>
                              <ChevronDown size={16} className={cn("text-slate-500 transition-transform duration-200", isExpanded && "rotate-180")} />
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-slate-100 mx-5">
                                <div className="pt-4 pb-5 grid grid-cols-2 gap-y-4 gap-x-6">
                                  {method.type === "BANK_TRANSFER" && (
                                    <>
                                      <DetailRow label="Account Name" value={method.accountName} />
                                      {method.iban && <DetailRow label="IBAN" value={method.iban} mono />}
                                      {method.sortCode && <DetailRow label="Sort Code" value={method.sortCode} mono />}
                                      {method.routingNumber && <DetailRow label="Routing Number" value={method.routingNumber} mono />}
                                      {!method.iban && !method.sortCode && !method.routingNumber && (
                                        <DetailRow label="Account Number" value={method.accountNumber} mono masked />
                                      )}
                                      {method.swiftCode && <DetailRow label="SWIFT / BIC" value={method.swiftCode} mono />}
                                      <DetailRow label="Bank Name" value={method.bankName} />
                                      {method.branchName && <DetailRow label="Bank Branch" value={method.branchName} />}
                                      {method.branchCode && <DetailRow label="Branch Code" value={method.branchCode} mono />}
                                      {method.bankAddress && <DetailRow label="Bank Address" value={method.bankAddress} />}
                                      <DetailRow label="Country" value={countryNameFor(method.bankCountry)} />
                                    </>
                                  )}
                                  {method.type === "MOBILE_MONEY" && (
                                    <>
                                      <DetailRow label="Wallet Holder" value={method.accountName} />
                                      <DetailRow label="Provider" value={method.mobileProvider} />
                                      <DetailRow label="Wallet Number" value={method.mobileNumber} mono />
                                    </>
                                  )}
                                  {method.type === "PAYPAL" && (
                                    <DetailRow label="PayPal Email" value={method.paypalEmail} />
                                  )}
                                  <DetailRow label="Currency" value={method.currency || "USD"} />
                                  {method.createdAt && (
                                    <DetailRow label="Added" value={formatDate(method.createdAt)} />
                                  )}
                                  <div className="col-span-2 flex justify-end pt-2 border-t border-slate-100">
                                    {/* The span keeps the hover alive: a
                                        disabled button swallows pointer events,
                                        so `title` on the button itself would
                                        never render. */}
                                    <span title={canManageMethods ? undefined : DENIED_ACTION_REASON}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteMethod(method.id); }}
                                        disabled={!canManageMethods}
                                        className={cn(
                                          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                                          canManageMethods
                                            ? "text-red-600 hover:bg-red-50"
                                            : "text-slate-400 cursor-not-allowed"
                                        )}
                                      >
                                        <Trash2 size={14} />
                                        Remove method
                                      </button>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "GH" → "Ghana", falling back to whatever was stored. */
function countryNameFor(code) {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code)?.name || code;
}

/** "BANK_TRANSFER" → "Bank transfer", not "BANK TRANSFER". */
function payoutTypeLabel(type) {
  return PAYOUT_METHOD_TYPES.find((t) => t.value === type)?.label || String(type || "—").replace(/_/g, " ").toLowerCase();
}

/**
 * The masked identifier for a saved method, so the collapsed row says *which*
 * account it is without printing the account number.
 */
function methodIdentifier(method) {
  if (method.type === "PAYPAL") return "";
  const identifier = method.iban || method.sortCode || method.routingNumber
    || method.accountNumber || method.mobileNumber;
  return maskTail(identifier);
}

/**
 * One label/value pair in the expanded method panel. Identifiers are masked by
 * default with a reveal on click — a saved bank number is not something that
 * should be readable over someone's shoulder.
 */
function DetailRow({ label, value, mono, masked }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return null;

  const display = masked && !revealed ? maskTail(value) : value;

  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      {masked ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setRevealed((v) => !v); }}
          aria-label={revealed ? `Hide ${label}` : `Show full ${label}`}
          className="mt-1 flex items-center gap-1.5 text-left font-mono text-sm font-medium text-slate-700 hover:text-emerald-700"
        >
          <span className="truncate">{display}</span>
          {revealed ? <EyeOff size={13} className="shrink-0 text-slate-500" /> : <Eye size={13} className="shrink-0 text-slate-500" />}
        </button>
      ) : (
        <p className={cn("mt-1 truncate text-sm font-medium text-slate-700", mono && "font-mono")}>{value}</p>
      )}
    </div>
  );
}

// Status badge for the booking payout lifecycle
function EarningStatusBadge({ status }) {
  const styles = {
    "ELIGIBLE": { bg: "bg-emerald-50", text: "text-emerald-700", label: "Eligible" },
    "PENDING": { bg: "bg-amber-50", text: "text-amber-700", label: "Clearing" },
    "REQUESTED": { bg: "bg-sky-50", text: "text-sky-700", label: "Requested" },
    "PAID": { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" },
    "DISPUTED": { bg: "bg-red-50", text: "text-red-700", label: "On hold" },
    "CANCELLED": { bg: "bg-slate-100", text: "text-slate-600", label: "Cancelled" },
    "FAILED": { bg: "bg-red-50", text: "text-red-700", label: "Failed" },
  };

  const style = styles[status] || styles["PENDING"];

  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-medium", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

// Badge for the cancellation-fee ledger (25%, netted off the next payout)
function ChargeStatusBadge({ status }) {
  const styles = {
    "OPEN": { bg: "bg-amber-50", text: "text-amber-700", label: "Open" },
    "SETTLED": { bg: "bg-emerald-50", text: "text-emerald-700", label: "Settled" },
    "WAIVED": { bg: "bg-slate-100", text: "text-slate-500", label: "Waived" },
  };

  const style = styles[status] || styles["OPEN"];

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium whitespace-nowrap", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

// Badge for supplier refund request lifecycle
function RefundStatusBadge({ status }) {
  const styles = {
    "OPEN": { bg: "bg-amber-50", text: "text-amber-700", label: "Open" },
    "UNDER_REVIEW": { bg: "bg-sky-50", text: "text-sky-700", label: "Under review" },
    "RESOLVED_CUSTOMER": { bg: "bg-red-50", text: "text-red-700", label: "Refunded" },
    "RESOLVED_SUPPLIER": { bg: "bg-emerald-50", text: "text-emerald-700", label: "Denied" },
    "WITHDRAWN": { bg: "bg-slate-100", text: "text-slate-500", label: "Withdrawn" },
  };

  const style = styles[status] || styles["OPEN"];

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium whitespace-nowrap", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

function RefundReasonBadge({ reason }) {
  const labels = {
    OPERATIONAL: "Operational",
    FORCE_MAJEURE: "Force majeure",
    CUSTOMER_REQUESTED: "Customer asked",
    OTHER: "Other",
  };

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
      {labels[reason] || reason}
    </span>
  );
}
