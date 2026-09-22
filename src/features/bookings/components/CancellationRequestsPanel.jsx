import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarX2,
  ExternalLink,
  Loader2,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { fetchCancellationRequests, withdrawCancellationRequest } from "../api";
import { cancellationRequestStatusLabel } from "../lib/cancellationReasons";
import { WithdrawCancellationButton } from "./PendingCancellationBadge";

const STATUS_FILTERS = [
  { key: "PENDING_APPROVAL", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
  { key: "SUPERSEDED", label: "Superseded" },
  { key: "ALL", label: "All" },
];

const STATUS_CHIP = {
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVING: "bg-sky-50 text-sky-700 border-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  WITHDRAWN: "bg-slate-100 text-slate-600 border-slate-200",
  SUPERSEDED: "bg-slate-100 text-slate-600 border-slate-200",
};

function humanizeCode(code) {
  if (!code) return "—";
  return String(code)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function RequestRow({ request, onWithdraw }) {
  const booking = request.booking || {};
  const tour = request.tour || {};
  const payload = request.payload || {};
  const preview = request.preview || {};
  const currency = booking.currency || "USD";
  const isPending = request.status === "PENDING_APPROVAL";
  const refund = preview.refund || {};
  const fee = Number(preview.fee) || 0;
  const blockedDates = Array.isArray(request.blockedDates)
    ? request.blockedDates
    : [];

  return (
    <div
      data-testid="cancellation-request-row"
      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {tour.title || "Tour"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-mono text-[11px] text-slate-600">
              {booking.bookingNumber || "—"}
            </span>
            <span className="text-slate-300">·</span>
            <span>Travel {formatDateTime(booking.travelDate)}</span>
            <span className="text-slate-300">·</span>
            <span>Requested {formatDateTime(request.createdAt)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              STATUS_CHIP[request.status] ||
              "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {cancellationRequestStatusLabel(request.status)}
          </span>
          {isPending && (
            <WithdrawCancellationButton
              requestId={request.id}
              onWithdraw={onWithdraw}
            />
          )}
        </div>
      </div>

      {/* Structured reason */}
      <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200/60 p-3 text-xs text-slate-600 space-y-1">
        <p>
          <span className="font-medium text-slate-800">Reason: </span>
          {humanizeCode(payload.cancellationCode)}
          {payload.cancellationCategory && (
            <span className="text-slate-400">
              {" "}
              ({humanizeCode(payload.cancellationCategory)})
            </span>
          )}
        </p>
        {payload.explanation && (
          <p className="text-slate-500 leading-relaxed">
            {payload.explanation}
          </p>
        )}
        {payload.evidenceUrl && (
          <a
            href={payload.evidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#044b3b] hover:underline"
          >
            Evidence <ExternalLink size={11} />
          </a>
        )}
        {typeof payload.customerRefundAgreed === "boolean" && (
          <p>
            <span className="font-medium text-slate-800">
              Customer refund agreed:{" "}
            </span>
            {payload.customerRefundAgreed ? "Yes" : "No"}
          </p>
        )}
      </div>

      {/* Preview + stop-selling */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
        <span>
          Preview refund:{" "}
          <span className="font-semibold text-slate-800">
            {formatCurrency(Number(refund.amount) || 0, currency)}
          </span>
          {refund.note ? <span className="text-slate-400"> · {refund.note}</span> : null}
        </span>
        <span>
          Fee:{" "}
          <span className="font-semibold text-slate-800">
            {fee > 0 ? formatCurrency(fee, currency) : "None"}
          </span>
        </span>
        {request.stopSellingApplied && (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <Ban size={12} className="shrink-0" />
            Stop-selling applied
            {blockedDates.length > 0 ? ` (${blockedDates.length} dates)` : ""}
          </span>
        )}
      </div>

      {/* Decision */}
      {(request.decidedAt || request.decisionNote) && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-0.5">
          {request.decidedAt && (
            <p>
              <span className="font-medium text-slate-800">Decided: </span>
              {formatDateTime(request.decidedAt)}
              {request.decidedBy?.name ? ` by ${request.decidedBy.name}` : ""}
            </p>
          )}
          {request.decisionNote && (
            <p>
              <span className="font-medium text-slate-800">Note: </span>
              {request.decisionNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Supplier-facing list of admin-approval cancellation requests. Shows the
 * structured reason, preview refund/fee, stop-selling state and the admin
 * decision, with Withdraw on still-pending rows.
 */
export default function CancellationRequestsPanel({ onWithdrawn }) {
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await fetchCancellationRequests({
          status,
          page: 1,
          limit: 50,
        });
        setRequests(result.requests);
        setPendingCount(result.pendingCount);
      } catch (err) {
        if (!silent) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load cancellation requests"
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [status]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleWithdraw = useCallback(
    async (id) => {
      try {
        const response = await withdrawCancellationRequest(id);
        const reverted = response.data?.data?.revertedDates;
        toast.success(
          reverted
            ? `Request withdrawn — ${reverted} date${reverted === 1 ? "" : "s"} re-opened`
            : "Cancellation request withdrawn"
        );
        await load();
        onWithdrawn?.();
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error(
            "This request was already decided and can no longer be withdrawn."
          );
          await load();
          onWithdrawn?.();
          return;
        }
        toast.error(
          err.response?.data?.message || "Failed to withdraw the request"
        );
        throw err;
      }
    },
    [load, onWithdrawn]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              status === tab.key
                ? "bg-[#044b3b] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-emerald-50/40"
            }`}
          >
            {tab.label}
            {tab.key === "PENDING_APPROVAL" && pendingCount > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  status === tab.key
                    ? "bg-white/20"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-100/60 bg-white text-xs font-medium text-slate-600 hover:bg-emerald-50/40 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RotateCw size={13} />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-3"
            >
              <div className="h-4 w-48 bg-slate-100 rounded" />
              <div className="h-3 w-64 bg-slate-100 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-emerald-100/60">
          <div className="w-14 h-14 rounded-full bg-emerald-50/40 flex items-center justify-center mb-4">
            <CalendarX2 size={24} className="text-slate-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            No cancellation requests
          </p>
          <p className="text-xs text-slate-500">
            {status === "PENDING_APPROVAL"
              ? "Nothing is waiting on admin approval right now."
              : "Requests will appear here once you submit a cancellation."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              onWithdraw={handleWithdraw}
            />
          ))}
        </div>
      )}
    </div>
  );
}
