import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Grid3X3, List, Plus, Eye, Edit, Trash2,
  AlertCircle, RefreshCw, Package, Star, Percent, Clock, X,
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
import { describeActionError } from "@/lib/errorHandler";
import { useTeamRole } from "@/hooks/useTeamRole";
import { DENIED_ACTION_REASON } from "@/config/pageAccess";

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

function DraftStatusBadge({ product, variant = "soft" }) {
  if (product.status !== "ACTIVE") return null;
  const solid = variant === "solid";
  if (product.draftStatus === "PENDING_APPROVAL") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          solid ? "bg-amber-500 text-white shadow-sm" : "bg-amber-100 text-amber-700 border border-amber-200"
        }`}
      >
        Pending edits
      </span>
    );
  }
  if (product.draftStatus === "REJECTED") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          solid ? "bg-red-500 text-white shadow-sm" : "bg-red-100 text-red-700 border border-red-200"
        }`}
      >
        Edits rejected
      </span>
    );
  }
  return null;
}

function StorefrontBadge({ storefront }) {
  if (!storefront || storefront === "GHANA") return null;
  const isBoth = storefront === "BOTH";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
      isBoth
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : "bg-indigo-50 text-indigo-700 border-indigo-200"
    }`}>
      {isBoth ? "Both storefronts" : "Expedition"}
    </span>
  );
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
  // Opening the catalogue and deleting from it are separate permissions
  // (`tours.view` vs `tours.delete`), so a read-only role sees the list but
  // not a live delete button.
  const { hasPermission } = useTeamRole();
  const canDelete = hasPermission("tours.delete");
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
      toast.error(describeActionError(err, "Couldn't delete product"));
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
    const totalBookings = products.reduce((sum, p) => sum + (p.bookings || 0), 0);
    return { total, active, pending, rejected, draft, pendingEdits, totalBookings };
  }, [products]);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const hasFilters = search || categoryFilter !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Package size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Products</h1>
              {!isLoading && stats.total > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {stats.total}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Your tours, drafts and anything waiting on review.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40"
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => navigate("/products/build/new/type")}
            className="flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus size={15} />
            <span>Create product</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && !isError && stats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: "Live", value: stats.active, icon: Package, tint: "bg-emerald-50 text-emerald-600", hint: "Bookable right now" },
            { label: "Awaiting review", value: stats.pending, icon: Clock, tint: "bg-amber-50 text-amber-600", hint: "Submitted to the platform" },
            { label: "Pending edits", value: stats.pendingEdits, icon: Edit, tint: "bg-sky-50 text-sky-600", hint: "Live version stays on sale" },
            { label: "Drafts", value: stats.draft, icon: Edit, tint: "bg-slate-50 text-slate-500", hint: "Not submitted yet" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200/80 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-tight text-slate-500">{s.label}</p>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.tint}`}>
                  <s.icon size={14} />
                </span>
              </div>
              <p className="mt-1.5 text-xl font-bold tabular-nums leading-tight tracking-tight text-slate-900 sm:text-2xl">
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{s.hint}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filters + View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 flex-1 border-slate-200 bg-white text-xs font-medium text-slate-600 sm:w-[160px] sm:flex-none">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 flex-1 border-slate-200 bg-white text-xs font-medium text-slate-600 sm:w-[160px] sm:flex-none">
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
              className="h-9 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 self-start rounded-lg border border-slate-200 bg-white p-0.5">
          {[
            { key: "grid", icon: Grid3X3, label: "Grid view" },
            { key: "table", icon: List, label: "List view" },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                aria-label={v.label}
                aria-pressed={viewMode === v.key}
                className={cn(
                  "relative rounded-md p-1.5 transition-colors",
                  viewMode === v.key ? "text-white" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {viewMode === v.key && (
                  <motion.span
                    layoutId="viewTab"
                    className="absolute inset-0 rounded-md bg-emerald-600"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10"><Icon size={16} /></span>
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
      {!isLoading && !isError && products.length > 0 && (
        <p className="text-xs font-medium text-slate-500">
          Showing {filteredProducts.length} of {products.length} product{products.length !== 1 ? "s" : ""}
          {hasFilters && filteredProducts.length !== products.length && (
            <button onClick={handleClearFilters} className="ml-2 font-medium text-emerald-700 hover:underline">
              Clear filters
            </button>
          )}
        </p>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-rose-200 bg-white px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 ring-1 ring-red-100/60">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Failed to load products</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-xs">{error?.response?.data?.message || error?.message || "Something went wrong."}</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
            <RefreshCw size={14} /> Try Again
          </button>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        viewMode === "table" ? <TableSkeleton /> : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {!isLoading && !isError && viewMode === "grid" && filteredProducts.length > 0 && (
          <motion.div
            key="grid"
            variants={STAGGER}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4"
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
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white transition-colors hover:border-slate-300 hover:shadow-sm"
                >
                  {/* Image */}
                  <div
                    className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-slate-100"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    {src ? (
                      <>
                        {showSkeleton && <div className="absolute inset-0 animate-pulse bg-slate-100" />}
                        <OptimizedImage
                          src={src}
                          width={560}
                          alt={product.title}
                          className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${imgLoaded[pid] ? "opacity-100" : "opacity-0"}`}
                          onLoad={() => setImgLoaded((prev) => ({ ...prev, [pid]: true }))}
                          onError={() => {
                            setImgErrors((prev) => ({ ...prev, [pid]: true }));
                          }}
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package size={24} className="text-slate-300" />
                      </div>
                    )}

                    {product.storefront && product.storefront !== "GHANA" && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                        {product.storefront === "BOTH" ? "Both storefronts" : "Expedition"}
                      </span>
                    )}
                    {category && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                        {category}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent px-2.5 pb-2.5 pt-8">
                      {/* Filled badge: a tinted one needs a white plate to stay
                          readable over a photo, which read as a white pill
                          wearing a green border. */}
                      <StatusBadge status={product.status} label={PRODUCT_STATUSES[product.status]?.label} size="sm" variant="solid" />
                      <DraftStatusBadge product={product} variant="solid" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    <h3
                      className="line-clamp-2 cursor-pointer text-sm font-semibold leading-snug text-slate-900 transition-colors hover:text-emerald-700"
                      title={product.title}
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {product.title}
                    </h3>
                    {/* The supplier's own name on every card in their own
                        catalogue is noise; keep it only when browsing tours
                        that are not theirs. */}
                    {!usingSupplierEndpoint && (
                      <p className="mt-1 truncate text-xs text-slate-500">{getSupplierLabel(product)}</p>
                    )}

                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      {price !== null ? (
                        <div className="flex min-w-0 items-baseline gap-1">
                          <span className="text-base font-bold tabular-nums text-slate-900 sm:text-lg">
                            {formatCurrency(price, currency)}
                          </span>
                          <span className="hidden text-[11px] text-slate-400 sm:inline">/ person</span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">Price not set</span>
                      )}
                      <div className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-slate-500">
                        <span className="tabular-nums">{product.bookings ?? 0} booked</span>
                        {product.averageRating > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-600">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span className="tabular-nums">{product.averageRating}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      {/* The date is the first thing a 160px card can lose, and
                          the last thing a supplier needs. Keep it as a tooltip
                          hint rather than an ellipsis in the footer. */}
                      <span
                        className="hidden min-w-0 truncate text-[11px] text-slate-400 sm:inline"
                        title={`Updated ${formatDate(product.updatedAt)}`}
                      >
                        {formatDate(product.updatedAt)}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {(product.status === "ACTIVE" || product.status === "PAUSED") && product.storefront !== "EXPEDITION" && (
                          <button
                            onClick={() => navigate(`/special-offers/build/new/products?productId=${product.id}`)}
                            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 sm:p-1.5"
                            title="Create special offer"
                          >
                            <Percent size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 sm:p-1.5"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <PreviewMenu product={product} />
                        {usingSupplierEndpoint && product.storefront !== "EXPEDITION" && (
                          <>
                            <button
                              onClick={() => navigate(`/products/build/${product.id}/type`)}
                              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 sm:p-1.5"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <span title={canDelete ? undefined : DENIED_ACTION_REASON}>
                              <button
                                onClick={() => setDeleteTarget(product)}
                                disabled={!canDelete}
                                className={`rounded-md p-1 transition-colors sm:p-1.5 ${
                                  canDelete
                                    ? "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                    : "cursor-not-allowed text-slate-300"
                                }`}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {usingSupplierEndpoint && (
              <button
                onClick={() => navigate("/products/build/new/type")}
                className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                  <Plus size={18} />
                </span>
                <span className="text-sm font-medium text-slate-700">Create a product</span>
                <span className="max-w-[170px] text-xs leading-relaxed text-slate-400">
                  Add another tour or experience to your catalogue.
                </span>
              </button>
            )}
          </motion.div>
        )}

        {!isLoading && !isError && viewMode === "table" && filteredProducts.length > 0 && (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    {["Product", "Category", "Status", "Price", "Bookings", "Rating", "Updated", ""].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
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
                      className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {(() => { const rawUrl = product.coverPhoto || product.photos?.find(p => p); return rawUrl ? <OptimizedImage src={rawUrl} alt="" width={36} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-slate-300" /></div>; })()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate cursor-pointer hover:text-emerald-700 transition-colors" onClick={() => navigate(`/products/${product.id}`)}>
                                {product.title}
                              </p>
                              <StorefrontBadge storefront={product.storefront} />
                            </div>
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
                      <td className="px-4 py-3 text-sm text-slate-700">{product.bookings ?? 0}</td>
                      <td className="px-4 py-3">
                        {product.averageRating > 0
                          ? <span className="flex items-center gap-1 text-sm text-amber-600 font-medium"><Star size={12} className="fill-amber-400 text-amber-400" />{product.averageRating}</span>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(product.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {(product.status === "ACTIVE" || product.status === "PAUSED") && product.storefront !== "EXPEDITION" && (
                            <button onClick={() => navigate(`/special-offers/build/new/products?productId=${product.id}`)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Create special offer"><Percent size={14} /></button>
                          )}
                          <button onClick={() => navigate(`/products/${product.id}`)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View"><Eye size={14} /></button>
                          <PreviewMenu product={product} />
                          {usingSupplierEndpoint && product.storefront !== "EXPEDITION" && (
                            <>
                              <button onClick={() => navigate(`/products/build/${product.id}/type`)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit"><Edit size={14} /></button>
                              <span title={canDelete ? undefined : DENIED_ACTION_REASON}>
                                <button
                                  onClick={() => setDeleteTarget(product)}
                                  disabled={!canDelete}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    canDelete
                                      ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
                                      : "text-slate-300 cursor-not-allowed"
                                  }`}
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </span>
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
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <Plus size={16} /> Create product
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
