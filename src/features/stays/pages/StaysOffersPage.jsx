import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Power,
  Trash2,
  Building2,
  Percent,
  Tag,
  X,
  TicketCheck,
  ArrowUp,
  Clock,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CountdownBadge from "@/components/shared/CountdownBadge";
import {
  listOffers,
  toggleOffer,
  deleteOffer,
  listProperties,
  STAYS_KEYS,
} from "../api";
import {
  OFFER_STATUS_CONFIG,
  OFFER_TYPE_LABELS,
  discountedPrice,
} from "../utils/offerStatus";
import { formatMoney } from "../utils/money";

const DEFAULT_STATUS_FILTER = "active";

const FADE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
};

/** "Available indefinitely" / "From …" / "Until …" / "… – …". */
function formatWindow(offer) {
  const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (!offer.startDate && !offer.endDate) return "Available indefinitely";
  if (offer.startDate && !offer.endDate) return `From ${formatDate(offer.startDate)}`;
  if (!offer.startDate && offer.endDate) return `Until ${formatDate(offer.endDate)}`;
  return `${formatDate(offer.startDate)} – ${formatDate(offer.endDate)}`;
}

/**
 * Special Offers — the Stays mirror of the Experiences offers page: the same
 * header + Create Offer flow, three stat tiles, search/type/status filters,
 * offer rows with the discount badge and capacity bar, the delete and detail
 * modals, and navigation into the three-step builder.
 */
export default function StaysOffersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: STAYS_KEYS.offers("All"),
    queryFn: () => listOffers({ filter: "All" }),
    staleTime: 20_000,
  });

  const { data: properties = [] } = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    staleTime: 60_000,
  });

  const propertiesById = useMemo(() => {
    const map = new Map();
    for (const property of properties) map.set(property.id, property);
    return map;
  }, [properties]);

  const nightlyPriceFor = (target) => {
    const property = propertiesById.get(target.propertyId);
    if (!property) return null;
    const room = (property.rooms || []).find((row) => row.id === target.roomId);
    return room?.price ?? property.rooms?.[0]?.price ?? (Number(property.pricePerNight) || null);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stays", "offers"] });
    queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
  };

  const toggleMutation = useMutation({
    mutationFn: (id) => toggleOffer(id),
    onSuccess: (updated) => {
      invalidate();
      toast.success(updated?.isActive ? "Offer activated" : "Offer deactivated");
    },
    onError: () => toast.error("Failed to toggle offer"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteOffer(id),
    onSuccess: () => {
      invalidate();
      toast.success("Offer deleted");
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete offer");
      setDeleteTarget(null);
    },
  });

  const filtered = offers.filter((offer) => {
    if (search && !offer.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && offer.offerType !== typeFilter) return false;
    if (statusFilter && offer.status !== statusFilter) return false;
    return true;
  });

  const hasFilters = search || typeFilter || statusFilter !== DEFAULT_STATUS_FILTER;
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter(DEFAULT_STATUS_FILTER);
  };

  const activeCount = offers.filter((offer) => offer.status === "active").length;
  const hiddenByStatusFilter = offers.length - activeCount;
  const isDefaultView = !search && !typeFilter && statusFilter === DEFAULT_STATUS_FILTER;

  const stats = [
    { label: "Total Offers", value: offers.length, icon: TicketCheck },
    { label: "Active", value: activeCount, icon: ArrowUp },
    {
      label: "Scheduled",
      value: offers.filter((offer) => offer.status === "scheduled").length,
      icon: Clock,
    },
  ];

  const renderDiscountBadge = (offer) =>
    offer.discountType === "FIXED_AMOUNT" ? (
      <>
        <DollarSign size={11} className="text-emerald-500 mb-0.5" />
        <span className="text-base sm:text-lg font-bold text-emerald-700 leading-none">
          {formatMoney(offer.fixedDiscountValue)}
        </span>
        <span className="text-[8px] sm:text-[9px] font-semibold text-emerald-500 uppercase tracking-wide">
          Off
        </span>
      </>
    ) : (
      <>
        <Percent size={11} className="text-emerald-500 mb-0.5" />
        <span className="text-base sm:text-lg font-bold text-emerald-700 leading-none">
          {offer.discountPercentage}
        </span>
        <span className="text-[8px] sm:text-[9px] font-semibold text-emerald-500 uppercase tracking-wide">
          Off
        </span>
      </>
    );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <motion.div
        {...FADE_UP}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-800">Special Offers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage promotional discounts and offers</p>
        </div>
        <button
          onClick={() => navigate("/stays/special-offers/build/new")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 transition-all"
        >
          <Plus size={18} />
          Create Offer
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div
        {...FADE_UP}
        transition={{ ...FADE_UP.transition, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border border-emerald-100/60 rounded-xl p-3 sm:p-4 hover:shadow-md hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all border-l-4 border-l-emerald-500"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center">
                  <Icon size={14} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-800">{stat.value}</p>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
                {stat.label}
              </p>
            </div>
          );
        })}
      </motion.div>

      {/* Filters */}
      <motion.div
        {...FADE_UP}
        transition={{ ...FADE_UP.transition, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-[42px] px-3 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
            aria-label="Filter by offer type"
          >
            <option value="">All Types</option>
            <option value="LIMITED_TIME">Limited Time</option>
            <option value="EARLY_BIRD">Early Bird</option>
            <option value="LAST_MINUTE">Last Minute</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-[42px] px-3 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>
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
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-28 rounded-xl border border-emerald-100/60 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div {...FADE_UP} className="text-center py-16">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Percent size={28} className="text-slate-300" />
          </div>
          {offers.length === 0 ? (
            <>
              <h3 className="text-base font-semibold text-slate-800 mb-1">No offers yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
                Create your first special offer to start promoting your properties with discounts
              </p>
              <button
                onClick={() => navigate("/stays/special-offers/build/new")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-all"
              >
                <Plus size={18} />
                Create Offer
              </button>
            </>
          ) : isDefaultView ? (
            <>
              <h3 className="text-base font-semibold text-slate-800 mb-1">No active offers</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
                Nothing is running right now. {hiddenByStatusFilter} of your {offers.length} offer
                {offers.length !== 1 ? "s are" : " is"} switched off, scheduled, or past its end
                date.
              </p>
              <button
                onClick={() => navigate("/stays/special-offers/build/new")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-all"
              >
                <Plus size={18} />
                Create Offer
              </button>
              <div className="mt-4">
                <button
                  onClick={() => setStatusFilter("")}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Show all {offers.length} offers
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-slate-800 mb-1">No matching offers</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
                Try adjusting your filters or search term
              </p>
              <button
                onClick={clearFilters}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Clear all filters
              </button>
            </>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-medium">
            Showing {filtered.length} of {offers.length} offer{offers.length !== 1 ? "s" : ""}
          </p>
          {filtered.map((offer, index) => {
            const statusCfg = OFFER_STATUS_CONFIG[offer.status] || OFFER_STATUS_CONFIG.inactive;
            const typeLabel = OFFER_TYPE_LABELS[offer.offerType] || offer.offerType;
            const capped = offer.capacityType === "CAPPED";
            const spotsUsed = capped ? ((offer.spotsSold / offer.maxSpots) * 100).toFixed(0) : 0;
            const firstTarget = offer.targets?.[0];

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
                className="group bg-white rounded-xl border border-emerald-100/60 shadow-sm hover:shadow-md hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all overflow-hidden"
              >
                <div className="flex items-stretch">
                  {firstTarget && (
                    <div className="relative w-20 sm:w-28 shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center">
                      <Building2 size={20} className="text-slate-400" />
                    </div>
                  )}

                  <div
                    className="flex-1 min-w-0 px-3 sm:px-4 py-3 cursor-pointer"
                    onClick={() => setSelectedOffer(offer)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800 leading-tight">
                            {firstTarget?.propertyName || offer.name}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border shrink-0",
                              statusCfg.bg,
                              statusCfg.text,
                              statusCfg.border,
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                          <span>{formatWindow(offer)}</span>
                          <span className="text-slate-300">·</span>
                          <span>{typeLabel}</span>
                          <span className="text-slate-300">·</span>
                          <span>
                            {offer.targets?.length || 0} propert
                            {(offer.targets?.length || 0) !== 1 ? "ies" : "y"}
                          </span>
                          {capped && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-amber-600 font-medium">
                                {offer.maxSpots - offer.spotsSold} left
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-0.5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/stays/special-offers/build/${offer.id}`);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors opacity-60 group-hover:opacity-100"
                          aria-label={`Edit ${offer.name}`}
                        >
                          <Edit size={15} className="text-slate-400" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleMutation.mutate(offer.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors opacity-60 group-hover:opacity-100"
                          aria-label={offer.isActive ? `Deactivate ${offer.name}` : `Activate ${offer.name}`}
                        >
                          <Power size={15} className="text-slate-400" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(offer.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-60 group-hover:opacity-100"
                          aria-label={`Delete ${offer.name}`}
                        >
                          <Trash2 size={15} className="text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                        <Tag size={10} className="text-emerald-500" />
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {offer.name}
                        </span>
                      </span>
                      {offer.status === "scheduled" && offer.startDate && (
                        <CountdownBadge targetDate={offer.startDate} label="Starts in" variant="start" />
                      )}
                      {offer.status === "active" && offer.startDate && offer.endDate && (
                        <CountdownBadge targetDate={offer.endDate} label="Ends in" variant="end" />
                      )}
                    </div>

                    {offer.targets?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {offer.targets.slice(0, 3).map((target) => {
                          const price = nightlyPriceFor(target);
                          return (
                            <span
                              key={`${target.propertyId}-${target.roomId || "all"}`}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600"
                            >
                              <div className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center shrink-0">
                                <Building2 size={9} className="text-slate-400" />
                              </div>
                              <span className="truncate max-w-[100px] sm:max-w-[140px]">
                                {target.roomLabel || target.propertyName}
                              </span>
                              {price ? (
                                <span className="text-emerald-600 font-semibold shrink-0">
                                  {formatMoney(discountedPrice(price, offer))}
                                </span>
                              ) : null}
                            </span>
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

                  <div className="flex flex-col items-center justify-center px-2 sm:px-3 bg-emerald-50/60 border-l border-emerald-100/60 shrink-0">
                    {renderDiscountBadge(offer)}
                  </div>
                </div>

                {capped && offer.maxSpots > 0 && (
                  <div className="h-1 bg-slate-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        spotsUsed >= 90 ? "bg-red-500" : spotsUsed >= 70 ? "bg-amber-500" : "bg-emerald-500",
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
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(event) => event.stopPropagation()}
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
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-800">
                    &ldquo;{offers.find((offer) => offer.id === deleteTarget)?.name}&rdquo;
                  </span>
                  ?
                </p>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget)}
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
        {selectedOffer &&
          (() => {
            const offer = selectedOffer;
            const statusCfg = OFFER_STATUS_CONFIG[offer.status] || OFFER_STATUS_CONFIG.inactive;
            const typeLabel = OFFER_TYPE_LABELS[offer.offerType] || offer.offerType;
            const capped = offer.capacityType === "CAPPED";
            const spotsUsed = capped ? ((offer.spotsSold / offer.maxSpots) * 100).toFixed(0) : 0;
            const headerAccent =
              offer.offerType === "EARLY_BIRD"
                ? "from-amber-500 to-amber-600"
                : offer.offerType === "LAST_MINUTE"
                  ? "from-rose-500 to-rose-600"
                  : "from-indigo-500 to-indigo-600";

            return (
              <motion.div
                key="stays-offer-detail-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={() => setSelectedOffer(null)}
              >
                <motion.div
                  key="stays-offer-detail-content"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  onClick={(event) => event.stopPropagation()}
                  className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col"
                >
                  <div className={cn("relative px-6 pt-6 pb-5 bg-linear-to-r text-white", headerAccent)}>
                    <button
                      onClick={() => setSelectedOffer(null)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-white/20 border-white/30 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        {statusCfg.label}
                      </span>
                      <span className="text-white/70 text-[11px] font-medium">{typeLabel}</span>
                    </div>
                    <h2 className="text-lg font-bold leading-tight pr-8">{offer.name}</h2>
                    <p className="text-white/80 text-xs mt-1">{formatWindow(offer)}</p>
                  </div>

                  <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-16 h-16 rounded-2xl flex flex-col items-center justify-center",
                          offer.discountType === "FIXED_AMOUNT"
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-emerald-50 border border-emerald-200",
                        )}
                      >
                        <Percent
                          size={14}
                          className={offer.discountType === "FIXED_AMOUNT" ? "text-blue-500" : "text-emerald-500"}
                        />
                        <span
                          className={cn(
                            "text-xl font-bold leading-none mt-0.5",
                            offer.discountType === "FIXED_AMOUNT" ? "text-blue-700" : "text-emerald-700",
                          )}
                        >
                          {offer.discountType === "FIXED_AMOUNT"
                            ? formatMoney(offer.fixedDiscountValue)
                            : `${offer.discountPercentage}`}
                        </span>
                        <span
                          className={cn(
                            "text-[8px] font-semibold uppercase tracking-wider",
                            offer.discountType === "FIXED_AMOUNT" ? "text-blue-500" : "text-emerald-500",
                          )}
                        >
                          {offer.discountType === "FIXED_AMOUNT" ? "Off" : "% Off"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {offer.discountType === "FIXED_AMOUNT"
                            ? `${formatMoney(offer.fixedDiscountValue)} off per booking`
                            : `${offer.discountPercentage}% discount`}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {offer.discountType === "FIXED_AMOUNT"
                            ? "Fixed amount discount"
                            : `Guests save ${offer.discountPercentage}% on this offer`}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem label="Offer Type" value={typeLabel} />
                      <DetailItem
                        label="Capacity"
                        value={capped ? `${offer.maxSpots - offer.spotsSold} left of ${offer.maxSpots}` : "Unlimited"}
                      />
                      <DetailItem
                        label="Valid Days"
                        value={
                          offer.timeSlotMode === "SPECIFIC_WEEKDAYS"
                            ? offer.specificWeekdays
                                ?.map((day) => day.charAt(0).toUpperCase() + day.slice(1))
                                .join(", ") || "—"
                            : "All Days"
                        }
                      />
                      {offer.promoCode && (
                        <DetailItem label="Promo Code" value={offer.promoCode} highlight />
                      )}
                      {offer.minQuantity && <DetailItem label="Min Nights" value={offer.minQuantity} />}
                      {offer.minSpendAmount && (
                        <DetailItem label="Min Spend" value={formatMoney(offer.minSpendAmount)} />
                      )}
                      {offer.maxRedemptionsPerCustomer && (
                        <DetailItem label="Max/Guest" value={offer.maxRedemptionsPerCustomer} />
                      )}
                      <DetailItem label="Stackable" value={offer.stackable ? "Yes" : "No"} />
                      {offer.offerType === "EARLY_BIRD" && (
                        <DetailItem
                          label="Advance Booking"
                          value={`${offer.earlyBirdAdvanceDays || 7}+ days`}
                        />
                      )}
                      {offer.offerType === "LAST_MINUTE" && (
                        <DetailItem
                          label="Booking Window"
                          value={`Within ${offer.lastMinuteWindowHours || 72}h`}
                        />
                      )}
                    </div>

                    {capped && offer.maxSpots > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-600">Capacity</span>
                          <span className="text-xs text-slate-500">
                            {offer.spotsSold} / {offer.maxSpots} used
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(Number(spotsUsed), 100)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full",
                              spotsUsed >= 90 ? "bg-red-500" : spotsUsed >= 70 ? "bg-amber-500" : "bg-emerald-500",
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {offer.targets?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-2">
                          Properties ({offer.targets.length})
                        </p>
                        <div className="space-y-1.5">
                          {offer.targets.map((target) => {
                            const price = nightlyPriceFor(target);
                            return (
                              <div
                                key={`${target.propertyId}-${target.roomId || "all"}`}
                                className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                              >
                                <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                  <Building2 size={14} className="text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-medium text-slate-700 truncate">
                                    {target.propertyName || "Property"}
                                  </p>
                                  {target.roomLabel && (
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {target.roomLabel}
                                    </p>
                                  )}
                                </div>
                                {price ? (
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-slate-400 line-through">
                                      {formatMoney(price)}
                                    </p>
                                    <p className="text-sm font-bold text-emerald-600">
                                      {formatMoney(discountedPrice(price, offer))}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedOffer(null);
                        navigate(`/stays/special-offers/build/${offer.id}`);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                      <Edit size={15} />
                      Edit Offer
                    </button>
                    <button
                      onClick={() => {
                        toggleMutation.mutate(offer.id);
                        setSelectedOffer(null);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      <Power size={15} />
                      {offer.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOffer(null);
                        setDeleteTarget(offer.id);
                      }}
                      className="inline-flex items-center justify-center w-10 h-10 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl transition-colors"
                      aria-label="Delete offer"
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

function DetailItem({ label, value, highlight }) {
  return (
    <div className="px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={cn("text-sm font-semibold", highlight ? "text-indigo-600 font-mono" : "text-slate-700")}>
        {value}
      </p>
    </div>
  );
}
