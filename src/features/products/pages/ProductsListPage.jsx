import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Grid3X3, List, Plus, Eye, Edit, Trash2,
  AlertCircle, RefreshCw, Package, Star, TrendingUp, Percent,
} from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/shared/StatusBadge";
import { PRODUCT_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { deleteProduct, productsListQuery, PRODUCTS_LIST_KEY } from "@/features/products/api";
import EmptyState from "@/components/shared/EmptyState";
import PreviewMenu from "@/components/shared/PreviewMenu";
import { getAuthToken, useAuthStore } from "@/stores/authStore";
import OptimizedImage from "@/components/shared/OptimizedImage";
import DeleteModal from "@/components/ui/DeleteModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function extractPrice(tour) {
  try {
    const prices = tour?.schedulesAndPricing?.pricingSchedules?.schedules?.[0]?.prices;
    if (prices?.length > 0) {
      const minPrice = Math.min(...prices.map((p) => p.retailPrice || Infinity));
      return minPrice !== Infinity ? minPrice : null;
    }
  } catch { /* ignore */ }
  return null;
}

function extractCurrency(tour) {
  try {
    return tour?.schedulesAndPricing?.pricingSchedules?.currency || "USD";
  } catch { /* ignore */ return "USD"; }
}

function extractCategory(tour) {
  try {
    return tour?.categorization?.category || tour?.category || "";
  } catch { /* ignore */ return ""; }
}

function extractSupplierName(tour) {
  try {
    const bi = tour?.supplier?.supplierProfile?.businessInfo;
    return bi?.displayName || bi?.legalBusinessName || bi?.businessName || tour?.supplier?.name || "";
  } catch { /* ignore */ return ""; }
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "Cultural", label: "Cultural" },
  { value: "Adventure", label: "Adventure" },
  { value: "Nature", label: "Nature" },
  { value: "Food & Drink", label: "Food & Drink" },
  { value: "City Tour", label: "City Tour" },
  { value: "Wildlife", label: "Wildlife" },
  { value: "Trekking", label: "Trekking" },
];

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

function DraftStatusBadge({ product }) {
  if (product.status !== "ACTIVE") return null;
  if (product.draftStatus === "PENDING_APPROVAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold">
        Pending edits
      </span>
    );
  }
  if (product.draftStatus === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-semibold">
        Edits rejected
      </span>
    );
  }
  return null;
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-slate-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-6 bg-slate-100 rounded w-1/3" />
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="h-3 bg-slate-100 rounded w-1/4" />
          <div className="flex gap-1.5">
            <div className="h-7 w-7 bg-slate-100 rounded-lg" />
            <div className="h-7 w-7 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden animate-pulse">
      <div className="p-5 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-3 bg-slate-100 rounded w-1/5" />
            <div className="h-3 bg-slate-100 rounded w-1/6" />
            <div className="h-3 bg-slate-100 rounded w-1/6" />
            <div className="h-3 bg-slate-100 rounded w-1/6 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(location.state?.statusFilter || "all");
  const [imgErrors, setImgErrors] = useState({});
  const [imgLoaded, setImgLoaded] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const useSupplier = Boolean(getAuthToken());
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    ...productsListQuery(useSupplier),
    staleTime: 30_000,
    retry: 1,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: (_, id) => {
      toast.success("Product deleted");
      queryClient.setQueryData(PRODUCTS_LIST_KEY(useSupplier), (old) => {
        if (!old) return old;
        return { ...old, tours: old.tours.filter((p) => p.id !== id) };
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || "Failed to delete product");
    },
  });

  const products = useMemo(() => data?.tours || [], [data]);
  const usingSupplierEndpoint = data?.useSupplier ?? Boolean(getAuthToken());

  const getSupplierLabel = (product) => {
    const name = extractSupplierName(product) || (usingSupplierEndpoint ? user?.name : "");
    return name || "No supplier";
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      p.title?.toLowerCase().includes(q) ||
      getSupplierLabel(p).toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || extractCategory(p) === categoryFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.status === "ACTIVE").length;
    const pending = products.filter((p) => p.status === "PENDING_APPROVAL").length;
    const rejected = products.filter((p) => p.status === "REJECTED").length;
    const draft = products.filter((p) => p.status === "DRAFT").length;
    const pendingEdits = products.filter((p) => p.status === "ACTIVE" && p.draftStatus === "PENDING_APPROVAL").length;
    const totalBookings = products.reduce((sum, p) => sum + (p._count?.bookings || 0), 0);
    return { total, active, pending, rejected, draft, pendingEdits, totalBookings };
  }, [products]);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const hasFilters = search || categoryFilter !== "all" || statusFilter !== "all";

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1 h-10 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">Products</h1>
              {!isLoading && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {stats.total}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Manage your tour products and experiences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 shadow-sm"
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => navigate("/products/build/new/type")}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Create Product</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && !isError && stats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { label: "Active", value: stats.active, icon: Package, accent: "emerald" },
            { label: "Pending Approval", value: stats.pending, icon: TrendingUp, accent: "amber" },
            { label: "Pending Edits", value: stats.pendingEdits, icon: Edit, accent: "amber" },
            { label: "Drafts", value: stats.draft, icon: Edit, accent: "emerald" },
          ].map((s) => {
            const accentMap = {
              emerald: "bg-emerald-50 text-emerald-600 border-emerald-200/50",
              amber: "bg-amber-50 text-amber-600 border-amber-200/50",
              rose: "bg-rose-50 text-rose-600 border-rose-200/50",
            };
            return (
              <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-sm hover:border-slate-200 transition-all">
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`w-9 h-9 rounded-lg ${accentMap[s.accent]} border flex items-center justify-center`}>
                    <s.icon size={16} />
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-800">{s.value}</p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus-ring transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["ACTIVE", "DRAFT", "PENDING_APPROVAL", "REJECTED", "FLAGGED", "INACTIVE", "PAUSED", "ARCHIVED"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center bg-slate-100/80 rounded-xl p-1">
          {[
            { key: "grid", icon: Grid3X3 },
            { key: "table", icon: List },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={cn(
                  "relative p-2 rounded-lg transition-colors",
                  viewMode === v.key ? "text-white" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {viewMode === v.key && (
                  <motion.span
                    layoutId="viewTab"
                    className="absolute inset-0 rounded-lg bg-emerald-600"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10"><Icon size={17} /></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Auth Banner */}
      {!isLoading && !isError && !usingSupplierEndpoint && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200/60 rounded-xl">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">Browsing public tours</p>
            <p className="text-amber-700 text-xs mt-0.5">Sign in as a supplier to view and manage your own products.</p>
          </div>
        </div>
      )}

      {/* Results count */}
      {!isLoading && !isError && (
        <p className="text-xs text-slate-500">
          Showing {filteredProducts.length} of {products.length} product{products.length !== 1 ? "s" : ""}
          {hasFilters && filteredProducts.length !== products.length && (
            <button onClick={handleClearFilters} className="ml-2 text-emerald-600 hover:underline font-medium">
              Clear filters
            </button>
          )}
        </p>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center bg-white border border-red-200/60 rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 ring-1 ring-red-100/60">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Failed to load products</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-xs">{error?.response?.data?.message || error?.message || "Something went wrong."}</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm">
            <RefreshCw size={14} /> Try Again
          </button>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        viewMode === "table" ? <TableSkeleton /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {!isLoading && !isError && viewMode === "grid" && (
          <motion.div
            key="grid"
            variants={STAGGER}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredProducts.map((product) => {
              const src = product.coverPhoto || product.photos?.find(p => p);
              const pid = product.id;
              const showSkeleton = src && !imgLoaded[pid] && !imgErrors[pid];
              const price = extractPrice(product);
              const currency = extractCurrency(product);
              const category = extractCategory(product);

              return (
                <motion.div
                  key={product.id}
                  variants={FADE_UP}
                  layout
                  className="group bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 hover:shadow-md hover:shadow-slate-900/5 transition-all duration-200"
                >
                  {/* Image */}
                  <div
                    className="aspect-[4/3] bg-slate-50 relative cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    {src ? (
                      <>
                        {showSkeleton && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
                        <OptimizedImage
                          src={product.coverPhoto || product.photos?.find(p => p)}
                          width={560}
                          alt={product.title}
                          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded[pid] ? "opacity-100" : "opacity-0"}`}
                          onLoad={() => setImgLoaded((prev) => ({ ...prev, [pid]: true }))}
                          onError={() => {
                            setImgErrors((prev) => ({ ...prev, [pid]: true }));
                          }}
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Package size={24} className="text-slate-300" />
                        </div>
                      </div>
                    )}

                    {/* Category pill */}
                    {category && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-slate-700 backdrop-blur-sm border border-white/60 shadow-sm">
                        {category}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <h3
                      className="text-sm font-semibold text-slate-800 line-clamp-1 cursor-pointer hover:text-emerald-700 transition-colors"
                      title={product.title}
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{getSupplierLabel(product)}</p>

                    {/* Price + Status */}
                    <div className="mt-3 flex items-center justify-between">
                      {price !== null ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold text-emerald-700">
                            {formatCurrency(price, currency)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">/ person</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Price not set</span>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <StatusBadge status={product.status} label={PRODUCT_STATUSES[product.status]?.label} size="sm" />
                        <DraftStatusBadge product={product} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-medium">{product._count?.bookings ?? 0} bookings</span>
                        {product.averageRating > 0 && (
                          <span className="flex items-center gap-1 font-medium text-emerald-600">
                            <Star size={12} className="fill-emerald-400 text-emerald-400" />
                            {product.averageRating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-100 transition-opacity">
                        {(product.status === "ACTIVE" || product.status === "PAUSED") && (
                          <button
                            onClick={() => navigate(`/special-offers/build/new/products?productId=${product.id}`)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Create special offer"
                          >
                            <Percent size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <PreviewMenu product={product} />
                        {usingSupplierEndpoint && (
                          <>
                            <button
                              onClick={() => navigate(`/products/build/${product.id}/type`)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!isLoading && !isError && viewMode === "table" && (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 transition-all"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Product", "Category", "Status", "Price", "Bookings", "Rating", "Updated", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, i) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-slate-50 last:border-0 hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {(() => { const rawUrl = product.coverPhoto || product.photos?.find(p => p); return rawUrl ? <OptimizedImage src={rawUrl} alt="" width={36} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-slate-300" /></div>; })()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate cursor-pointer hover:text-emerald-700 transition-colors" onClick={() => navigate(`/products/${product.id}`)}>
                              {product.title}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{getSupplierLabel(product)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 capitalize">{extractCategory(product) || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={product.status} label={PRODUCT_STATUSES[product.status]?.label} size="sm" />
                          <DraftStatusBadge product={product} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {extractPrice(product) !== null
                          ? <span className="text-sm font-semibold text-slate-800">{formatCurrency(extractPrice(product), extractCurrency(product))}</span>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{product._count?.bookings ?? 0}</td>
                      <td className="px-4 py-3">
                        {product.averageRating > 0
                          ? <span className="flex items-center gap-1 text-sm text-amber-600 font-medium"><Star size={12} className="fill-amber-400 text-amber-400" />{product.averageRating}</span>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(product.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {(product.status === "ACTIVE" || product.status === "PAUSED") && (
                            <button onClick={() => navigate(`/special-offers/build/new/products?productId=${product.id}`)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Create special offer"><Percent size={14} /></button>
                          )}
                          <button onClick={() => navigate(`/products/${product.id}`)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View"><Eye size={14} /></button>
                          <PreviewMenu product={product} />
                          {usingSupplierEndpoint && (
                            <>
                              <button onClick={() => navigate(`/products/build/${product.id}/type`)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit"><Edit size={14} /></button>
                              <button
                                onClick={() => setDeleteTarget(product)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!isLoading && !isError && filteredProducts.length === 0 && (
        products.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState
              icon="products"
              title="No products yet"
              description="Create your first product to start selling tours and experiences."
              action={
                <button onClick={() => navigate("/products/build/new/type")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all "
                >
                  <Plus size={16} /> Create Product
                </button>
              }
            />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState
              icon="filter"
              title="No matching products"
              description="Try adjusting your search or filter criteria."
              action={
                <button onClick={handleClearFilters}
                  className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  Clear all filters
                </button>
              }
            />
          </motion.div>
        )
      )}

      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        entityName={deleteTarget?.title}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
