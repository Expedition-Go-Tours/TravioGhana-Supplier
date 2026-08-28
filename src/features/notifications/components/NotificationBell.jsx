import { useEffect, useRef, useState } from "react";
import { Bell, Check, Loader2, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useChatFloatingStore } from "@/stores/chatFloatingStore";
import { formatDate } from "@/lib/utils";
import { NOTIFICATION_TYPES } from "../constants";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/useNotifications";

const popupVariants = {
  initial: { opacity: 0, scale: 0.95, y: -8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.15, ease: "easeIn" } },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

function groupByDate(notifications) {
  const groups = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach((n) => {
    const date = new Date(n.date);
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const key = isToday ? "Today" : isYesterday ? "Yesterday" : "Earlier";
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });

  return groups;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useNotifications({ limit: 8 });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const grouped = groupByDate(notifications);

  const closePanel = () => setOpen(false);
  const togglePanel = () => {
    setOpen((v) => {
      const next = !v;
      if (next) refetch();
      return next;
    });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (open && panelRef.current && !panelRef.current.contains(event.target)) {
        closePanel();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead.mutateAsync(notification.id);
    }
    closePanel();
    if (notification.backendType === "NEW_MESSAGE") {
      useChatFloatingStore.getState().open(notification.data?.conversationId);
      return;
    }
    if (notification.action) {
      navigate(notification.action);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await markAllAsRead.mutateAsync();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={togglePanel}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-emerald-50 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="notification-popup"
            variants={popupVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-emerald-100/60 shadow-lg shadow-emerald-900/5 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-emerald-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isLoading
                    ? "Loading..."
                    : isError
                      ? "Failed to load"
                      : unreadCount > 0
                        ? `${unreadCount} unread`
                        : "All caught up"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markAllAsRead.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  {markAllAsRead.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  Mark read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="px-5 py-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-3/5 bg-emerald-100 rounded" />
                        <div className="h-2.5 w-4/5 bg-emerald-50 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                    <Bell size={20} className="text-red-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Couldn't load notifications</p>
                  <p className="text-xs text-slate-400 mt-1">Pull down or try again later.</p>
                </div>
              ) : Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3 ring-1 ring-emerald-100/60">
                    <Bell size={22} className="text-emerald-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">All clear</p>
                  <p className="text-xs text-slate-400 mt-1">We'll let you know when something arrives.</p>
                </div>
              ) : (
                Object.entries(grouped).map(([dateLabel, items]) => (
                  <div key={dateLabel}>
                    <div className="px-5 pt-4 pb-1.5">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{dateLabel}</p>
                    </div>
                    {items.map((notification) => {
                      const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;
                      const TypeIcon = typeConfig.icon;
                      const isUnread = !notification.read;

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-emerald-50/40 transition-colors relative ${
                            isUnread ? "bg-emerald-50/20" : ""
                          }`}
                        >
                          {isUnread && (
                            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r-full" />
                          )}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${typeConfig.color}`}>
                            <TypeIcon size={15} />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-snug ${isUnread ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>
                                {notification.title}
                              </p>
                              <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap mt-0.5">
                                {timeAgo(notification.date)}
                              </span>
                            </div>
                            {notification.message && (
                              <p className="text-xs text-slate-500 leading-relaxed mt-0.5 line-clamp-2">{notification.message}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {dateLabel === Object.keys(grouped)[Object.keys(grouped).length - 1] && (
                      <div className="border-b border-emerald-50 mx-5 last:border-0" />
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-emerald-50">
              <Link
                to="/notifications"
                onClick={closePanel}
                className="flex items-center justify-center gap-1.5 px-5 py-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                View all notifications
                <ArrowRight size={12} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


