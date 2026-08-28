import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { Loader2, RefreshCw, ArrowUpRight, ShoppingBag, CheckCircle2, Star, DollarSign, MessageCircle, AlertTriangle, ClipboardList, MapPin, TrendingUp, Bell, Check, CalendarX2 } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchSupplierDashboard, fetchMonthlyRevenue } from "../api";
import { fetchCancellationSummary } from "@/features/cancellation/api";
import { getAuthToken, useAuthStore } from "@/stores/authStore";
import { fetchSupplierBookings } from "@/features/bookings/api";
import {
  useNotifications,
  useMarkAllNotificationsRead,
} from "@/features/notifications/hooks/useNotifications";

const NOTIFICATION_ICONS = {
  new_booking: { icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50" },
  booking_confirmed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  new_review: { icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  payout: { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  new_enquiry: { icon: MessageCircle, color: "text-cyan-600", bg: "bg-cyan-50" },
  booking_cancelled: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
};

const STATS_CONFIG = [
  { label: "Total Bookings", icon: ShoppingBag, accent: "border-l-emerald-600", iconBg: "bg-emerald-50", iconBorder: "border-emerald-200/60", iconColor: "text-emerald-600", path: "/bookings" },
  { label: "Total Earnings", icon: TrendingUp, accent: "border-l-emerald-500", iconBg: "bg-emerald-50", iconBorder: "border-emerald-200/60", iconColor: "text-emerald-600", path: "/finance" },
  { label: "Active Tours", icon: MapPin, accent: "border-l-emerald-400", iconBg: "bg-emerald-50", iconBorder: "border-emerald-200/60", iconColor: "text-emerald-600", path: "/products", state: { statusFilter: "ACTIVE" } },
  { label: "Pending Requests", icon: ClipboardList, accent: "border-l-amber-400", iconBg: "bg-amber-50", iconBorder: "border-amber-200/60", iconColor: "text-amber-600", path: "/bookings?tab=PENDING" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-emerald-100 rounded-xl shadow-lg shadow-emerald-900/5 p-3">
        <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [cancellationSummary, setCancellationSummary] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const user = useAuthStore((s) => s.user);

  const { data: notificationsData, refetch: refetchNotifications } =
    useNotifications({ limit: 5 });
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const fetchDashboard = () => {
    if (!getAuthToken()) { setLoading(false); return; }
    setLoading(true); setError(null);
    Promise.all([
      fetchSupplierDashboard(),
      fetchSupplierBookings({ page: 1, limit: 4 }).then(r => r.bookings).catch(() => []),
      fetchCancellationSummary().catch(() => null),
      fetchMonthlyRevenue(12).catch(() => []),
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
  }, []);

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

  const activeTours = tours.active || 0;
  const activeBookings = bookings.confirmed || 0;
  const totalRevenue = Number(earnings.totalEarnings) || 0;
  const pendingBookings = bookings.pending || 0;

  const statsValues = [
    { value: activeBookings + pendingBookings },
    { value: formatCurrency(totalRevenue) },
    { value: activeTours },
    { value: pendingBookings },
  ];

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {pendingBookings > 0
              ? `You have ${pendingBookings} pending booking${pendingBookings > 1 ? 's' : ''} to review.`
              : 'All caught up — no pending requests.'}
          </p>
        </div>
        <button onClick={() => { refetchNotifications(); fetchDashboard(); }} disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-200/60 rounded-xl text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all disabled:opacity-40 shadow-sm"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center gap-2">
          <AlertTriangle size={12} /> {error}
          <button onClick={() => { refetchNotifications(); fetchDashboard(); }} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS_CONFIG.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} onClick={() => navigate(s.path, s.state ? { state: s.state } : undefined)} className={`bg-white border border-emerald-100/60 rounded-xl p-4 hover:shadow-md hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all border-l-4 cursor-pointer ${s.accent}`}>
              <div className="flex items-center justify-between mb-2.5">
                <div className={`w-9 h-9 rounded-lg ${s.iconBg} border ${s.iconBorder} flex items-center justify-center`}>
                  <Icon size={16} className={s.iconColor} />
                </div>
              </div>
              {loading ? (
                <div className="space-y-1.5">
                  <div className="h-5 w-16 bg-emerald-100/40 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-emerald-100/40 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-lg font-bold text-slate-800">{statsValues[i].value}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bookings Overview Chart */}
        <div className="lg:col-span-2 bg-white border border-emerald-100/60 rounded-xl p-5 flex flex-col hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-sm font-semibold text-slate-800">Bookings Overview</h3>
            <button onClick={() => navigate("/bookings")} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              View all <ArrowUpRight size={11} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="h-full bg-emerald-50/40 rounded-lg animate-pulse" />
            ) : revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0fdf4" }} />
                  <Bar dataKey="grossAmount" fill="#044b3b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-medium text-slate-400">No booking data yet</div>
            )}
          </div>
          <p className="text-[10px] font-medium text-slate-400 mt-3 shrink-0">Earnings are cumulative · Bookings from last 90 days</p>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Notifications */}
          <div className="bg-white border border-emerald-100/60 rounded-xl hover:border-emerald-200 transition-all overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-emerald-50">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Bell size={16} className={unreadCount > 0 ? "text-emerald-600" : "text-slate-400"} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold text-white bg-[#059669] rounded-full ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 leading-tight">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-slate-400 leading-tight mt-px">{unreadCount} unread</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 hover:text-white hover:bg-[#059669] rounded-lg transition-all"
                  >
                    <Check size={11} className="inline mr-0.5" /> Mark read
                  </button>
                )}
                <button onClick={() => navigate("/notifications")} className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
                  View all <ArrowUpRight size={11} className="inline" />
                </button>
              </div>
            </div>
            <div className="p-3 max-h-[380px] overflow-y-auto space-y-2">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3.5 p-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="h-3 w-3/5 bg-slate-100 rounded animate-pulse" />
                        <div className="h-2.5 w-4/5 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length > 0 ? (
                notifications.slice(0, 5).map((n) => {
                  const iconConfig = NOTIFICATION_ICONS[n.type] || { icon: MessageCircle, color: "text-slate-500", bg: "bg-slate-50" };
                  const Icon = iconConfig.icon;
                  const isUnread = !n.readAt;
                  const notifType = n.type?.replace(/_/g, ' ') || 'general';
                  return (
                    <div
                      key={n.id}
                      onClick={() => navigate("/notifications")}
                      className={`relative rounded-lg border transition-all cursor-pointer ${
                        isUnread
                          ? "border-[#059669]/20 bg-linear-to-r from-[#059669]/[0.04] to-transparent hover:border-[#059669]/40 hover:shadow-sm"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg ${iconConfig.bg} flex items-center justify-center shrink-0 ${isUnread ? "ring-1 ring-black/[0.06]" : ""}`}>
                            <Icon size={15} className={iconConfig.color} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-snug ${isUnread ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                                {n.title || n.message || "Notification"}
                              </p>
                              <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap mt-px font-medium">
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                            {n.title && n.message && (
                              <p className="text-xs text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 capitalize">
                                {notifType}
                              </span>
                              {isUnread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                              )}
                              {n.data?.bookingId && (
                                <span className="ml-auto text-[10px] font-medium text-[#059669]">View booking →</span>
                              )}
                              {n.data?.payoutId && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/finance?tab=payouts&payoutId=${n.data.payoutId}`); }}
                                  className="ml-auto text-[10px] font-medium text-[#059669] hover:text-[#047857] transition-colors"
                                >
                                  View payout →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                    <Bell size={18} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">All caught up</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                    New notifications about bookings, payouts, and updates will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation Rate Card */}
          <div onClick={() => navigate("/cancellation-rate")} className="bg-white border border-emerald-100/60 rounded-xl p-5 hover:border-emerald-200 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                  <CalendarX2 size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Cancellation rate</h3>
                  <p className="text-xs text-slate-500">Last 30 days</p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                View details <ArrowUpRight size={11} />
              </span>
            </div>

            <div className="flex items-end gap-4 mb-4">
              <div className="text-4xl font-bold text-slate-800 tracking-tight">
                {cancellationSummary?.cancellationRate ?? 0}%
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                (cancellationSummary?.status) === "Excellent" ? "bg-green-100 text-green-800 border-green-200" :
                (cancellationSummary?.status) === "Good" ? "bg-green-50 text-green-700 border-green-100" :
                (cancellationSummary?.status) === "Needs attention" ? "bg-amber-100 text-amber-800 border-amber-200" :
                (cancellationSummary?.status) === "High" ? "bg-red-100 text-red-800 border-red-200" :
                "bg-blue-100 text-blue-800 border-blue-200"
              }`}>
                {(cancellationSummary?.status) === "Excellent" && "★"}
                {(cancellationSummary?.status) === "Good" && "✓"}
                {(cancellationSummary?.status) === "Needs attention" && "⚠"}
                {(cancellationSummary?.status) === "High" && "✗"}
                {(cancellationSummary?.status) === "Building performance record" && "📊"}
                {" "}{cancellationSummary?.status || "Building performance record"}
              </div>
            </div>

            <div className="flex gap-4 text-xs text-slate-500">
              <span><span className="font-semibold text-slate-700">{cancellationSummary?.confirmed ?? 0}</span> confirmed</span>
              <span><span className="font-semibold text-slate-700">{cancellationSummary?.cancelled ?? 0}</span> cancelled</span>
              <span><span className="font-semibold text-slate-700">{cancellationSummary?.completed ?? 0}</span> completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white border border-emerald-100/60 rounded-xl p-5 hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Recent Bookings</h3>
            <button onClick={() => navigate("/bookings")} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              View all <ArrowUpRight size={11} />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-emerald-50/40 rounded-lg animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 bg-emerald-100 rounded" />
                    <div className="h-2.5 w-1/2 bg-emerald-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentBookings.length > 0 ? (
            <div className="space-y-1">
              {recentBookings.slice(0, 4).map((b) => (
                <div key={b.id} onClick={() => navigate(`/bookings?bookingId=${b.id}`)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-emerald-50/40 transition-colors cursor-pointer border border-transparent hover:border-emerald-100">
                  {b.tourPhoto ? (
                    <OptimizedImage src={b.tourPhoto} alt="" width={40} className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-emerald-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-700">
                      {(b.tourName || "T").charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{b.tourName || "Unknown Tour"}</p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      {b.travelDate ? formatDate(b.travelDate) : ""}
                      {b.travelers ? ` • ${b.travelers} ${b.travelers === 1 ? "Person" : "People"}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(b.total, b.currency)}</p>
                    <div className="mt-0.5">
                      <StatusBadge status={b.status} label={b.status?.replace(/_/g, " ") || b.status} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-xs font-medium text-slate-400">No recent bookings</div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white border border-emerald-100/60 rounded-xl p-5 hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Top Products</h3>
            <button onClick={() => navigate("/products")} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              View all <ArrowUpRight size={11} />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-emerald-50/40 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <p className="text-xs font-medium text-slate-400 text-center py-8">Product analytics coming soon</p>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-emerald-100/60 rounded-xl p-5">
            <div className="h-4 w-32 bg-emerald-100/40 rounded animate-pulse mb-4" />
            <div className="h-[220px] bg-emerald-50/40 rounded-lg animate-pulse" />
          </div>
          <div className="bg-white border border-emerald-100/60 rounded-xl p-5">
            <div className="h-4 w-24 bg-emerald-100/40 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 bg-emerald-50/40 rounded animate-pulse" />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
