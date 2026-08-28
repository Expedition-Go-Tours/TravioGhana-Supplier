import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  Trash2,
  Loader2,
  Send,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDateTime, formatDate } from "@/lib/utils";
import { NOTIFICATION_TYPES } from "../constants";
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/useNotifications";
import { sendMessage } from "@/features/chat/api";
import { useChatFloatingStore } from "@/stores/chatFloatingStore";

function groupByDate(notifications) {
  const groups = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach((notif) => {
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

function ReplyBar({ notification }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef(null);

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
    if (convId) {
      useChatFloatingStore.getState().open(convId);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
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
        placeholder="Quick reply..."
        className="flex-1 min-w-0 px-3 py-1.5 text-xs border border-emerald-200/60 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 placeholder:text-slate-400"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || sending}
        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Send reply"
      >
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      </button>
      <button
        onClick={handleOpenChat}
        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
        title="Open chat"
      >
        <MessageSquare size={14} />
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [replyingId, setReplyingId] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useNotifications({
    limit: 50,
    unreadOnly: filter === "unread",
  });

  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllNotifications = useDeleteAllNotifications();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const groupedNotifications = groupByDate(notifications);

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

  const handleDeleteAll = () => {
    if (notifications.length === 0) return;
    if (confirm("Are you sure you want to clear all notifications?")) {
      deleteAllNotifications.mutate(notifications.map((notification) => notification.id));
    }
  };

  const isMutating =
    markAsRead.isPending ||
    markAllAsRead.isPending ||
    deleteNotification.isPending ||
    deleteAllNotifications.isPending;

  const isMessageType = (n) => n.backendType === "NEW_MESSAGE" && n.data?.conversationId;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 pb-5 border-b border-emerald-100/60">
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-linear-to-b from-[#044b3b]/70 to-emerald-300 rounded-full hidden sm:block" />
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#044b3b] inline-block" />
            Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-0 sm:ml-[18px]">
            {isLoading
              ? "Loading..."
              : `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMutating}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200/60 rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {markAllAsRead.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Mark All Read
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={notifications.length === 0 || isMutating}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200/60 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {deleteAllNotifications.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Clear All
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
        {[
          { key: "all", label: "All Notifications" },
          { key: "unread", label: "Unread" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === tab.key
                ? "bg-[#044b3b] text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.key === "unread" && unreadCount > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                filter === "unread" ? "bg-white/20" : "bg-emerald-50 text-emerald-600"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-white border border-emerald-100/60 rounded-xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-100 to-emerald-50 shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="h-4 w-2/5 bg-linear-to-r from-emerald-100 to-transparent rounded" />
                  <div className="h-3 w-4/5 bg-linear-to-r from-emerald-50 to-transparent rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-red-50 to-red-100 flex items-center justify-center mx-auto mb-4 ring-1 ring-red-200">
              <Bell size={24} className="text-red-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Could not load notifications</p>
            <p className="text-xs text-slate-400 mb-4">Something went wrong. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 bg-linear-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium rounded-lg shadow-sm shadow-emerald-200 hover:from-emerald-700 hover:to-emerald-600 transition-all"
            >
              Try again
            </button>
          </div>
        ) : Object.entries(groupedNotifications).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mx-auto mb-4 ring-1 ring-emerald-200/60 shadow-sm">
              <Bell size={24} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              {filter === "unread"
                ? "You've read everything. Nice work staying on top of it."
                : "We'll ping you here when there's something new."}
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-3 mb-3 sticky top-0 bg-white/95 backdrop-blur-sm py-2 px-4 md:px-6 z-10 border-b border-emerald-100">
                <div className="h-px flex-1 bg-linear-to-r from-emerald-200 to-transparent" />
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-linear-to-l from-emerald-200 to-transparent" />
              </div>
              <div className="space-y-2">
                {items.map((notification) => {
                  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;
                  const TypeIcon = typeConfig.icon;
                  const isUnread = !notification.read;
                  const canReply = isMessageType(notification);
                  const isReplying = replyingId === notification.id;

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`group relative border rounded-xl transition-all ${
                        isUnread
                          ? "bg-linear-to-r from-emerald-50/50 via-white to-white border-emerald-200/60 shadow-sm shadow-emerald-100/30"
                          : "bg-white border-slate-100 hover:border-emerald-200 hover:shadow-sm hover:shadow-emerald-100/20"
                      }`}
                    >
                      <div className="flex items-start gap-3.5 p-4 sm:p-5">
                        {isUnread && (
                          <span className="absolute left-0 top-3 bottom-3 w-1 bg-linear-to-b from-emerald-500 to-emerald-400 rounded-r-full" />
                        )}

                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.color} ring-1 ring-black/5`}>
                          <TypeIcon size={18} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isUnread && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                                <h4 className={`text-sm ${isUnread ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>
                                  {notification.title}
                                </h4>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/60 font-medium">
                                  {typeConfig.label}
                                </span>
                              </div>
                              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{notification.message}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-slate-400">{formatDateTime(notification.date)}</span>
                                {notification.action && (
                                  <Link
                                    to={notification.action}
                                    onClick={() => {
                                      if (isUnread) handleMarkAsRead(notification.id);
                                    }}
                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                  >
                                    {notification.actionLabel || "View details"} <ArrowUpRight size={11} />
                                  </Link>
                                )}
                                {canReply && !isReplying && (
                                  <button
                                    onClick={() => setReplyingId(notification.id)}
                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                  >
                                    <Send size={11} /> Reply
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isUnread && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                                  disabled={isMutating}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50"
                                  title="Mark as read"
                                >
                                  <Check size={15} />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                                disabled={isMutating}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {canReply && isReplying && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 pt-3 border-t border-emerald-100/60"
                            >
                              <ReplyBar notification={notification} />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {isFetching && !isLoading && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs text-slate-400">Syncing notifications...</p>
        </div>
      )}
    </div>
  );
}
