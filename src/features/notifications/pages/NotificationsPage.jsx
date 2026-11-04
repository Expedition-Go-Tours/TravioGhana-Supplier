import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Trash2,
  Loader2,
  Send,
  MessageSquare,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn, formatDate } from "@/lib/utils";
import { NOTIFICATION_TYPES } from "../constants";
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/useNotifications";
import { sendMessage } from "@/features/chat/api";
import { useTeamRole } from "@/hooks/useTeamRole";
import { PAGE_ACCESS } from "@/config/pageAccess";
import { useChatFloatingStore } from "@/stores/chatFloatingStore";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORY_LABELS = {
  bookings: "Bookings",
  payments: "Payments",
  payouts: "Payouts",
  reviews: "Reviews",
  messages: "Messages",
  cancellations: "Cancellations",
  documents: "Documents",
  team: "Team",
  system: "System",
};

function groupByDate(notifications) {
  const groups = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Newest first, whatever order the API returns: the group order is the
  // insertion order of this object, so Today must be seen before Yesterday and
  // older dates.
  [...notifications]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((notif) => {
    const date = new Date(notif.date);
    const dateKey = formatDate(date);
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    let label;
    if (isToday) label = "Today";
    else if (isYesterday) label = "Yesterday";
    else label = dateKey;

    if (!groups[label]) groups[label] = [];
    groups[label].push(notif);
  });

  return groups;
}

/** Time is the first thing you scan in a notification list, so keep it short. */
function timeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

function ReplyBar({ notification }) {
  // Replying and opening the thread are chat, and chat is `chat.view` (admin +
  // support). The API refuses a member without it, so a role that cannot work
  // the inbox must not be offered a reply box that can only fail.
  const canChat = useTeamRole().hasPermission(PAGE_ACCESS["/chat"]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    const convId = notification.data?.conversationId;
    if (!convId) return;
    setSending(true);
    try {
      await sendMessage(convId, content);
      setSent(true);
      setText("");
      setTimeout(() => setSent(false), 2000);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleOpenChat = () => {
    const convId = notification.data?.conversationId;
    const convType = notification.data?.conversationType;
    if (convType === "SUPPLIER_CUSTOMER") {
      navigate(`/chat?customerId=${notification.data?.senderId}`);
    } else if (convId) {
      useChatFloatingStore.getState().open(convId);
    }
  };

  if (!canChat) return null;

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
        <Check size={14} />
        Message sent
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        placeholder="Reply to this customer…"
        aria-label="Reply to this customer"
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || sending}
        className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-30"
        title="Send reply"
      >
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      </button>
      <button
        onClick={handleOpenChat}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
        title="Open chat"
      >
        <MessageSquare size={14} />
      </button>
    </div>
  );
}

function NotificationRow({ notification, isUnread, isReplying, isMutating, onReply, onMarkRead, onDelete }) {
  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;
  const TypeIcon = typeConfig.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative rounded-xl border p-4 transition-colors",
        isUnread
          ? "border-emerald-200/70 bg-emerald-50/40"
          : "border-slate-200/80 bg-white hover:border-slate-300",
      )}
    >
      {isUnread && (
        <span className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-emerald-500" aria-hidden="true" />
      )}

      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/5",
            typeConfig.color,
          )}
        >
          <TypeIcon size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {isUnread && (
                  <span className="sr-only">Unread:</span>
                )}
                <span className={cn("text-sm", isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>
                  {notification.title}
                </span>
                {/* The type badge repeats the title for single-purpose types
                    ("Cancellation approved"), so only show it when it adds a word. */}
                {typeConfig.label.toLowerCase() !== notification.title.toLowerCase() && (
                  <span className="rounded-md border border-slate-200/70 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    {typeConfig.label}
                  </span>
                )}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
                {notification.message}
              </p>
            </div>
            <time
              dateTime={notification.date}
              title={new Date(notification.date).toLocaleString("en-GB")}
              className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-slate-400"
            >
              {timeAgo(notification.date)}
            </time>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {notification.action && (
              <Link
                to={notification.action}
                onClick={() => {
                  if (isUnread) onMarkRead(notification.id);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                {notification.actionLabel || "View details"} <ArrowUpRight size={11} />
              </Link>
            )}
            {notification.backendType === "NEW_MESSAGE" && notification.data?.conversationId && !isReplying && (
              <button
                onClick={() => onReply(notification.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                <Send size={11} /> Reply
              </button>
            )}

            <div className="ml-auto flex items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              {isUnread && (
                <button
                  onClick={() => onMarkRead(notification.id)}
                  disabled={isMutating}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                  title="Mark read"
                  aria-label={`Mark ${notification.title} as read`}
                >
                  <Check size={15} />
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
                disabled={isMutating}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                title="Delete"
                aria-label={`Delete ${notification.title}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {isReplying && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-3 border-t border-slate-200/70 pt-3"
            >
              <ReplyBar notification={notification} />
            </motion.div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-slate-100" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-slate-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [replyingId, setReplyingId] = useState(null);
  const [clearOpen, setClearOpen] = useState(false);
  const { notificationCategories } = useTeamRole();
  const allowedCategories = notificationCategories?.length
    ? notificationCategories
    : Object.keys(CATEGORY_LABELS);

  const { data, isLoading, isError, refetch, isFetching } = useNotifications({
    limit: 50,
    unreadOnly: filter === "unread",
    ...(category !== "all" ? { categories: category } : {}),
  });

  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllNotifications = useDeleteAllNotifications();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const groupedNotifications = Object.entries(groupByDate(notifications));
  const activeCategoryLabel = category !== "all" ? (CATEGORY_LABELS[category] || category) : null;

  const handleMarkAsRead = (id) => {
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;
    markAllAsRead.mutate();
  };

  const handleDeleteNotification = (id) => {
    deleteNotification.mutate(id);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    deleteAllNotifications.mutate(notifications.map((notification) => notification.id), {
      onSettled: () => setClearOpen(false),
    });
  };

  const isMutating =
    markAsRead.isPending ||
    markAllAsRead.isPending ||
    deleteNotification.isPending ||
    deleteAllNotifications.isPending;

  const subtitle = isLoading
    ? "Loading notifications…"
    : unreadCount === 0
      ? "No unread notifications"
      : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Bell size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Notifications</h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin" : undefined} />
          </button>
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMutating}
            className="flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markAllAsRead.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Mark all read
          </button>
          <button
            onClick={() => setClearOpen(true)}
            disabled={notifications.length === 0 || isMutating}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleteAllNotifications.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Clear all
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {[
            { key: "all", label: "All" },
            { key: "unread", label: "Unread" },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                {tab.label}
                {tab.key === "unread" && unreadCount > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] font-semibold",
                      active ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {allowedCategories.length > 1 && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <SlidersHorizontal size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                aria-label="Filter by notification type"
                className="h-9 w-full rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-600 sm:w-[190px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {allowedCategories.map((key) => (
                  <SelectItem key={key} value={key}>{CATEGORY_LABELS[key] || key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-6 space-y-6">
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Bell size={20} className="text-red-500" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-800">Notifications could not be loaded</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
              The request failed. Try again in a moment.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#033a2e]"
            >
              Try again
            </button>
          </div>
        ) : groupedNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Bell size={20} className="text-emerald-600" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-800">
              {filter === "unread"
                ? "No unread notifications"
                : activeCategoryLabel
                  ? `No ${activeCategoryLabel.toLowerCase()} notifications`
                  : "No notifications yet"}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
              {filter === "unread"
                ? "Everything here has been read."
                : activeCategoryLabel
                  ? "Nothing has arrived for this type yet."
                  : "Booking, payment and message alerts will appear here."}
            </p>
            {filter === "unread" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          groupedNotifications.map(([dateLabel, items]) => (
            <section key={dateLabel} aria-label={dateLabel}>
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{dateLabel}</h2>
                <span className="text-[11px] font-medium text-slate-400">{items.length}</span>
                <div className="h-px flex-1 bg-slate-200/70" />
              </div>
              <div className="space-y-2">
                {items.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    isUnread={!notification.read}
                    isReplying={replyingId === notification.id}
                    isMutating={isMutating}
                    onReply={setReplyingId}
                    onMarkRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {!isLoading && !isError && notifications.length >= 50 && (
        <p className="pt-1 text-center text-xs text-slate-400">
          Showing the 50 most recent notifications.
        </p>
      )}

      <ConfirmDialog
        isOpen={clearOpen}
        title="Clear all notifications?"
        description={`This removes ${notifications.length} notification${notifications.length === 1 ? "" : "s"}. It cannot be undone.`}
        confirmLabel="Clear all"
        isLoading={deleteAllNotifications.isPending}
        onConfirm={handleClearAll}
        onClose={() => setClearOpen(false)}
      />
    </div>
  );
}
