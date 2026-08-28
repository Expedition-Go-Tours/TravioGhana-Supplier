import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, Edit, Power, Trash2, Package, Percent, Tag, X, TicketCheck, ArrowUp, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { fetchSpecialOffers, deleteSpecialOffer, toggleSpecialOffer } from "@/features/special-offers/api";
import { startPriceOf } from "@/features/special-offers/utils/catalogue";
import LoadingSkeleton from "@/components/shared/Skeleton";
import CountdownBadge from "@/components/shared/CountdownBadge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const OFFER_TYPE_LABELS = { LIMITED_TIME: "Limited Time", EARLY_BIRD: "Early Bird", LAST_MINUTE: "Last Minute" };

const STATUS_CONFIG = {
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  scheduled: { label: "Scheduled", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  expired: { label: "Expired", dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200" },
  inactive: { label: "Inactive", dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
};

const FADE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
};

export default function SpecialOffersListPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSpecialOffers();
      setOffers(res.data?.data?.offers || []);
    } catch { toast.error("Failed to load offers"); }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filtered = offers.filter((o) => {
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && o.offerType !== typeFilter) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  });

  const handleDelete = async (id) => {
    setDeleteTarget(id);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSpecialOffer(deleteTarget);
      toast.success("Offer deleted");
      setDeleteTarget(null);
      load();
    } catch { toast.error("Failed to delete offer"); setDeleteTarget(null); }
  };
  const cancelDelete = () => setDeleteTarget(null);

  const handleToggle = async (id) => {
    try {
      const res = await toggleSpecialOffer(id);
      const updated = res.data?.data?.offer;
      toast.success(updated?.isActive ? "Offer activated" : "Offer deactivated");
      load();
    } catch { toast.error("Failed to toggle offer"); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  // Tier-aware cheapest retail price (falls back to the base price when the
  // tour has no tiers), so offer chips quote what a real checkout charges.
  const getTourPrice = (tour) => startPriceOf(tour)?.price ?? null;
  // Window-less offers (EARLY_BIRD/LAST_MINUTE with no dates) are open-ended.
  const formatWindow = (o) => {
    if (!o.startDate && !o.endDate) return "Available indefinitely";
    if (o.startDate && !o.endDate) return `From ${formatDate(o.startDate)}`;
    if (!o.startDate && o.endDate) return `Until ${formatDate(o.endDate)}`;
    return `${formatDate(o.startDate)} – ${formatDate(o.endDate)}`;
  };
  const discountPrice = (price, o) =>
    o.discountType === "FIXED_AMOUNT"
      ? Math.max((price || 0) - (o.fixedDiscountValue || 0), 0)
      : Math.round((price || 0) * (1 - (o.discountPercentage || 0) / 100));

  const hasFilters = search || typeFilter || statusFilter;
  const clearFilters = () => { setSearch(""); setTypeFilter(""); setStatusFilter(""); };

  const stats = [
    { label: "Total Offers", value: offers.length, icon: TicketCheck, accent: "border-l-emerald-500", iconBg: "bg-emerald-50", iconBorder: "border-emerald-200", iconColor: "text-emerald-600" },
    { label: "Active", value: offers.filter((o) => o.status === "active").length, icon: ArrowUp, accent: "border-l-emerald-500", iconBg: "bg-emerald-50", iconBorder: "border-emerald-200", iconColor: "text-emerald-600" },
    { label: "Scheduled", value: offers.filter((o) => o.status === "scheduled").length, icon: Clock, accent: "border-l-emerald-500", iconBg: "bg-emerald-50", iconBorder: "border-emerald-200", iconColor: "text-emerald-600" },
  ];

  return (
    <div className="p-5 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div {...FADE_UP} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Special Offers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage promotional discounts and offers</p>
        </div>
        <button
          onClick={() => navigate("/special-offers/build/new")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 transition-all"
        >
          <Plus size={18} />
          Create Offer
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div {...FADE_UP} transition={{ ...FADE_UP.transition, delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn("bg-white border border-emerald-100/60 rounded-xl p-3 sm:p-4 hover:shadow-md hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all border-l-4", s.accent)}>
              <div className="flex items-center justify-between mb-2.5">
                <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center", s.iconBg, s.iconBorder)}>
                  <Icon size={14} className={s.iconColor} />
                </div>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-800">{s.value}</p>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Filters */}
      <motion.div {...FADE_UP} transition={{ ...FADE_UP.transition, delay: 0.1 }} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="LIMITED_TIME">Limited Time</SelectItem>
              <SelectItem value="EARLY_BIRD">Early Bird</SelectItem>
              <SelectItem value="LAST_MINUTE">Last Minute</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} className="!h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div {...FADE_UP} className="text-center py-16">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Percent size={28} className="text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            {hasFilters ? "No matching offers" : "No offers yet"}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
            {hasFilters
              ? "Try adjusting your filters or search term"
              : "Create your first special offer to start promoting your tours with discounts"}
          </p>
          {!hasFilters && (
            <button
              onClick={() => navigate("/special-offers/build/new")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-all"
            >
              <Plus size={18} />
              Create Offer
            </button>
          )}
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Clear all filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-medium">
            Showing {filtered.length} of {offers.length} offer{offers.length !== 1 ? "s" : ""}
          </p>
          {filtered.map((offer, i) => {
            const statusCfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.inactive;
            const typeLabel = OFFER_TYPE_LABELS[offer.offerType] || offer.offerType;
            const capped = offer.capacityType === "CAPPED";
            const spotsUsed = capped ? ((offer.spotsSold / offer.maxSpots) * 100).toFixed(0) : 0;
            const firstTarget = offer.targets?.[0];
            const tour = firstTarget?.tour || firstTarget;

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
                className="group bg-white rounded-xl border border-emerald-100/60 shadow-sm hover:shadow-md hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all overflow-hidden"
              >
                {/* Top row: image + content + discount */}
                <div className="flex items-stretch">
                  {/* Product image */}
                  {firstTarget && (
                    <div className="relative w-20 sm:w-28 shrink-0 overflow-hidden">
                      <button
                        onClick={() => navigate(`/products/${tour?.id || firstTarget.tourId}`)}
                        className="absolute inset-0 z-10"
                        aria-label="View product"
                      />
                      {tour?.photos?.[0] || firstTarget.tourPhoto ? (
                        <OptimizedImage src={tour?.photos?.[0] || firstTarget.tourPhoto} alt="" width={112} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <Package size={20} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div
                    className="flex-1 min-w-0 px-3 sm:px-4 py-3 cursor-pointer"
                    onClick={() => setSelectedOffer(offer)}
                  >
                    {/* Title row with status + menu */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const t = offer.targets?.[0]?.tour || offer.targets?.[0];
                              if (t) navigate(`/products/${t.id || t.tourId}`);
                            }}
                            className="text-sm font-semibold text-slate-800 hover:text-emerald-600 transition-colors text-left leading-tight"
                          >
                            {firstTarget
                              ? (tour?.title || firstTarget.tourTitle || "Tour")
                              : offer.name}
                          </button>
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border shrink-0",
                            statusCfg.bg, statusCfg.text, statusCfg.border
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                            {statusCfg.label}
                          </span>
                        </div>
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                          <span>{formatWindow(offer)}</span>
                          <span className="text-slate-300">·</span>
                          <span>{typeLabel}</span>
                          <span className="text-slate-300">·</span>
                          <span>{offer.targets?.length || 0} product{(offer.targets?.length || 0) !== 1 ? "s" : ""}</span>
                          {capped && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-amber-600 font-medium">{offer.maxSpots - offer.spotsSold} left</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Menu button */}
                      <div className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors opacity-50 group-hover:opacity-100 focus:opacity-100">
                              <MoreVerticalIcon size={15} className="text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => navigate(`/special-offers/build/${offer.id}`)}>
                              <Edit size={15} /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggle(offer.id)}>
                              <Power size={15} /> {offer.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(offer.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                              <Trash2 size={15} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Offer name + countdown */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                        <Tag size={10} className="text-emerald-500" />
                        <span className="text-[11px] font-semibold text-emerald-700">{offer.name}</span>
                      </span>
                      {offer.status === "scheduled" && offer.startDate && (
                        <CountdownBadge targetDate={offer.startDate} label="Starts in" variant="start" />
                      )}
                      {offer.status === "active" && offer.startDate && offer.endDate && (
                        <CountdownBadge targetDate={offer.endDate} label="Ends in" variant="end" />
                      )}
                    </div>

                    {/* Product chips */}
                    {offer.targets?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {offer.targets.slice(0, 3).map((t) => {
                          const tData = t.tour || t;
                          const price = getTourPrice(t.tour);
                          return (
                            <button
                              key={t.id || t.tourId}
                              onClick={(e) => { e.stopPropagation(); navigate(`/products/${tData.id || t.tourId}`); }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer"
                            >
                              <div className="w-4 h-4 rounded bg-slate-200 overflow-hidden shrink-0">
                                {tData.photos?.[0] || t.tourPhoto ? (
                                  <OptimizedImage src={tData.photos?.[0] || t.tourPhoto} alt="" width={16} className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={9} className="text-slate-400 m-auto" />
                                )}
                              </div>
                              <span className="truncate max-w-[100px] sm:max-w-[140px]">{tData.title || t.tourTitle || "Tour"}</span>
                              {price && (
                                <span className="text-emerald-600 font-semibold shrink-0">
                                  ${discountPrice(price, offer)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {offer.targets.length > 3 && (
                          <span className="px-2 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] text-slate-400">
                            +{offer.targets.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Discount badge (right side) */}
                  <div className="flex flex-col items-center justify-center px-2 sm:px-3 bg-emerald-50/60 border-l border-emerald-100/60 shrink-0">
                    {offer.discountType === "FIXED_AMOUNT" ? (
                      <>
                        <DollarSign size={11} className="text-emerald-500 mb-0.5" />
                        <span className="text-base sm:text-lg font-bold text-emerald-700 leading-none">${offer.fixedDiscountValue}</span>
                        <span className="text-[8px] sm:text-[9px] font-semibold text-emerald-500 uppercase tracking-wide">Off</span>
                      </>
                    ) : (
                      <>
                        <Percent size={11} className="text-emerald-500 mb-0.5" />
                        <span className="text-base sm:text-lg font-bold text-emerald-700 leading-none">{offer.discountPercentage}</span>
                        <span className="text-[8px] sm:text-[9px] font-semibold text-emerald-500 uppercase tracking-wide">Off</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Capacity progress bar */}
                {capped && offer.maxSpots > 0 && (
                  <div className="h-1 bg-slate-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        spotsUsed >= 90 ? "bg-red-500" : spotsUsed >= 70 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(Number(spotsUsed), 100)}%` }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6"
            >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Delete offer</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <span className="font-semibold text-slate-800">&ldquo;{offers.find((o) => o.id === deleteTarget)?.name}&rdquo;</span>?
              </p>
              {(() => {
                const target = offers.find((o) => o.id === deleteTarget);
                const tours = target?.targets?.slice(0, 3) || [];
                if (tours.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {tours.map((t) => {
                      const tData = t.tour || t;
                      return (
                        <span key={t.id || t.tourId} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600">
                          <div className="w-4 h-4 rounded bg-slate-200 overflow-hidden shrink-0">
                            {(tData.photos?.[0] || t.tourPhoto) ? (
                              <img src={tData.photos?.[0] || t.tourPhoto} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <Package size={9} className="text-slate-400 m-auto" />
                            )}
                          </div>
                          {tData.title || t.tourTitle || "Tour"}
                        </span>
                      );
                    })}
                    {(target?.targets?.length || 0) > 3 && (
                      <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-400">
                        +{target.targets.length - 3} more
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedOffer && (() => {
          const o = selectedOffer;
          const statusCfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.inactive;
          const typeLabel = OFFER_TYPE_LABELS[o.offerType] || o.offerType;
          const capped = o.capacityType === "CAPPED";
          const spotsUsed = capped ? ((o.spotsSold / o.maxSpots) * 100).toFixed(0) : 0;
          const headerAccent = o.offerType === "EARLY_BIRD" ? "from-amber-500 to-amber-600" : o.offerType === "LAST_MINUTE" ? "from-rose-500 to-rose-600" : "from-indigo-500 to-indigo-600";

          const handleModalEdit = () => { setSelectedOffer(null); navigate(`/special-offers/build/${o.id}`); };
          const handleModalToggle = async () => {
            try {
              const res = await toggleSpecialOffer(o.id);
              const updated = res.data?.data?.offer;
              toast.success(updated?.isActive ? "Offer activated" : "Offer deactivated");
              setSelectedOffer(null);
              load();
            } catch { toast.error("Failed to toggle offer"); }
          };
          const handleModalDelete = () => { setSelectedOffer(null); setDeleteTarget(o.id); };

          return (
            <motion.div
              key="detail-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedOffer(null)}
            >
              <motion.div
                key="detail-modal-content"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col"
              >
                {/* Header accent strip */}
                <div className={cn("relative px-6 pt-6 pb-5 bg-linear-to-r text-white", headerAccent)}>
                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
                      "bg-white/20 border-white/30 text-white"
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {statusCfg.label}
                    </span>
                    <span className="text-white/70 text-[11px] font-medium">{typeLabel}</span>
                  </div>
                  <h2 className="text-lg font-bold leading-tight pr-8">{o.name}</h2>
                  <p className="text-white/80 text-xs mt-1">
                    {formatWindow(o)}
                  </p>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                  {/* Discount highlight */}
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex flex-col items-center justify-center",
                      o.discountType === "FIXED_AMOUNT" ? "bg-blue-50 border border-blue-200" : "bg-emerald-50 border border-emerald-200"
                    )}>
                      <Percent size={14} className={o.discountType === "FIXED_AMOUNT" ? "text-blue-500" : "text-emerald-500"} />
                      <span className={cn("text-xl font-bold leading-none mt-0.5", o.discountType === "FIXED_AMOUNT" ? "text-blue-700" : "text-emerald-700")}>
                        {o.discountType === "FIXED_AMOUNT" ? `$${o.fixedDiscountValue}` : `${o.discountPercentage}`}
                      </span>
                      <span className={cn("text-[8px] font-semibold uppercase tracking-wider", o.discountType === "FIXED_AMOUNT" ? "text-blue-500" : "text-emerald-500")}>
                        {o.discountType === "FIXED_AMOUNT" ? "Off" : "% Off"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {o.discountType === "FIXED_AMOUNT"
                          ? `$${o.fixedDiscountValue} off per booking`
                          : `${o.discountPercentage}% discount`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {o.discountType === "FIXED_AMOUNT"
                          ? `Fixed amount discount`
                          : `Customers save ${o.discountPercentage}% on this offer`}
                      </p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="Offer Type" value={typeLabel} />
                    <DetailItem label="Capacity" value={capped ? `${o.maxSpots - o.spotsSold} spots left of ${o.maxSpots}` : "Unlimited"} />
                    <DetailItem label="Valid Days" value={o.timeSlotMode === "SPECIFIC_WEEKDAYS" ? o.specificWeekdays?.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") || "—" : "All Days"} />
                    {o.promoCode && <DetailItem label="Promo Code" value={o.promoCode} highlight />}
                    {o.minQuantity && <DetailItem label="Min Travelers" value={o.minQuantity} />}
                    {o.minSpendAmount && <DetailItem label="Min Spend" value={`$${o.minSpendAmount}`} />}
                    {o.maxRedemptionsPerCustomer && <DetailItem label="Max/Customer" value={o.maxRedemptionsPerCustomer} />}
                    <DetailItem label="Stackable" value={o.stackable ? "Yes" : "No"} />
                    {o.offerType === "EARLY_BIRD" && <DetailItem label="Advance Booking" value={`${o.earlyBirdAdvanceDays || 7}+ days`} />}
                    {o.offerType === "LAST_MINUTE" && <DetailItem label="Booking Window" value={`Within ${o.lastMinuteWindowHours || 72}h`} />}
                  </div>

                  {/* Capacity bar (capped only) */}
                  {capped && o.maxSpots > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-600">Capacity</span>
                        <span className="text-xs text-slate-500">{o.spotsSold} / {o.maxSpots} sold</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(Number(spotsUsed), 100)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full",
                            spotsUsed >= 90 ? "bg-red-500" : spotsUsed >= 70 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {o.targets?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">
                        Products ({o.targets.length})
                      </p>
                      <div className="space-y-1.5">
                        {o.targets.map((t) => {
                          const tData = t.tour || t;
                          const price = getTourPrice(t.tour);
                          return (
                            <button
                              key={t.id || t.tourId}
                              onClick={() => { setSelectedOffer(null); navigate(`/products/${tData.id || t.tourId}`); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                {tData.photos?.[0] || t.tourPhoto ? (
                                  <OptimizedImage src={tData.photos?.[0] || t.tourPhoto} alt="" width={40} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package size={14} className="text-slate-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 truncate transition-colors">
                                  {tData.title || t.tourTitle || "Tour"}
                                </p>
                                {t.tourOptionLabel && (
                                  <p className="text-[11px] text-slate-400 truncate">{t.tourOptionLabel}</p>
                                )}
                              </div>
                              {price && (
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-slate-400 line-through">${Math.round(price)}</p>
                                  <p className="text-sm font-bold text-emerald-600">
                                    ${discountPrice(price, o)}
                                  </p>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
                  <button
                    onClick={handleModalEdit}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    <Edit size={15} />
                    Edit Offer
                  </button>
                  <button
                    onClick={handleModalToggle}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Power size={15} />
                    {o.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={handleModalDelete}
                    className="inline-flex items-center justify-center w-10 h-10 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

function MoreVerticalIcon({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function DetailItem({ label, value, highlight }) {
  return (
    <div className="px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={cn("text-sm font-semibold", highlight ? "text-indigo-600 font-mono" : "text-slate-700")}>{value}</p>
    </div>
  );
}

