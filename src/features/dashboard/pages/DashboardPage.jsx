import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { Loader2, RefreshCw, ArrowUpRight, ShoppingBag, Star, AlertTriangle, ClipboardList, MapPin, TrendingUp, Bell, CalendarX2, X } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { fetchSupplierDashboard, fetchMonthlyRevenue } from "../api";
import { canOpenPath } from "@/config/pageAccess";
import { useTeamRole } from "@/hooks/useTeamRole";
import { fetchCancellationSummary } from "@/features/cancellation/api";
import { getAuthToken, useAuthStore } from "@/stores/authStore";
import { fetchSupplierBookings } from "@/features/bookings/api";
import {
  useNotifications,
  useMarkAllNotificationsRead,
} from "@/features/notifications/hooks/useNotifications";
import { NOTIFICATION_TYPES } from "@/features/notifications/constants";

const STATS_CONFIG = [
  { widgetKey: "bookings", label: "Total Bookings", icon: ShoppingBag, accent: "border-l-emerald-600", iconBg: "bg-emerald-50", iconBorder: "border-emerald-200/60", iconColor: "text-emerald-600", path: "/bookings" },
  {
    widgetKey: "earnings",
    label: "Total Earnings",
    // "Earnings" reads to many suppliers as "money in my bank". It is not: it
    // is the supplier's cut on every booking whose PAYMENT SUCCEEDED, over the
    // account's lifetime — it includes what is still owed and what has not
    // cleared yet. The hint says so on the card.
    hint: "Lifetime · your cut on paid bookings",
    icon: TrendingUp,
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-50",
    iconBorder: "border-emerald-200/60",
    iconColor: "text-emerald-600",
    path: "/finance",
  },
  { widgetKey: "activeTours", label: "Active Tours", icon: MapPin, accent: "border-l-emerald-400", iconBg: "bg-emerald-50", iconBorder: "border-emerald-200/60", iconColor: "text-emerald-600", path: "/products", state: { statusFilter: "ACTIVE" } },
  { widgetKey: "pendingBookings", label: "Pending Bookings", icon: ClipboardList, accent: "border-l-amber-400", iconBg: "bg-amber-50", iconBorder: "border-amber-200/60", iconColor: "text-amber-600", path: "/bookings?tab=PENDING" },
];

const CustomTooltip = ({ active, payload, label, labelFormatter }) =>
  active && payload?.length ? (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/5">
      <p className="text-[11px] font-medium text-slate-500">{labelFormatter ? labelFormatter(label) : label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">{formatCurrency(payload[0].value)}</p>
    </div>
  ) : null;

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const CANCELLATION_STATUS_BADGES = {
  Excellent: { className: "bg-green-100 text-green-800 border-green-200", icon: Star },
  "Above standard": { className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle },
  "At risk": { className: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertTriangle },
  High: { className: "bg-red-100 text-red-800 border-red-200", icon: X },
  "Building performance record": { className: "bg-blue-100 text-blue-800 border-blue-200", icon: ClipboardList },
};

// Alias the pre-deploy vocabulary so a cached summary cannot render an
// unstyled badge.
const LEGACY_CANCELLATION_STATUS = {
  Good: "Above standard",
  "Needs attention": "At risk",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [cancellationSummary, setCancellationSummary] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const user = useAuthStore((s) => s.user);
  const { hasPermission, uiPreferences } = useTeamRole();

  // Dashboard cards point at the pages behind them, and those pages are
  // role-gated: a support member's "Total Earnings" card targets Finance, which
  // they cannot open. Rather than bouncing them off the route guard with a
  // refusal, a card this role cannot follow simply is not a link.
  const canOpen = (path) => canOpenPath(hasPermission, path);
  const goTo = (path, options) => {
    if (canOpen(path)) navigate(path, options);
  };

  // The panel is the member's own inbox, filtered to the categories their role
  // was assigned — the same rule as the Notifications page, so it opens for
  // every role and only the owner's panel preference hides it.
  const canSeeNotifications =
    uiPreferences?.dashboard?.panels === undefined || uiPreferences.dashboard.panels.includes("notifications");
  const canSeeRevenue = (hasPermission("dashboard.revenue.view") || hasPermission("analytics.revenue.view"))
    && (uiPreferences?.dashboard?.panels === undefined || uiPreferences.dashboard.panels.includes("revenue"));
  const canSeeCancellation = hasPermission("cancellation.view")
    && (uiPreferences?.dashboard?.panels === undefined || uiPreferences.dashboard.panels.includes("cancellation"));
  const canSeeRecentBookings = canOpen("/bookings")
    && (uiPreferences?.dashboard?.panels === undefined || uiPreferences.dashboard.panels.includes("recentBookings"));

  const { data: notificationsData, refetch: refetchNotifications } =
    useNotifications({ limit: 5 }, { enabled: canSeeNotifications });
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const fetchDashboard = () => {
    if (!getAuthToken()) { setLoading(false); return; }
    setLoading(true); setError(null);
    // Recent bookings is the Bookings page's own data, and that page is not every
    // role's to open (bookings.view: admin + editor). Asking anyway cost a finance
    // member a permission toast on every dashboard load, and left this panel
    // permanently saying "No recent bookings" — so the request follows the page,
    // exactly as the links on this page do.
    Promise.all([
      fetchSupplierDashboard(),
      canSeeRecentBookings
        ? fetchSupplierBookings({ page: 1, limit: 4 }).then(r => r.bookings).catch(() => [])
        : Promise.resolve([]),
      canSeeCancellation ? fetchCancellationSummary(undefined, 30).catch(() => null) : Promise.resolve(null),
      canSeeRevenue ? fetchMonthlyRevenue(12).catch(() => []) : Promise.resolve([]),
    ])
      .then(([data, bookings, cancellationData, monthly]) => {
        setDashboardData(data);
        setRecentBookings(bookings);
        setCancellationSummary(cancellationData);
        setRevenueData(monthly);
      })
      .catch((err) => {
        if (err.code === "AUTH_REQUIRED") return;
        setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    // Deferred so the setState's happen outside the effect's sync body
    Promise.resolve().then(() => {
      if (!cancelled) fetchDashboard();
    });
    return () => { cancelled = true; };
  }, [canSeeRecentBookings, canSeeCancellation, canSeeRevenue]);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
    } catch {
      // silent fail — non-critical
    }
  };

  const tours = dashboardData?.tours || {};
  const bookings = dashboardData?.bookings || {};
  const earnings = dashboardData?.earnings || {};
  const topProducts = dashboardData?.topProducts || [];

  const activeTours = tours.active || 0;
  // Card 1 is labelled "Total Bookings", so it has to mean every booking the
  // supplier has — the same figure the Bookings page reports. It was bound to
  // `confirmed + pending`, which on a five-booking account read "2 Total
  // Bookings": three COMPLETED bookings disappeared from a card claiming to be
  // a total, and the card would have fallen to 0 the moment everything
  // completed. `bookings.total` was already returned by the dashboard
  // endpoint; only the binding was wrong.
  const totalBookings = bookings.total || 0;
  const pendingBookings = bookings.pending || 0;

  // Earnings are per currency. The endpoint returns a scalar ONLY for a
  // single-currency account and `byCurrency` always; printing the scalar of a
  // multi-currency account would be a total no one holds.
  const earningsRows = earnings.byCurrency || [];
  const earningsValue = (() => {
    if (earningsRows.length > 1) {
      // One line per currency — two balances, not one invented total.
      return (
        <span className="block text-[15px] leading-tight">
          {earningsRows.map((row) => (
            <span key={row.currency} className="block">
              {formatCurrency(row.supplierCut, row.currency)}
            </span>
          ))}
        </span>
      );
    }
    if (earningsRows.length === 1) {
      return formatCurrency(earningsRows[0].supplierCut, earningsRows[0].currency);
    }
    // Older payloads without byCurrency: the scalar, when it exists.
    return formatCurrency(Number(earnings.totalEarnings) || 0);
  })();

  const cardValueByKey = {
    bookings: totalBookings,
    earnings: earningsValue,
    activeTours,
    pendingBookings,
  };
  const visibleStats = STATS_CONFIG.filter((stat) => {
    if (stat.widgetKey === "earnings" && !(hasPermission("earnings.view") || hasPermission("finance.view"))) return false;
    if ((stat.widgetKey === "bookings" || stat.widgetKey === "pendingBookings") && !hasPermission("bookings.view")) return false;
    if (stat.widgetKey === "activeTours" && !hasPermission("tours.view")) return false;
    const cards = uiPreferences?.dashboard?.cards;
    if (Array.isArray(cards) && !cards.includes(stat.widgetKey)) return false;
    return true;
  });

  // The greeting must never claim there is nothing to do unless that is actually
  // known. `pendingBookings` is 0 both when the supplier really is caught up and
  // when the fetch has not landed yet, so an unguarded ternary opened with "All
  // caught up" on every single load — and on a failed fetch it claimed the same
  // thing directly above the error banner. The gate is whether the data exists,
  // NOT `loading`: a manual refresh still holds the previous numbers, and those
  // are better information than a placeholder. A refresh that fails while data
  // is in hand also keeps showing them, which is correct — the banner already
  // says the reload failed and offers Retry.
  const greetingStatus = (() => {
    if (!hasPermission("bookings.view")) return null;
    if (!dashboardData) {
      if (error) return 'We could not load your pending bookings.';
      if (loading) return 'Checking your pending bookings…';
      // Signed out, or the fetch never started: nothing to claim either way.
      return null;
    }
    if (pendingBookings > 0) {
      return `You have ${pendingBookings} pending booking${pendingBookings > 1 ? 's' : ''} to review.`;
    }
    return 'No pending bookings to review.';
  })();

  const cancellationStatus = (() => {
    const raw = cancellationSummary?.status || "Building performance record";
    return CANCELLATION_STATUS_BADGES[raw] ? raw : LEGACY_CANCELLATION_STATUS[raw] || "Building performance record";
  })();
  const cancellationBadge = CANCELLATION_STATUS_BADGES[cancellationStatus];
  const CancellationBadgeIcon = cancellationBadge.icon;

  const revenueTotal = revenueData.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0);

  const cancellationStats = [
    { label: "Upcoming", value: cancellationSummary?.upcomingConfirmed ?? 0 },
    { label: "Cancelled", value: cancellationSummary?.cancelled ?? 0 },
    { label: "Supplier-caused", value: cancellationSummary?.supplierCausedCount ?? 0 },
    { label: "Completed", value: cancellationSummary?.completed ?? 0 },
  ];

  // "2025-12" -> "Dec". Anything the API already labels is passed through.
  const monthLabel = (value) => {
    const match = /^(\d{4})-(\d{2})$/.exec(String(value));
    if (!match) return value;
    return new Date(Number(match[1]), Number(match[2]) - 1, 1)
      .toLocaleDateString("en-GB", { month: "short" });
  };

  const revenueTick = (value) => (value >= 1000 ? `$${value / 1000}k` : `$${value}`);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
            {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
          </h1>
          {greetingStatus && (
            <p className="mt-1 text-sm text-slate-500">{greetingStatus}</p>
          )}
        </div>
        <button
          onClick={() => { refetchNotifications(); fetchDashboard(); }}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
          <AlertTriangle size={14} />
          <span className="min-w-0 flex-1">{error}</span>
          <button onClick={() => { refetchNotifications(); fetchDashboard(); }} className="shrink-0 underline">
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {visibleStats.map((s) => {
          const Icon = s.icon;
          const openable = canOpen(s.path);
          const Wrapper = openable ? "button" : "div";
          return (
            <Wrapper
              key={s.label}
              {...(openable
                ? {
                  type: "button",
                  onClick: () => navigate(s.path, s.state ? { state: s.state } : undefined),
                }
                : {})}
              className={cn(
                "rounded-xl border border-slate-200/80 bg-white p-4 text-left transition-colors",
                openable && "hover:border-slate-300 hover:shadow-sm",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", s.iconBg, s.iconColor)}>
                  <Icon size={15} />
                </span>
              </div>
              {loading ? (
                <div className="mt-2 space-y-1.5">
                  <div className="h-7 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-50" />
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-900">
                    {cardValueByKey[s.widgetKey]}
                  </p>
                  {s.hint && <p className="mt-1 text-[11px] leading-tight text-slate-400">{s.hint}</p>}
                </>
              )}
            </Wrapper>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue */}
        {canSeeRevenue && (
          <section className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-5 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Revenue</h2>
                <p className="mt-0.5 text-xs text-slate-500">Gross bookings per month, last 12 months</p>
              </div>
              <div className="text-right">
                {loading ? (
                  <div className="ml-auto h-6 w-24 animate-pulse rounded bg-slate-100" />
                ) : revenueData.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold tabular-nums text-slate-900">{formatCurrency(revenueTotal)}</p>
                    <p className="text-[11px] text-slate-400">12-month total</p>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-4 min-h-[260px] flex-1">
              {loading ? (
                <div className="h-full animate-pulse rounded-lg bg-slate-50" />
              ) : revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} barCategoryGap="22%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={monthLabel}
                      tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={({ x, y, payload }) => (
                        <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#94a3b8" fontWeight={500}>
                          {revenueTick(payload.value)}
                        </text>
                      )}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip content={<CustomTooltip labelFormatter={monthLabel} />} cursor={{ fill: "#f0fdf4" }} />
                    <Bar dataKey="revenue" fill="#044b3b" radius={[4, 4, 0, 0]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <TrendingUp size={20} className="text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No revenue yet</p>
                  <p className="max-w-[220px] text-xs text-slate-400">Paid bookings will fill this chart.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Right column */}
        <div className="space-y-4">
          {/* Notifications */}
          {canSeeNotifications && (
            <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/notifications")}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                  >
                    View all <ArrowUpRight size={11} />
                  </button>
                </div>
              </div>

              <div className="max-h-[340px] space-y-1 overflow-y-auto p-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg p-2.5">
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
                        <div className="h-2.5 w-4/5 animate-pulse rounded bg-slate-50" />
                      </div>
                    </div>
                  ))
                ) : notifications.length > 0 ? (
                  notifications.slice(0, 5).map((n) => {
                    const iconConfig = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.system;
                    const Icon = iconConfig.icon;
                    // The notifications hook exposes the mapped `read` flag;
                    // `readAt` only exists on the raw API row, so testing it
                    // tinted every notification as unread.
                    const isUnread = !n.read;
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "flex items-start gap-1 rounded-lg transition-colors",
                          isUnread ? "bg-emerald-50/50" : "hover:bg-slate-50",
                        )}
                      >
                        <button
                          onClick={() => navigate("/notifications")}
                          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg p-2.5 text-left"
                        >
                          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconConfig.bg, iconConfig.text)}>
                            <Icon size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className={cn(
                                "line-clamp-1 text-[13px]",
                                isUnread ? "font-semibold text-slate-800" : "font-medium text-slate-600",
                              )}>
                                {n.title || n.message || "Notification"}
                              </span>
                              <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                            </span>
                            {n.title && n.message && (
                              <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-slate-400">{n.message}</span>
                            )}
                          </span>
                        </button>
                        {n.data?.payoutId && canOpen("/finance") && (
                          <button
                            onClick={() => goTo(`/finance?tab=payouts&payoutId=${n.data.payoutId}`)}
                            className="mr-1.5 mt-2 shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            View payout
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
                      <Bell size={16} className="text-slate-300" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-600">No notifications yet</p>
                    <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-slate-400">
                      Bookings, payouts, reviews and customer enquiries will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Cancellation rate */}
          {canSeeCancellation && (
            <button
              onClick={() => navigate("/cancellation-rate")}
              className="w-full rounded-xl border border-slate-200/80 bg-white p-4 text-left transition-colors hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <CalendarX2 size={15} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Cancellation rate</span>
                    <span className="block text-[11px] text-slate-500">Last 30 days</span>
                  </span>
                </div>
                <ArrowUpRight size={14} className="mt-1 shrink-0 text-slate-400" />
              </div>

              <div className="mt-3 flex items-center gap-2.5">
                {loading ? (
                  <div className="h-8 w-28 animate-pulse rounded bg-slate-100" />
                ) : (
                  <>
                    <span className="text-3xl font-bold tracking-tight text-slate-900">
                      {cancellationSummary?.cancellationRate ?? 0}%
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", cancellationBadge.className)}>
                      <CancellationBadgeIcon size={10} aria-hidden="true" />
                      {cancellationStatus}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {cancellationStats.map((stat) => (
                  <span key={stat.label} className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <span className="block text-[11px] text-slate-500">{stat.label}</span>
                    <span className="block text-sm font-semibold tabular-nums text-slate-800">{stat.value}</span>
                  </span>
                ))}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent bookings */}
        {canSeeRecentBookings && (
          <section className="rounded-xl border border-slate-200/80 bg-white lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent bookings</h2>
              {canOpen("/bookings") && (
                <button
                  onClick={() => navigate("/bookings")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 transition-colors hover:text-emerald-800"
                >
                  View all <ArrowUpRight size={11} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="space-y-3 border-t border-slate-100 px-5 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentBookings.length > 0 ? (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {recentBookings.slice(0, 4).map((b) => (
                  <button
                    key={b.id}
                    onClick={canOpen("/bookings") ? () => navigate(`/bookings?bookingId=${b.id}`) : undefined}
                    disabled={!canOpen("/bookings")}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
                      canOpen("/bookings") ? "hover:bg-slate-50" : "cursor-default",
                    )}
                  >
                    {b.tourPhoto ? (
                      <OptimizedImage src={b.tourPhoto} alt="" width={36} className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-100" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                        {(b.tourName || "T").charAt(0)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-800">{b.tourName || "Unknown tour"}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {b.travelDate ? formatDate(b.travelDate) : ""}
                        {b.travelers ? ` · ${b.travelers} ${b.travelers === 1 ? "person" : "people"}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-semibold tabular-nums text-slate-900">
                        {formatCurrency(b.total, b.currency)}
                      </span>
                      <span className="mt-1 block">
                        <StatusBadge status={b.status} label={b.status?.replace(/_/g, " ") || b.status} size="sm" />
                      </span>
                    </span>
                    <ArrowUpRight size={14} className="shrink-0 text-slate-300" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="border-t border-slate-100 px-5 py-10 text-center text-sm text-slate-500">
                No recent bookings
              </div>
            )}
          </section>
        )}

        {/* Top products */}
        <section className={cn("rounded-xl border border-slate-200/80 bg-white", !canOpen("/bookings") && "lg:col-span-2")}>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Top products</h2>
            {canOpen("/products") && (
              <button
                onClick={() => navigate("/products")}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 transition-colors hover:text-emerald-800"
              >
                View all <ArrowUpRight size={11} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3 border-t border-slate-100 px-5 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : topProducts.length > 0 ? (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {topProducts.map((product, i) => (
                <button
                  key={product.id}
                  onClick={canOpen(`/products/${product.id}`) ? () => navigate(`/products/${product.id}`) : undefined}
                  disabled={!canOpen(`/products/${product.id}`)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors",
                    canOpen(`/products/${product.id}`) ? "hover:bg-slate-50" : "cursor-default",
                  )}
                >
                  <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{i + 1}</span>
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    {product.coverPhoto ? (
                      <OptimizedImage src={product.coverPhoto} width={36} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-slate-300">
                        <ShoppingBag size={14} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-800" title={product.title}>
                      {product.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {product.bookings} booking{product.bookings !== 1 ? "s" : ""}
                      {product.reviewCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-0.5">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          {product.averageRating.toFixed(1)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
                    {formatCurrency(product.revenue)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 border-t border-slate-100 px-5 py-10">
              <ShoppingBag size={20} className="text-slate-300" />
              <p className="text-sm text-slate-500">No product bookings yet</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
