import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, Loader2, ArrowRight, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useChatFloatingStore } from "@/stores/chatFloatingStore";
import {
  groupByDate,
  isRecent,
  notificationTypeConfig,
  timeAgo,
} from "../utils/notificationPresentation";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "../hooks/useNotifications";

const PANEL_WIDTH = 400;

/** The sheet only exists below `sm`, matching the `sm:` breakpoints below. */
function useIsMobile() {
  const query = "(max-width: 639px)";
  const [isMobile, setIsMobile] = useState(
    () => Boolean(window.matchMedia?.(query)?.matches),
  );

  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return undefined;
    const onChange = (event) => setIsMobile(event.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  return isMobile;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ top: 72, right: 16 });
  const [actionError, setActionError] = useState(null);

  const { data: countData } = useUnreadCount();
  // The feed is only needed while the panel is open; the badge has its own,
  // much smaller request.
  const { data, isLoading, isError, refetch } = useNotifications(
    { limit: 8 },
    { enabled: open, refetchInterval: false },
  );
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = countData?.count ?? data?.unreadCount ?? 0;
  const groups = groupByDate(notifications);

  const closePanel = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Anchor the panel under the bell on desktop. A hard-coded `right-0` put it
  // under the profile block instead of the control that opened it.
  useEffect(() => {
    if (!open || isMobile) return undefined;

    const update = () => {
      const trigger = triggerRef.current;
      const rect = trigger?.getBoundingClientRect();
      if (!rect) return;
      const gutter = 16;
      // `position: fixed` resolves against the initial containing block, which
      // excludes the scrollbar. Using `innerWidth` here left the panel 6px to
      // the left of the bell on a scrolling page.
      const viewport = document.documentElement.clientWidth || window.innerWidth;
      const headerBottom = trigger.closest("header")?.getBoundingClientRect().bottom ?? 0;
      const maxRight = Math.max(gutter, viewport - PANEL_WIDTH - gutter);
      setPlacement({
        top: Math.round(Math.max(rect.bottom + 8, headerBottom + 6)),
        right: Math.round(
          Math.min(Math.max(gutter, viewport - rect.right), maxRight),
        ),
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, isMobile]);

  // A sheet that scrolls the page behind it feels broken.
  useEffect(() => {
    if (!open || !isMobile) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, isMobile]);

  // Move focus into the panel so keyboard users are not tabbing through the
  // page behind it.
  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => {
      const first = panelRef.current?.querySelector("[data-notification-row]");
      (first || panelRef.current)?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  const handlePanelKeyDown = (event) => {
    const panel = panelRef.current;
    if (!panel) return;

    if (event.key === "Tab" && isMobile) {
      const focusables = Array.from(
        panel.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    const rows = Array.from(panel.querySelectorAll("[data-notification-row]"));
    if (!rows.length) return;

    const current = rows.indexOf(document.activeElement);
    let next = 0;
    if (event.key === "ArrowDown") next = current < 0 ? 0 : Math.min(rows.length - 1, current + 1);
    else if (event.key === "ArrowUp") next = current < 0 ? rows.length - 1 : Math.max(0, current - 1);
    else if (event.key === "End") next = rows.length - 1;

    event.preventDefault();
    rows[next].focus();
  };

  const handleOpenNotification = (notification) => {
    if (!notification.read) {
      // Bookkeeping must not delay the navigation that was the point of the
      // click.
      markAsRead.mutate(notification.id);
    }
    closePanel();

    if (notification.backendType === "NEW_MESSAGE") {
      const conversationType = notification.data?.conversationType;
      if (conversationType === "SUPPLIER_CUSTOMER") {
        navigate(`/chat?customerId=${notification.data?.senderId}`);
      } else {
        useChatFloatingStore.getState().open(notification.data?.conversationId);
      }
      return;
    }

    if (notification.action) navigate(notification.action);
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    setActionError(null);
    markAllAsRead.mutate(undefined, {
      onError: () =>
        setActionError("Couldn't mark everything as read. Please try again."),
    });
  };

  const panelMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : isMobile
      ? {
          initial: { opacity: 0, y: 32 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 32 },
          transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
        }
      : {
          initial: { opacity: 0, y: -6, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -6, scale: 0.98 },
          transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
        };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setActionError(null);
          setOpen((value) => !value);
        }}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-panel"
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#f5f5f5] hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#065f46]/30"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Announces new arrivals without stealing focus from the page. */}
      <span className="sr-only" role="status" aria-live="polite">
        {unreadCount > 0
          ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
          : ""}
      </span>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="notification-backdrop"
              data-testid="notification-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              onClick={() => closePanel(false)}
              className={cn(
                "fixed inset-0 z-[95]",
                isMobile ? "bg-slate-900/30" : "bg-transparent",
              )}
            />
          )}

          {open && (
            <motion.div
              key="notification-panel"
                id="notification-panel"
                ref={panelRef}
                role="dialog"
                aria-modal={isMobile ? "true" : undefined}
                aria-label="Notifications"
                tabIndex={-1}
                onKeyDown={handlePanelKeyDown}
                style={
                  isMobile
                    ? undefined
                    : { top: placement.top, right: placement.right }
                }
                {...panelMotion}
                className={cn(
                  "fixed z-[100] flex flex-col overflow-hidden border border-slate-200 bg-white outline-none",
                  isMobile
                    ? "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.28)]"
                    : "w-[400px] max-h-[min(560px,70dvh)] rounded-2xl shadow-[0_16px_40px_-12px_rgba(15,23,42,0.28)]",
                )}
              >
                {isMobile && (
                  <div className="flex shrink-0 justify-center pt-2">
                    <span className="h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
                  </div>
                )}

                <div className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-600">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        disabled={markAllAsRead.isPending}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                      >
                        {markAllAsRead.isPending && (
                          <Loader2 size={12} className="animate-spin" />
                        )}
                        Mark all read
                      </button>
                    )}
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => closePanel()}
                        aria-label="Close notifications"
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {actionError && (
                  <p
                    role="alert"
                    className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-[11px] font-medium text-red-600"
                  >
                    {actionError}
                  </p>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {isLoading ? (
                    <div className="divide-y divide-slate-100">
                      {[0, 1, 2].map((row) => (
                        <div key={row} className="flex items-start gap-3 px-4 py-3">
                          <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                          <div className="flex-1 space-y-2 pt-0.5">
                            <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
                            <div className="h-2.5 w-4/5 animate-pulse rounded bg-slate-50" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isError ? (
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                        <Bell size={18} className="text-red-500" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-800">
                        Notifications didn't load
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        The request failed. This is usually temporary.
                      </p>
                      <button
                        type="button"
                        onClick={() => refetch()}
                        className="mt-4 rounded-lg bg-primary-500 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600"
                      >
                        Try again
                      </button>
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50">
                        <Bell size={18} className="text-slate-400" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-800">
                        You're all caught up
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Bookings, payments and messages will show up here.
                      </p>
                    </div>
                  ) : (
                    groups.map(([label, items]) => (
                      <div key={label}>
                        <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            {label}
                          </p>
                          <span className="h-px flex-1 bg-slate-100" aria-hidden="true" />
                        </div>

                        {items.map((notification) => {
                          const config = notificationTypeConfig(notification.type);
                          const TypeIcon = config.icon;
                          const isUnread = !notification.read;

                          return (
                            <div key={notification.id} className="group relative">
                              <button
                                type="button"
                                data-notification-row
                                onClick={() => handleOpenNotification(notification)}
                                className={cn(
                                  "flex w-full items-start gap-3 py-3 pl-4 pr-10 text-left transition-colors sm:pr-4",
                                  isUnread
                                    ? "bg-primary-50/50 hover:bg-primary-50"
                                    : "hover:bg-slate-50",
                                )}
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    config.chip,
                                  )}
                                >
                                  <TypeIcon size={15} />
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start gap-2">
                                    {isUnread && (
                                      <span
                                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span
                                      className={cn(
                                        "min-w-0 flex-1 text-[13px] leading-snug",
                                        isUnread
                                          ? "font-semibold text-slate-900"
                                          : "font-medium text-slate-700",
                                      )}
                                    >
                                      {notification.title}
                                    </span>
                                  </span>

                                  {notification.message && (
                                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500">
                                      {notification.message}
                                    </span>
                                  )}

                                  <span className="mt-1 block text-[11px] text-slate-400">
                                    {isRecent(notification.date) && (
                                      <>
                                        {timeAgo(notification.date)}
                                        <span aria-hidden="true"> · </span>
                                      </>
                                    )}
                                    {config.group}
                                  </span>
                                </span>
                              </button>

                              {isUnread && (
                                <button
                                  type="button"
                                  onClick={() => markAsRead.mutate(notification.id)}
                                  aria-label={`Mark ${notification.title} as read`}
                                  title="Mark as read"
                                  className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 opacity-100 transition-opacity hover:bg-white hover:text-slate-700 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>

                <div className="shrink-0 border-t border-slate-100 p-1.5">
                  <Link
                    to="/notifications"
                    onClick={() => closePanel(false)}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    View all notifications
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
