import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  DollarSign, Wallet, CreditCard, Loader2, RefreshCw, Plus, Trash2,
  TrendingUp, Building2, Landmark,
  CheckCircle2, AlertTriangle, X, ChevronDown, ChevronLeft, ChevronRight, Banknote,
  Calendar, Info, Search, Lock, XCircle, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  cancelPayoutRequest, createPayoutMethod, createPayoutRequest, createRefundRequest, deletePayoutMethod,
  fetchFinanceDisputes, fetchFinanceEarnings, fetchFinanceSummary, fetchPayoutMethods, fetchPayoutRequests,
  withdrawRefundRequest,
} from "../api";
import { getAuthToken } from "@/stores/authStore";
import { validatePayoutMethod } from "../utils/validatePayoutMethod";

const TABS = [
  { key: "earnings", label: "Earnings", icon: DollarSign },
  { key: "payouts", label: "Payouts", icon: Banknote },
  { key: "refunds", label: "Refunds", icon: Undo2 },
  { key: "methods", label: "Payout Methods", icon: CreditCard },
];

const FILTER_PILLS = [
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

const METHOD_TYPES = [
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2, desc: "Direct bank deposit" },
  { value: "PAYPAL", label: "PayPal", icon: Wallet, desc: "Online payment platform" },
];

const INITIAL_METHOD_FORM = {
  type: "BANK_TRANSFER", accountName: "", accountNumber: "", bankName: "", bankCountry: "",
  branchName: "", branchCode: "",
  mobileProvider: "", mobileNumber: "", paypalEmail: "", currency: "USD",
};

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
          selected ? "border-gray-200" : "border-gray-200 text-gray-400"
        )}
      >
        {selected ? (
          <span className="min-w-0">
            <span className="block font-medium text-gray-900 truncate">{selected.bookingNumber}</span>
            <span className="block text-xs text-gray-500 truncate">
              {selected.tour} · {formatCurrency(selected.grossAmount, selected.currency)}
            </span>
          </span>
        ) : (
          <span>Select a booking…</span>
        )}
        <ChevronDown size={16} className={cn("text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={style}
          className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden flex flex-col z-[60]"
        >
          <div className="p-2 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search booking #, tour or customer…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">No bookings match “{query.trim()}”</p>
            ) : (
              filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onChange(b.id); setOpen(false); setQuery(""); }}
                  className={cn(
                    "w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors",
                    value === b.id && "bg-emerald-50"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{b.bookingNumber}</span>
                    <span className="text-sm font-semibold text-gray-700 shrink-0 tabular-nums">
                      {formatCurrency(b.grossAmount, b.currency)}
                    </span>
                  </span>
                  <span className="block text-xs text-gray-500 truncate">
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
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/60">
      <p className="text-xs text-gray-500">
        Page {current} of {pagination.totalPages} · {pagination.totalCount ?? "?"} record(s)
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={13} /> Previous
        </button>
        <button
          disabled={current >= pagination.totalPages}
          onClick={() => onPageChange(current + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "earnings";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [methods, setMethods] = useState([]);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [methodForm, setMethodForm] = useState(INITIAL_METHOD_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [savingMethod, setSavingMethod] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [filterPill, setFilterPill] = useState("ELIGIBLE");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [disputeStatusFilter, setDisputeStatusFilter] = useState("");
  const [expandedDispute, setExpandedDispute] = useState(null);
  const [withdrawingDisputeId, setWithdrawingDisputeId] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState(INITIAL_REFUND_FORM);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [eligibleBookings, setEligibleBookings] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [page, setPage] = useState(1);
  const [earningsPagination, setEarningsPagination] = useState(null);
  const [payoutsPagination, setPayoutsPagination] = useState(null);
  const [disputesPagination, setDisputesPagination] = useState(null);

  const loadData = useCallback(async () => {
    if (!getAuthToken()) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const summaryResult = await fetchFinanceSummary().catch(() => null);
      setSummary(summaryResult);

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
      } else if (activeTab === "refunds") {
        const result = await fetchFinanceDisputes({
          page,
          limit: PAGE_SIZE,
          ...(disputeStatusFilter ? { status: disputeStatusFilter } : {}),
        });
        setDisputes(result.disputes || []);
        setDisputesPagination(result.pagination || null);
      } else {
        const result = await fetchPayoutMethods();
        setMethods(result);
      }
    } catch (err) {
      if (err.code === "AUTH_REQUIRED") return;
      setError(err.response?.data?.message || err.message || "Failed to load finance data");
    } finally { setLoading(false); }
  }, [activeTab, disputeStatusFilter, filterPill, page]);

  // Reset to the first page whenever the tab or refund filter changes
  useEffect(() => { setPage(1); }, [activeTab, disputeStatusFilter, filterPill]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadData();
    });
    return () => { cancelled = true; };
  }, [loadData]);

  const handleAddMethod = async (e) => {
    e.preventDefault(); setSavingMethod(true);
    try {
      const { ok, errors } = validatePayoutMethod(methodForm);
      if (!ok) {
        setFormErrors(errors);
        const firstField = Object.keys(errors)[0];
        toast.error(errors[firstField]);
        return;
      }
      const payload = { type: methodForm.type, currency: methodForm.currency };
      if (methodForm.type === "BANK_TRANSFER") {
        Object.assign(payload, { accountName: methodForm.accountName, accountNumber: methodForm.accountNumber, bankName: methodForm.bankName, bankCountry: methodForm.bankCountry, branchName: methodForm.branchName || null, branchCode: methodForm.branchCode || null });
      } else { payload.paypalEmail = methodForm.paypalEmail; }
      await createPayoutMethod(payload);
      toast.success("Payout method added");
      setShowMethodForm(false);
      setMethodForm(INITIAL_METHOD_FORM);
      setFormErrors({});
      await loadData();
    } catch (err) {
      const serverMessage = err.response?.data?.message || "Failed to add payout method";
      const match = String(serverMessage).match(/^body\.(\w+):\s*(.*)$/);
      if (match && match[1] !== "type") {
        setFormErrors((prev) => ({ ...prev, [match[1]]: match[2] }));
      } else {
        toast.error(serverMessage);
      }
    } finally { setSavingMethod(false); }
  };

  const handleDeleteMethod = async (id) => {
    if (!confirm("Delete this payout method?")) return;
    try {
      await deletePayoutMethod(id);
      toast.success("Payout method deleted");
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete payout method");
    }
  };

  const clearError = (field) => setFormErrors((p) => ({ ...p, [field]: undefined }));

  // Compute stats from the finance v2 summary endpoint
  const stats = useMemo(() => {
    const available = Number(summary?.availableBalance?.amount) || 0;
    const pending = Number(summary?.pendingClearance?.amount) || 0;
    const inReview = Number(summary?.inReview?.total) || 0;
    const paidOut = Number(summary?.paidOut?.total) || 0;
    return { available, pending, inReview, paidOut };
  }, [summary]);

  const windowInfo = summary?.withdrawalWindow || null;
  const windowOpen = Boolean(windowInfo?.open);
  const canRequestPayout = windowOpen && stats.available > 0;

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
      await createPayoutRequest({});
      toast.success("Payout request submitted for review");
      setShowRequestModal(false);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit payout request");
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
      toast.error(err.response?.data?.message || "Failed to cancel payout request");
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
      toast.error(err.response?.data?.message || "Failed to submit refund request");
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
      toast.error(err.response?.data?.message || "Failed to withdraw refund request");
    } finally { setWithdrawingDisputeId(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-1 h-9 bg-emerald-500 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track earnings, payout cycles, and payment methods</p>
          </div>
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available for payout */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Available for payout</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.available)}</p>
              {summary?.availableBalance?.bookingCount > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{summary.availableBalance.bookingCount} booking(s)</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign size={20} className="text-emerald-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Pending clearance */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending clearance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.pending)}</p>
              {summary?.pendingClearance?.clearanceBufferDays > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">+{summary.pendingClearance.clearanceBufferDays}d buffer</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Loader2 size={20} className="text-emerald-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* In review */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">In review</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.inReview)}</p>
              {summary?.inReview?.requestCount > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{summary.inReview.requestCount} request(s)</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Paid out */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Paid out</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.paidOut)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500" />
        </div>
      </div>

      {/* Payout Cycle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current Payout Cycle */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-white">
              <Calendar size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Current payout cycle</p>
              <p className="text-xl font-bold text-gray-900">{cycleInfo.current || "—"}</p>
              <div className="flex items-center gap-2 mt-1">
                {windowOpen ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                    Withdrawal window open until {formatDate(windowInfo.closesAt)}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                    Window closed · opens {cycleInfo.requestWindow || "soon"}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Only completed bookings past their travel date are eligible.</p>
            </div>
          </div>
          <button
            onClick={() => setShowRequestModal(true)}
            disabled={!canRequestPayout}
            title={!windowOpen ? "The withdrawal window is currently closed" : stats.available <= 0 ? "No eligible earnings yet" : ""}
            className={cn(
              "flex items-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap",
              canRequestPayout
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {!windowOpen && <Lock size={15} />}
            Request payout · {formatCurrency(stats.available)}
          </button>
        </div>

        {/* Next Cycle */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-white shrink-0">
            <div className="relative">
              <Calendar size={24} className="text-emerald-500" />
              <ChevronRight size={14} className="text-emerald-500 absolute -right-1 -bottom-0.5" />
            </div>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">Accumulating</p>
            <p className="text-sm text-gray-500 mt-0.5">
              <span>{summary?.pendingClearance?.bookingCount || 0} booking(s) clearing · </span>
              <span className="font-semibold text-emerald-500">{formatCurrency(stats.pending)} pending</span>
            </p>
          </div>
        </div>
      </div>

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
                <button onClick={() => setShowRequestModal(false)} disabled={submittingRequest}
                  className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Request payout</h3>
              <p className="text-sm text-gray-500 mt-1">
                This bundles all your eligible bookings into a withdrawal request for review.
              </p>
              <div className="mt-4 space-y-2.5 bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-gray-900">{formatCurrency(stats.available)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bookings included</span>
                  <span className="font-medium text-gray-700">{summary?.availableBalance?.bookingCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cycle</span>
                  <span className="font-medium text-gray-700">{windowInfo?.cycleLabel || "—"}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowRequestModal(false)} disabled={submittingRequest}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  Cancel
                </button>
                <button onClick={handleRequestPayout} disabled={submittingRequest}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
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
                    className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Request a refund</h3>
                <p className="text-sm text-gray-500 mt-1">
                  An admin will review your request. While it is open, the booking's funds are on hold.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking</label>
                    {loadingEligible ? (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
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
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <p className={cn(
                            "text-sm font-semibold",
                            refundForm.reason === r.value ? "text-emerald-800" : "text-gray-700"
                          )}>{r.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Explanation <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add context that helps the reviewer decide: what happened, what the customer asked for…"
                      value={refundForm.description}
                      onChange={(e) => setRefundForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={() => setShowRefundModal(false)} disabled={submittingRefund}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingRefund || !refundForm.bookingId || !refundForm.reason}
                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
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
      <div className="flex items-center gap-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSearchParams((prev) => ({ ...Object.fromEntries(prev), tab: tab.key }))}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
                isActive
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon size={16} />
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
            <div className="flex items-center gap-2">
              {FILTER_PILLS.map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setFilterPill(pill.key)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                      filterPill === pill.key
                        ? "bg-emerald-500 text-white"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
            </div>

            {/* Info Banner */}
            <div className="flex items-center gap-2.5 p-3 bg-teal-50 rounded-lg">
              <Info size={16} className="text-teal-600 shrink-0" />
              <p className="text-sm text-teal-700">Payouts can be requested twice monthly during open withdrawal windows. Bookings with an open refund request are held until it is resolved.</p>
            </div>

            {/* Table */}
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-5 space-y-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-3 w-20 bg-gray-100 rounded" />
                      <div className="h-3 w-32 bg-gray-100 rounded" />
                      <div className="h-3 w-16 bg-gray-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : earnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-gray-200 rounded-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <DollarSign size={26} className="text-emerald-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">No earnings yet</h3>
                <p className="text-sm text-gray-400 max-w-[220px]">Earnings will appear once bookings start coming in.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tour</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Travel Date</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier Payout</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((e, i) => (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-emerald-600">{e.bookingNumber}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">{e.tour}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">{formatDate(e.travelDate)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <EarningStatusBadge status={e.payoutStatus} />
                              {e.openDispute && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700" title={`Refund request ${e.openDispute.disputeNumber}`}>
                                  <AlertTriangle size={11} className="mr-1" /> Refund hold
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-500 tabular-nums">
                            {e.supplierPayout ? formatCurrency(e.supplierPayout, e.currency) : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-500 tabular-nums">
                            {formatCurrency(e.commissionAmount, e.currency)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-bold text-gray-900 tabular-nums">
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
          <motion.div key="payouts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-5 space-y-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-3 w-16 bg-gray-100 rounded" />
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                      <div className="h-3 w-14 bg-gray-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : payoutRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-gray-200 rounded-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <Banknote size={26} className="text-emerald-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">No payout requests yet</h3>
                <p className="text-sm text-gray-400 max-w-[260px]">Submit a request during an open withdrawal window to receive your earnings.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Request</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cycle</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookings</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutRequests.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-medium text-emerald-600">{r.requestNumber}</span>
                            {r.reference && (
                              <p className="text-[11px] text-gray-400 mt-0.5">Ref: {r.reference}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">{r.cycleLabel}</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-700 tabular-nums">{r.bookingCount}</td>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(r.amount, r.currency)}</td>
                          <td className="py-3 px-4 text-center"><StatusBadge status={r.status} label={r.status?.replace(/_/g, " ")} size="sm" /></td>
                          <td className="py-3 px-4 text-sm text-gray-500">{formatDate(r.completedAt || r.createdAt)}</td>
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
                              <span title={r.rejectedReason} className="text-xs text-gray-400 underline decoration-dotted">Reason</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={payoutsPagination} page={page} onPageChange={setPage} />
              </div>
            )}
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
                      "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                      disputeStatusFilter === pill.key
                        ? "bg-emerald-500 text-white"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
              <button
                onClick={openRefundModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
              >
                <Plus size={16} />
                Request refund
              </button>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-teal-50 rounded-lg">
              <Info size={16} className="text-teal-600 shrink-0" />
              <p className="text-sm text-teal-700">
                If a customer's money should go back (cancellations, force majeure, or a direct request), file a refund request.
                An admin reviews it: approved means the customer is refunded; denied returns the funds to your eligible balance.
              </p>
            </div>

            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-5 space-y-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                      <div className="h-3 w-36 bg-gray-100 rounded" />
                      <div className="h-3 w-16 bg-gray-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : disputes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-gray-200 rounded-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <Undo2 size={26} className="text-emerald-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">No refund requests</h3>
                <p className="text-sm text-gray-400 max-w-[280px]">Requests you file will appear here while they await review.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Request</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Refunded</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Filed</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
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
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              onClick={() => setExpandedDispute(isExpanded ? null : d.id)}
                              className={cn(
                                "border-b border-gray-100 last:border-0 cursor-pointer transition-colors",
                                isExpanded ? "bg-emerald-50/40" : "hover:bg-gray-50"
                              )}
                            >
                              <td className="py-3 px-4">
                                <span className="font-mono text-xs font-medium text-emerald-600">{d.disputeNumber}</span>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-sm font-medium text-gray-700">{d.bookingNumber}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{d.tourTitle}</p>
                              </td>
                              <td className="py-3 px-4">
                                <RefundReasonBadge reason={d.reason} />
                              </td>
                              <td className="py-3 px-4 text-right text-sm tabular-nums">
                                {d.refundAmount != null ? (
                                  <span className="font-semibold text-red-600">-{formatCurrency(d.refundAmount, d.currency)}</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center"><RefundStatusBadge status={d.status} /></td>
                              <td className="py-3 px-4 text-sm text-gray-500">{formatDate(d.createdAt)}</td>
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
                              <tr className="border-b border-gray-100 last:border-0 bg-emerald-50/30">
                                <td colSpan={7} className="px-4 pb-4 pt-1">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Travel date</p>
                                      <p className="text-sm font-medium text-gray-700 mt-1">{formatDate(d.travelDate)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Booking total</p>
                                      <p className="text-sm font-medium text-gray-700 mt-1">{formatCurrency(d.grossAmount, d.currency)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resolved</p>
                                      <p className="text-sm font-medium text-gray-700 mt-1">{d.resolvedAt ? formatDate(d.resolvedAt) : "Awaiting review"}</p>
                                    </div>
                                    {d.description && (
                                      <div className="md:col-span-3">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your explanation</p>
                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{d.description}</p>
                                      </div>
                                    )}
                                    {d.resolution && (
                                      <div className="md:col-span-3">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin decision</p>
                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{d.resolution}</p>
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

        {/* PAYOUT METHODS TAB */}
        {activeTab === "methods" && (
          <motion.div key="methods" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="space-y-4">
              {/* Add Method Button */}
              <div className="flex items-center justify-end">
                <button
                  onClick={() => { setShowMethodForm((v) => !v); if (showMethodForm) setExpandedMethod(null); }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    showMethodForm
                      ? "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                  )}
                >
                  {showMethodForm ? <X size={16} /> : <Plus size={16} />}
                  {showMethodForm ? "Cancel" : "Add Method"}
                </button>
              </div>

              {/* Method Form */}
              <AnimatePresence>
                {showMethodForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <form onSubmit={handleAddMethod} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <CreditCard size={20} className="text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">New Payout Method</h3>
                          <p className="text-sm text-gray-500">Choose your preferred payout type</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {METHOD_TYPES.map((t) => {
                          const Icon = t.icon;
                          return (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => setMethodForm((prev) => ({ ...prev, type: t.value }))}
                              className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
                                methodForm.type === t.value
                                  ? "border-emerald-500 bg-emerald-50"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                methodForm.type === t.value ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                              )}>
                                <Icon size={20} />
                              </div>
                              <div>
                                <p className={cn(
                                  "text-sm font-semibold",
                                  methodForm.type === t.value ? "text-emerald-800" : "text-gray-700"
                                )}>{t.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {methodForm.type === "BANK_TRANSFER" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
                            <input placeholder="e.g. John Doe" value={methodForm.accountName} onChange={(e) => { setMethodForm((p) => ({ ...p, accountName: e.target.value })); clearError("accountName"); }}
                              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
                            {formErrors.accountName && <p className="mt-1 text-xs text-red-600">{formErrors.accountName}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
                            <input placeholder="e.g. 1234567890" value={methodForm.accountNumber} onChange={(e) => { setMethodForm((p) => ({ ...p, accountNumber: e.target.value })); clearError("accountNumber"); }}
                              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
                            {formErrors.accountNumber && <p className="mt-1 text-xs text-red-600">{formErrors.accountNumber}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
                            <input placeholder="e.g. Barclays" value={methodForm.bankName} onChange={(e) => { setMethodForm((p) => ({ ...p, bankName: e.target.value })); clearError("bankName"); }}
                              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
                            {formErrors.bankName && <p className="mt-1 text-xs text-red-600">{formErrors.bankName}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Branch <span className="font-normal text-gray-400">(optional)</span></label>
                            <input placeholder="e.g. Oxford Circus" value={methodForm.branchName} onChange={(e) => { setMethodForm((p) => ({ ...p, branchName: e.target.value })); clearError("branchName"); }}
                              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
                            {formErrors.branchName && <p className="mt-1 text-xs text-red-600">{formErrors.branchName}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch Code <span className="font-normal text-gray-400">(optional)</span></label>
                            <input placeholder="e.g. 20-33-44" value={methodForm.branchCode} onChange={(e) => { setMethodForm((p) => ({ ...p, branchCode: e.target.value })); clearError("branchCode"); }}
                              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
                            {formErrors.branchCode && <p className="mt-1 text-xs text-red-600">{formErrors.branchCode}</p>}
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                            <input placeholder="e.g. GH" value={methodForm.bankCountry} onChange={(e) => { setMethodForm((p) => ({ ...p, bankCountry: e.target.value })); clearError("bankCountry"); }}
                              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
                            {formErrors.bankCountry && <p className="mt-1 text-xs text-red-600">{formErrors.bankCountry}</p>}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">PayPal Email</label>
                          <input type="email" placeholder="e.g. name@example.com" value={methodForm.paypalEmail} onChange={(e) => { setMethodForm((p) => ({ ...p, paypalEmail: e.target.value })); clearError("paypalEmail"); }}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
                          {formErrors.paypalEmail && <p className="mt-1 text-xs text-red-600">{formErrors.paypalEmail}</p>}
                        </div>
                      )}

                      <button type="submit" disabled={savingMethod}
                        className="w-full py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {savingMethod ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {savingMethod ? "Saving..." : "Save Payout Method"}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Methods List */}
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-28 bg-gray-100 rounded" />
                          <div className="h-3 w-44 bg-gray-100 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : methods.length === 0 && !showMethodForm ? (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-gray-200 rounded-xl">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                    <CreditCard size={26} className="text-emerald-300" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-700 mb-1">No payout methods</h3>
                  <p className="text-sm text-gray-400 max-w-[220px]">Add a payout method to start receiving payments.</p>
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
                          isExpanded ? "border-emerald-300 shadow-md" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        )}
                      >
                        <div className="p-5" onClick={() => setExpandedMethod(isExpanded ? null : method.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                isExpanded ? "bg-emerald-100" : "bg-emerald-50"
                              )}>
                                {method.type === "BANK_TRANSFER"
                                  ? <Landmark size={20} className={isExpanded ? "text-emerald-700" : "text-emerald-600"} />
                                  : <Wallet size={20} className={isExpanded ? "text-emerald-700" : "text-emerald-600"} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2.5">
                                  <p className="text-sm font-semibold text-gray-900">{method.type?.replace(/_/g, " ")}</p>
                                  {method.isDefault && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {method.accountName || method.paypalEmail || method.mobileProvider || "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                                method.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", method.verified ? "bg-emerald-500" : "bg-amber-500")} />
                                {method.verified ? "Verified" : "Pending"}
                              </div>
                              <ChevronDown size={16} className={cn("text-gray-400 transition-transform duration-200", isExpanded && "rotate-180")} />
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
                              <div className="border-t border-gray-100 mx-5">
                                <div className="pt-4 pb-5 grid grid-cols-2 gap-y-4 gap-x-6">
                                  {method.type === "BANK_TRANSFER" && (
                                    <>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Name</p>
                                        <p className="text-sm font-medium text-gray-700 mt-1">{method.accountName || "—"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Number</p>
                                        <p className="text-sm font-medium text-gray-700 mt-1 font-mono">{method.accountNumber || "—"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bank Name</p>
                                        <p className="text-sm font-medium text-gray-700 mt-1">{method.bankName || "—"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bank Branch</p>
                                        <p className="text-sm font-medium text-gray-700 mt-1">{method.branchName || "—"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Branch Code</p>
                                        <p className="text-sm font-medium text-gray-700 mt-1">{method.branchCode || "—"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Country</p>
                                        <p className="text-sm font-medium text-gray-700 mt-1">{method.bankCountry || method.country || "—"}</p>
                                      </div>
                                    </>
                                  )}
                                  {method.type === "PAYPAL" && (
                                    <div className="col-span-2">
                                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">PayPal Email</p>
                                      <p className="text-sm font-medium text-gray-700 mt-1">{method.paypalEmail || "—"}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Currency</p>
                                    <p className="text-sm font-medium text-gray-700 mt-1">{method.currency || "USD"}</p>
                                  </div>
                                  {method.createdAt && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Added</p>
                                      <p className="text-sm font-medium text-gray-700 mt-1">{formatDate(method.createdAt)}</p>
                                    </div>
                                  )}
                                  <div className="col-span-2 flex justify-end pt-2 border-t border-gray-100">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteMethod(method.id); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={14} />
                                      Remove method
                                    </button>
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

// Status badge for the booking payout lifecycle
function EarningStatusBadge({ status }) {
  const styles = {
    "ELIGIBLE": { bg: "bg-emerald-50", text: "text-emerald-700", label: "Eligible" },
    "PENDING": { bg: "bg-amber-50", text: "text-amber-700", label: "Clearing" },
    "REQUESTED": { bg: "bg-sky-50", text: "text-sky-700", label: "Requested" },
    "PAID": { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" },
    "DISPUTED": { bg: "bg-red-50", text: "text-red-700", label: "On hold" },
    "CANCELLED": { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelled" },
    "FAILED": { bg: "bg-red-50", text: "text-red-700", label: "Failed" },
  };

  const style = styles[status] || styles["PENDING"];

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium", style.bg, style.text)}>
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
    "WITHDRAWN": { bg: "bg-gray-100", text: "text-gray-500", label: "Withdrawn" },
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
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
      {labels[reason] || reason}
    </span>
  );
}
