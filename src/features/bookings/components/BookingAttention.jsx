import { useState } from "react";
import {
  Loader2,
  Mail,
  RefreshCw,
  RotateCw,
  MessageCircle,
} from "lucide-react";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { newPaymentLinkIdempotencyKey } from "../api";

/**
 * Persistent, accessible booking attention.
 *
 * The object comes from the server projection. This component does not infer
 * payment state from `PENDING`, a toast, or a locally remembered click. It only
 * renders the persisted code/reason and the actions the server says are allowed.
 */

const LEVEL_META = {
  ACTION_REQUIRED: {
    label: "Action needed",
    badge: "bg-amber-50 text-amber-800 border-amber-300",
    dot: "bg-amber-500",
    panel: "border-amber-200 bg-amber-50/60",
    title: "text-amber-950",
  },
  WARNING: {
    label: "Needs attention",
    badge: "bg-amber-50 text-amber-800 border-amber-300",
    dot: "bg-amber-500",
    panel: "border-amber-200 bg-amber-50/50",
    title: "text-amber-950",
  },
  CRITICAL: {
    label: "Unavailable",
    badge: "bg-red-50 text-red-700 border-red-300",
    dot: "bg-red-500",
    panel: "border-red-200 bg-red-50/50",
    title: "text-red-950",
  },
  INFO: {
    label: "Payment unconfirmed",
    badge: "bg-slate-50 text-slate-700 border-slate-300",
    dot: "bg-slate-400",
    panel: "border-slate-200 bg-slate-50/60",
    title: "text-slate-900",
  },
};

const EMAIL_STATE_META = {
  SENT: { label: "Email accepted", tone: "text-emerald-700" },
  QUEUED: { label: "Email queued", tone: "text-amber-700" },
  FAILED: { label: "Email failed", tone: "text-red-700" },
  NOT_SENT: { label: "Not emailed", tone: "text-slate-500" },
};

function badgeLabel(attention) {
  if (!attention) return null;
  if (attention.code === "PAYMENT_ACTION_REQUIRED") return "Action needed";
  if (attention.code === "PAYMENT_FAILED") {
    return attention.payment?.retrying ? "Payment retrying" : "Payment failed";
  }
  if (attention.code === "RESERVATION_AT_RISK") return "Payment at risk";
  if (attention.code === "RESERVATION_UNAVAILABLE") return "Reservation unavailable";
  if (attention.reasonCode === "PAYMENT_PROCESSING") return "Payment processing";
  if (attention.reasonCode === "PAYMENT_LINK_PREPARING") return "Link preparing";
  if (attention.reasonCode === "PAYMENT_NOT_CONFIRMED") return "Payment unconfirmed";
  return null;
}

export function AttentionBadge({ attention, className, showNone = false }) {
  const label = badgeLabel(attention);
  if (!label) {
    if (!showNone) return null;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> No action needed
      </span>
    );
  }
  const meta = LEVEL_META[attention.level] || LEVEL_META.INFO;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap",
        meta.badge,
        className,
      )}
      aria-label={`${label}: ${attention.title || "booking attention"}`}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

function MetaRow({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <div className="text-xs text-slate-800 break-words">{children}</div>
    </div>
  );
}

function ActionButton({ action, busy, disabled, onClick, children }) {
  const isPrimary = action === "SEND_PAYMENT_LINK" || action === "RESEND_PAYMENT_LINK";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        isPrimary
          ? "bg-[#044b3b] text-white hover:bg-[#033629]"
          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
      )}
    >
      {busy ? (
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
      ) : action === "REGENERATE_PAYMENT_LINK" ? (
        <RotateCw size={13} aria-hidden="true" />
      ) : (
        <Mail size={13} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

const ACTION_LABELS = {
  SEND_PAYMENT_LINK: "Send payment link",
  RESEND_PAYMENT_LINK: "Resend link",
  REGENERATE_PAYMENT_LINK: "Generate new link",
};

/**
 * @param {object} props
 * @param {object} props.attention server projection
 * @param {(payload: {action: string, sendInChat: boolean, idempotencyKey: string}) => Promise<object>} props.onAction
 * @param {() => void} [props.onRefresh]
 * @param {"card"|"drawer"} [props.variant]
 */
export default function BookingAttentionPanel({
  attention,
  onAction,
  onRefresh,
  variant = "drawer",
}) {
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [sendInChat, setSendInChat] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  if (!attention || attention.level === "NONE" || !attention.title) return null;
  if (!attention.code && !attention.reasonCode) return null;

  const meta = LEVEL_META[attention.level] || LEVEL_META.INFO;
  const emailMeta = EMAIL_STATE_META[attention.link?.emailState] || EMAIL_STATE_META.NOT_SENT;
  const actions = Array.isArray(attention.actions) ? attention.actions : [];
  const hasActions = actions.length > 0;
  const canChat = Boolean(attention.link?.canSendInChat);

  const run = async (actionCode) => {
    if (!onAction) return;
    const wantsChat = sendInChat;
    setBusyAction(actionCode);
    setError(null);
    setNotice(null);
    try {
      const result = await onAction({
        action: actionCode,
        sendInChat: wantsChat,
        idempotencyKey: newPaymentLinkIdempotencyKey(),
      });
      const emailState = result?.paymentLink?.emailState || result?.emailState;
      let message;
      if (emailState === "QUEUED") {
        message = "Payment link queued. The email provider has not accepted it yet.";
      } else if (emailState === "SENT") {
        message = "Email accepted by the provider. Payment is still unconfirmed until Stripe reports success.";
      } else if (result?.message) {
        message = result.message;
      } else {
        message = "Payment link ready. Payment is still unconfirmed.";
      }
      if (wantsChat) {
        message += result?.paymentLink?.chatSent
          ? " The secure link was also posted in chat."
          : " Chat delivery did not complete, so the link may only be available by email.";
      }
      setNotice(message);
      setConfirmRegenerate(false);
    } catch (err) {
      const serverMessage = err?.response?.data?.message;
      const code = err?.response?.data?.code;
      if (!err?.response) {
        setError(
          "We could not confirm whether the payment link action completed. Refresh the booking before trying again.",
        );
      } else {
        setError(
          code === "PAYMENT_LINK_CREATING" || code === "PAYMENT_LINK_PROVIDER_ERROR"
            ? `${serverMessage || "The secure link could not be created."} Refresh the booking before trying again.`
            : serverMessage || err?.message || "The payment link action failed.",
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section
      className={cn("rounded-xl border p-3.5", meta.panel, variant === "drawer" && "mb-4")}
      aria-label="Booking attention"
    >
      <div className="min-w-0">
        <h3 className={cn("text-sm font-bold", meta.title)}>{attention.title}</h3>
        {attention.message && (
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{attention.message}</p>
        )}
        {attention.nextStep && (
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-800">{attention.nextStep}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-3">
        <MetaRow label="Payment">
          {attention.payment?.confirmed ? (
            <span className="font-semibold text-emerald-700">Confirmed</span>
          ) : (
            <span className="font-semibold text-amber-800">Not confirmed</span>
          )}
          {attention.payment?.amountDue && !attention.payment?.confirmed && (
            <span className="block text-[11px] text-slate-500">
              {formatCurrency(attention.payment.amountDue.amount, attention.payment.amountDue.currency)} due
            </span>
          )}
        </MetaRow>
        <MetaRow label="Secure link">
          <span className={cn("font-semibold", emailMeta.tone)}>{emailMeta.label}</span>
          {attention.link?.lastEmailedAt && (
            <span className="block text-[11px] text-slate-500">
              {formatDateTime(attention.link.lastEmailedAt)}
            </span>
          )}
          {attention.link?.active && attention.link?.expiresAt && (
            <span className="block text-[11px] text-slate-500">
              Expires {formatDateTime(attention.link.expiresAt)}
            </span>
          )}
        </MetaRow>
        {attention.deadlineAt && (
          <MetaRow label="Link deadline">
            {formatDateTime(attention.deadlineAt)}
          </MetaRow>
        )}
        {attention.payment?.retrying && (
          <MetaRow label="Automatic retry">
            Scheduled
          </MetaRow>
        )}
      </div>

      {attention.payment?.failureReason && (
        <p className="mt-2.5 text-[11px] text-slate-600">
          {attention.payment.failureReason}
        </p>
      )}

      {hasActions && onAction && (
        <div className="mt-3">
          {canChat && (
            <label className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={sendInChat}
                onChange={(e) => setSendInChat(e.target.checked)}
                disabled={Boolean(busyAction)}
                className="rounded border-slate-300 text-[#044b3b] focus:ring-emerald-500/30 disabled:opacity-50"
              />
              <MessageCircle size={12} aria-hidden="true" />
              Also post the link in chat
            </label>
          )}

          {confirmRegenerate ? (
            <div className="rounded-lg border border-amber-300 bg-white p-2.5">
              <p className="text-xs font-medium text-slate-800">
                Replace the current secure link? The old link stops working immediately.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => run("REGENERATE_PAYMENT_LINK")}
                  disabled={Boolean(busyAction)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#044b3b] text-white hover:bg-[#033629] disabled:opacity-50"
                >
                  {busyAction === "REGENERATE_PAYMENT_LINK" && <Loader2 size={12} className="animate-spin" />}
                  Yes, replace it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRegenerate(false)}
                  disabled={Boolean(busyAction)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Keep current link
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((a) => (
                <ActionButton
                  key={a.code}
                  action={a.code}
                  busy={busyAction === a.code}
                  disabled={Boolean(busyAction)}
                  onClick={() => {
                    if (a.code === "REGENERATE_PAYMENT_LINK") {
                      setConfirmRegenerate(true);
                      return;
                    }
                    run(a.code);
                  }}
                >
                  {ACTION_LABELS[a.code] || a.label}
                </ActionButton>
              ))}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={Boolean(busyAction)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/70 disabled:opacity-50"
                >
                  <RefreshCw size={12} aria-hidden="true" /> Refresh
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2.5" role="alert">
          <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
            <p className="text-xs font-medium text-red-800">{error}</p>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-red-800 underline underline-offset-2"
              >
                <RefreshCw size={11} /> Refresh booking
              </button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <p className="mt-2.5 text-[11px] text-slate-600" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
