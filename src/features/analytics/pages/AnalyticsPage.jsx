import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  DollarSign, ShoppingCart, Star, TrendingUp, Loader2, RefreshCw, AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { getAuthToken } from "@/stores/authStore";
import { fetchSupplierAnalytics, fetchMonthlyRevenue } from "../api";
import { fetchSupplierBookings } from "@/features/bookings/api";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The API buckets revenue as YYYY-MM ("2026-10"). Render it the way a person
 * reads a trend: "Oct 26", falling back to the raw value if it isn't a bucket.
 */
const formatMonthLabel = (value) => {
  const [year, month] = String(value ?? "").split("-");
  const index = Number(month) - 1;
  if (!year || !MONTH_LABELS[index]) return String(value ?? "");
  return `${MONTH_LABELS[index]} ${year.slice(-2)}`;
};

/** Axis money: "$820" below a thousand, "$12.5k" above. */
const formatAxisCurrency = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000) {
    return `$${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
  }
  return `$${n.toLocaleString("en-US")}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3">
        <p className="text-xs font-medium text-slate-500 mb-1">{formatMonthLabel(label)}</p>
        <p className="text-sm font-semibold text-slate-800">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

/**
 * Best Selling Products thumbnail. Tours carry a cover photo (the bookings
 * endpoint selects it), so show the real image — with a neutral placeholder if
 * a tour has none or the image fails to load, never an initial.
 */
function ProductThumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 overflow-hidden">
      {showImage ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={36}
          height={36}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageIcon size={14} className="text-slate-300" />
      )}
    </div>
  );
}

const PIE_COLORS = ["#044b3b", "#0f766e", "#0891b2", "#ca8a04", "#94a3b8"];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);

  const fetchData = () => {
    if (!getAuthToken()) { setLoading(false); return; }
    setLoading(true); setError(null);
    Promise.all([
      fetchSupplierAnalytics(),
      fetchSupplierBookings({ page: 1, limit: 50 }).then(r => r.bookings).catch(() => []),
      fetchMonthlyRevenue(12).catch(() => []),
    ])
      .then(([d, b, monthly]) => { setData(d); setBookings(b); setMonthlyRevenueData(monthly); })
      .catch((err) => {
        if (err.code === "AUTH_REQUIRED") return;
        setError(err.response?.data?.message || err.message || "Failed to load analytics");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    // Defer the initial fetch out of the effect's synchronous body so no
    // setState runs during the effect itself.
    Promise.resolve().then(() => {
      if (cancelled) return;
      fetchData();
    });
    return () => { cancelled = true; };
  }, []);

  const dashboardData = data;
  const tours = dashboardData?.tours || {};
  const bookingsData = dashboardData?.bookings || {};
  const earnings = dashboardData?.earnings || {};

  const reviews = dashboardData?.reviews || {};
  const totalRevenue = Number(earnings.totalEarnings) || 0;
  const totalBookings = bookingsData.total || 0;
  const activeTours = tours.active || 0;

  const avgRating = reviews.averageRating || 0;

  const productBookings = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const name = b.tourName || "Unknown";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], i) => ({ name: name.length > 12 ? name.slice(0, 12) + "…" : name, value, color: PIE_COLORS[i] }));
  }, [bookings]);

  const productRevenue = useMemo(() => {
    // One pass over the bookings: revenue, booking count and the tour's cover
    // photo (the previous version re-filtered the whole list per product, and
    // dropped the photo the bookings endpoint already sends).
    const map = {};
    bookings.forEach(b => {
      const name = b.tourName || "Unknown";
      if (!map[name]) map[name] = { revenue: 0, bookings: 0, photo: "", tourId: "" };
      map[name].revenue += (b.total || 0);
      map[name].bookings += 1;
      if (!map[name].photo && b.tourPhoto) map[name].photo = b.tourPhoto;
      if (!map[name].tourId && b.tourId) map[name].tourId = b.tourId;
    });

    return Object.entries(map)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 4)
      .map(([name, agg]) => ({
        name,
        revenue: agg.revenue,
        bookings: agg.bookings,
        photo: agg.photo,
        tourId: agg.tourId,
        rating: avgRating,
      }));
  }, [bookings, avgRating]);

  // The endpoint returns a continuous month window (zeros included), so an
  // "empty" trend means every bucket is zero — show that state instead of a
  // flat chart with no bars.
  const hasRevenue = useMemo(
    () => monthlyRevenueData.some((m) => Number(m.revenue) > 0),
    [monthlyRevenueData],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track revenue, bookings and product growth with modern analytics.</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40 shadow-sm"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle size={12} /> {error}
          <button onClick={fetchData} className="ml-auto font-medium underline">Retry</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            {!loading && <span className="text-[11px] text-slate-400 font-medium">vs previous period</span>}
          </div>
          {loading ? (
            <div className="space-y-1.5"><div className="h-5 w-20 bg-slate-100 rounded animate-pulse" /><div className="h-3 w-16 bg-slate-100 rounded animate-pulse" /></div>
          ) : (
            <><p className="text-lg font-bold text-slate-800">{formatCurrency(totalRevenue)}</p><p className="text-[11px] text-slate-400 mt-0.5">Earnings</p></>
          )}
          <div className="mt-2 h-0.5 w-full rounded-full bg-emerald-200/40" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center">
              <ShoppingCart size={16} className="text-blue-600" />
            </div>
            {!loading && <span className="text-[11px] text-slate-400 font-medium">vs previous period</span>}
          </div>
          {loading ? (
            <div className="space-y-1.5"><div className="h-5 w-12 bg-slate-100 rounded animate-pulse" /><div className="h-3 w-16 bg-slate-100 rounded animate-pulse" /></div>
          ) : (
            <><p className="text-lg font-bold text-slate-800">{totalBookings}</p><p className="text-[11px] text-slate-400 mt-0.5">Bookings</p></>
          )}
          <div className="mt-2 h-0.5 w-full rounded-full bg-blue-200/40" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center">
              <Star size={16} className="text-amber-600" />
            </div>
            {!loading && <span className="text-[11px] text-slate-400 font-medium">Guest feedback</span>}
          </div>
          {loading ? (
            <div className="space-y-1.5"><div className="h-5 w-14 bg-slate-100 rounded animate-pulse" /><div className="h-3 w-12 bg-slate-100 rounded animate-pulse" /></div>
          ) : (
            <><p className="text-lg font-bold text-slate-800">{avgRating} ★</p><p className="text-[11px] text-slate-400 mt-0.5">Rating</p></>
          )}
          <div className="mt-2 h-0.5 w-full rounded-full bg-amber-200/40" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200/60 flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            {!loading && <span className="text-[11px] text-slate-400 font-medium">vs last month</span>}
          </div>
          {loading ? (
            <div className="space-y-1.5"><div className="h-5 w-16 bg-slate-100 rounded animate-pulse" /><div className="h-3 w-16 bg-slate-100 rounded animate-pulse" /></div>
          ) : (
            <><p className="text-lg font-bold text-slate-800">{activeTours}</p><p className="text-[11px] text-slate-400 mt-0.5">Active Tours</p></>
          )}
          <div className="mt-2 h-0.5 w-full rounded-full bg-purple-200/40" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Revenue Trend</h3>
            <span className="text-[10px] text-slate-400">Monthly performance</span>
          </div>
          {loading ? (
            <div className="h-[240px] bg-slate-50 rounded-lg animate-pulse" />
          ) : hasRevenue ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyRevenueData} barCategoryGap="24%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" interval={1} tickFormatter={formatMonthLabel} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={formatAxisCurrency} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="revenue" fill="#044b3b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-center">
              <TrendingUp size={22} className="text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">No revenue recorded in the last 12 months</p>
            </div>
          )}
        </div>

        {/* Bookings by Product */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Bookings by Product</h3>
          {loading ? (
            <div className="h-[200px] bg-slate-50 rounded-lg animate-pulse" />
          ) : productBookings.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={productBookings} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {productBookings.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {productBookings.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-slate-500">{p.name}</span>
                    </span>
                    <span className="font-medium text-slate-700">{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-xs text-slate-400">No booking data</div>
          )}
        </div>
      </div>

      {/* Best Selling Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Best Selling Products</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Top performing tours by bookings</p>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />)}</div>
        ) : productRevenue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2.5 pr-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Revenue</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Bookings</th>
                  <th className="text-right py-2.5 pl-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Rating</th>
                  <th className="text-right py-2.5 pl-3"></th>
                </tr>
              </thead>
              <tbody>
                {productRevenue.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb src={p.photo} alt={p.name} />
                        <p className="text-[11px] text-slate-700 font-medium leading-relaxed line-clamp-2">{p.name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-slate-800 font-medium">{formatCurrency(p.revenue)}</td>
                    <td className="py-3 px-3 text-right text-[11px] text-slate-600">{p.bookings}</td>
                    <td className="py-3 pl-3 text-right text-[11px] text-amber-600">{p.rating.toFixed(2)} ★</td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => p.tourId && navigate(`/products/${p.tourId}`)}
                        disabled={!p.tourId}
                        className="text-[11px] text-[#044b3b] font-medium hover:underline whitespace-nowrap disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">No product data available yet</p>
        )}
      </div>
    </div>
  );
}
