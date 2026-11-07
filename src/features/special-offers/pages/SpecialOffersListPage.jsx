import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Power,
  Trash2,
  Package,
  Percent,
  Tag,
  X,
  TicketCheck,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { fetchSpecialOffers, deleteSpecialOffer, toggleSpecialOffer } from "@/features/special-offers/api";
import { startPriceOf } from "@/features/special-offers/utils/catalogue";
import { STATUS_CONFIG } from "@/features/special-offers/utils/status";
import CountdownBadge from "@/components/shared/CountdownBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
import { describeActionError } from "@/lib/errorHandler";

const OFFER_TYPE_LABELS = { LIMITED_TIME: "Limited Time", EARLY_BIRD: "Early Bird", LAST_MINUTE: "Last Minute" };

// Suppliers come here to manage what's running, so the list opens on the
// offers a customer can actually claim rather than every dead row they've
// ever created. "All" is the way back to everything.
const DEFAULT_STATUS_FILTER = "active";

const FADE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.expired;
  return (
    <span className={cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
      cfg.bg, cfg.text, cfg.border,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function Discount({ offer, size = "lg" }) {
  const isFixed = offer.discountType === "FIXED_AMOUNT";
  return (
    <div className="flex flex-col items-center justify-center leading-none">
      <span className={cn(
        "font-bold tabular-nums text-emerald-700",
        size === "lg" ? "text-xl" : "text-base",
      )}>
        {isFixed ? `$${offer.fixedDiscountValue}` : `${offer.discountPercentage}%`}
      </span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-emerald-600">off</span>
    </div>
  );
}

export default function SpecialOffersListPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSpecialOffers();
      setOffers(res.data?.data?.offers || []);
    } catch (err) { toast.error(describeActionError(err, "Couldn't load offers")); }
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSpecialOffer(deleteTarget);
      toast.success("Offer deleted");
      setDeleteTarget(null);
      load();
    } catch (err) { toast.error(describeActionError(err, "Couldn't delete offer")); setDeleteTarget(null); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleSpecialOffer(id);
      const updated = res.data?.data?.offer;
      toast.success(updated?.isActive ? "Offer activated" : "Offer deactivated");
      load();
    } catch (err) { toast.error(describeActionError(err, "Couldn't toggle offer")); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  // Tier-aware cheapest retail price (falls back to the base price when the
  // tour has no tiers), so offer chips quote what a real checkout charges.
  const getTourPrice = (tour) => startPriceOf(tour)?.price ?? null;
  // Window-less offers (EARLY_BIRD/LAST_MINUTE with no dates) are open-ended.
  const formatWindow = (o) => {
    if (!o.startDate && !o.endDate) return "No end date";
    if (o.startDate && !o.endDate) return `From ${formatDate(o.startDate)}`;
    if (!o.startDate && o.endDate) return `Until ${formatDate(o.endDate)}`;
    return `${formatDate(o.startDate)} – ${formatDate(o.endDate)}`;
  };
  const discountPrice = (price, o) =>
    o.discountType === "FIXED_AMOUNT"
      ? Math.max((price || 0) - (o.fixedDiscountValue || 0), 0)
      : Math.round((price || 0) * (1 - (o.discountPercentage || 0) / 100));

  // The default status filter is the page's resting state, not an active
  // choice — otherwise every load would count as "filtered", which hides the
  // Create Offer CTA from the empty state and offers a Clear button that
  // clears nothing.
  const hasFilters = search || typeFilter || statusFilter !== DEFAULT_STATUS_FILTER;
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter(DEFAULT_STATUS_FILTER);
  };
  const countByStatus = (status) => offers.filter((o) => o.status === status).length;
  const activeCount = countByStatus("active");
  const hiddenByStatusFilter = offers.length - activeCount;
  // True when nothing but the resting Active default is narrowing the list.
  const isDefaultView = !search && !typeFilter && statusFilter === DEFAULT_STATUS_FILTER;

  const statusTabs = [
    { key: "", label: "All", count: offers.length },
    { key: "active", label: "Active", count: activeCount },
    { key: "scheduled", label: "Scheduled", count: countByStatus("scheduled") },
    { key: "expired", label: "Expired", count: countByStatus("expired") },
  ];

  const deleteOffer = offers.find((o) => o.id === deleteTarget);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <motion.div {...FADE_UP} className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <TicketCheck size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Special Offers</h1>
              {activeCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {activeCount} live
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Discounts running across your tours.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/special-offers/build/new")}
          className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 sm:mt-0.5 sm:w-auto"
        >
          <Plus size={16} />
          Create offer
        </button>
      </motion.div>

      {/* Status tabs — the counts are the summary, so the old four stat cards
          had nothing left to say. With no offers at all the filters are noise,
          so the empty state owns the page instead. */}
      {!loading && offers.length > 0 && (
        <>
      <motion.div {...FADE_UP} transition={{ ...FADE_UP.transition, delay: 0.05 }} className="mt-5 flex items-center gap-1 overflow-x-auto border-b border-slate-200">
        {statusTabs.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              aria-pressed={active}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
              )}
            >
              {tab.label}
              <span className={cn(
                "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Filters */}
      <motion.div {...FADE_UP} transition={{ ...FADE_UP.transition, delay: 0.1 }} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search offers by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search offers"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-600 sm:w-[150px]" aria-label="Offer type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="LIMITED_TIME">Limited Time</SelectItem>
              <SelectItem value="EARLY_BIRD">Early Bird</SelectItem>
              <SelectItem value="LAST_MINUTE">Last Minute</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} />
              Clear
            </button>
          )}
        </div>
      </motion.div>
        </>
      )}

      {/* Content */}
      {loading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <div className="hidden w-32 shrink-0 animate-pulse bg-slate-100 sm:block" />
              <div className="flex-1 space-y-2.5 p-4">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-50" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div {...FADE_UP} className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Percent size={20} className="text-emerald-600" />
          </div>
          {/* Three genuinely different situations — collapsing them into one
              "nothing here" message is what made the default Active filter
              feel like it was hiding the supplier's work. */}
          {offers.length === 0 ? (
            <>
              <h2 className="mt-4 text-sm font-semibold text-slate-800">No offers yet</h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                Create an offer to discount a tour for a limited time, early bookers or last-minute travellers.
              </p>
              <button
                onClick={() => navigate("/special-offers/build/new")}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <Plus size={16} />
                Create offer
              </button>
            </>
          ) : isDefaultView ? (
            <>
              <h2 className="mt-4 text-sm font-semibold text-slate-800">No active offers</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Nothing is running right now. {hiddenByStatusFilter} of your {offers.length} offer
                {offers.length !== 1 ? "s are" : " is"} switched off, scheduled, or past its end date.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => navigate("/special-offers/build/new")}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <Plus size={16} />
                  Create offer
                </button>
                <button onClick={() => setStatusFilter("")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  Show all {offers.length} offers
                </button>
              </div>
            </>
          ) : statusFilter && !search && !typeFilter ? (
            /* A status filter that matches nothing is not "adjust your filters"
               — it's an answer: nothing is in that state. Say so, and hand back
               a way out instead of a dead end. */
            <>
              <h2 className="mt-4 text-sm font-semibold text-slate-800">
                No {STATUS_CONFIG[statusFilter]?.label?.toLowerCase() || statusFilter} offers
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                None of your {offers.length} offer{offers.length !== 1 ? "s have" : " has"} that status right now.
              </p>
              <button onClick={() => setStatusFilter("")} className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                Show all {offers.length} offers
              </button>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-sm font-semibold text-slate-800">No matching offers</h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                No offer matches this search and filter.
              </p>
              <button onClick={clearFilters} className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                Clear all filters
              </button>
            </>
          )}
        </motion.div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-slate-400">
            Showing {filtered.length} of {offers.length} offer{offers.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {filtered.map((offer, i) => {
              const typeLabel = OFFER_TYPE_LABELS[offer.offerType] || offer.offerType;
              const capped = offer.capacityType === "CAPPED";
              const spotsUsed = capped ? Math.round((offer.spotsSold / offer.maxSpots) * 100) : 0;
              const firstTarget = offer.targets?.[0];
              const tour = firstTarget?.tour || firstTarget;
              const tourTitle = firstTarget ? (tour?.title || firstTarget.tourTitle || "Tour") : offer.name;

              return (
                <motion.article
                  key={offer.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
                  className="group flex overflow-hidden rounded-xl border border-slate-200/80 bg-white transition-colors hover:border-slate-300"
                >
                  {/* Product image */}
                  {firstTarget && (
                    <button
                      onClick={() => navigate(`/products/${tour?.id || firstTarget.tourId}`)}
                      className="relative hidden w-32 shrink-0 overflow-hidden bg-slate-100 sm:block"
                      aria-label={`View ${tourTitle}`}
                    >
                      {tour?.photos?.[0] || firstTarget.tourPhoto ? (
                        <OptimizedImage src={tour?.photos?.[0] || firstTarget.tourPhoto} alt="" width={128} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package size={20} className="text-slate-400" />
                        </div>
                      )}
                    </button>
                  )}

                  {/* Content */}
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <StatusPill status={offer.status} />
                          <span className="text-[11px] font-medium text-slate-500">{typeLabel}</span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            <Tag size={10} className="text-slate-400" />
                            {offer.name}
                          </span>
                          {offer.status === "scheduled" && offer.startDate && (
                            <CountdownBadge targetDate={offer.startDate} label="Starts in" variant="start" />
                          )}
                          {offer.status === "active" && offer.startDate && offer.endDate && (
                            <CountdownBadge targetDate={offer.endDate} label="Ends in" variant="end" />
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedOffer(offer)}
                          className="mt-1.5 line-clamp-2 block w-full text-left text-[15px] font-semibold text-slate-900 transition-colors hover:text-emerald-700"
                          title={tourTitle}
                        >
                          {tourTitle}
                        </button>

                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                          <span>{formatWindow(offer)}</span>
                          <span className="text-slate-300">·</span>
                          <span>{offer.targets?.length || 0} product{(offer.targets?.length || 0) !== 1 ? "s" : ""}</span>
                          {capped && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className={cn("font-medium", offer.maxSpots - offer.spotsSold <= 0 ? "text-red-600" : "text-amber-600")}>
                                {Math.max(offer.maxSpots - offer.spotsSold, 0)} spots left
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => navigate(`/special-offers/build/${offer.id}`)}
                          className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 sm:inline-flex"
                        >
                          <Edit size={13} />
                          Edit
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              aria-label={`Actions for ${offer.name}`}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => navigate(`/special-offers/build/${offer.id}`)} className="sm:hidden">
                              <Edit size={15} /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggle(offer.id)}>
                              <Power size={15} /> {offer.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget(offer.id)} className="text-red-600 focus:bg-red-50 focus:text-red-600">
                              <Trash2 size={15} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Products */}
                    {offer.targets?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {offer.targets.slice(0, 3).map((t) => {
                          const tData = t.tour || t;
                          const price = getTourPrice(t.tour);
                          return (
                            <button
                              key={t.id || t.tourId}
                              onClick={() => navigate(`/products/${tData.id || t.tourId}`)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2 text-[11px] text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                            >
                              <span className="h-5 w-5 shrink-0 overflow-hidden rounded bg-slate-200">
                                {tData.photos?.[0] || t.tourPhoto ? (
                                  <OptimizedImage src={tData.photos?.[0] || t.tourPhoto} alt="" width={20} className="h-full w-full object-cover" />
                                ) : (
                                  <Package size={10} className="m-auto text-slate-400" />
                                )}
                              </span>
                              <span className="max-w-[120px] truncate sm:max-w-[170px]">{tData.title || t.tourTitle || "Tour"}</span>
                              {price && (
                                <span className="shrink-0 font-semibold text-emerald-700">
                                  ${discountPrice(price, offer)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {offer.targets.length > 3 && (
                          <span className="rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                            +{offer.targets.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Capacity */}
                    {capped && offer.maxSpots > 0 && (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{offer.spotsSold} of {offer.maxSpots} spots used</span>
                          <span className={cn("font-medium", spotsUsed >= 90 ? "text-red-600" : spotsUsed >= 70 ? "text-amber-600" : "text-emerald-600")}>
                            {spotsUsed}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              spotsUsed >= 90 ? "bg-red-500" : spotsUsed >= 70 ? "bg-amber-500" : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.min(spotsUsed, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Discount */}
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center border-l border-slate-100 bg-slate-50/70 sm:w-24">
                    <Discount offer={offer} />
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete offer?"
        description={deleteOffer ? `"${deleteOffer.name}" will stop applying immediately. This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Detail modal */}
      <AnimatePresence>
        {selectedOffer && (() => {
          const o = selectedOffer;
          const capped = o.capacityType === "CAPPED";
          const spotsUsed = capped ? Math.round((o.spotsSold / o.maxSpots) * 100) : 0;
          const typeLabel = OFFER_TYPE_LABELS[o.offerType] || o.offerType;

          const handleModalEdit = () => { setSelectedOffer(null); navigate(`/special-offers/build/${o.id}`); };
          const handleModalToggle = async () => {
            try {
              const res = await toggleSpecialOffer(o.id);
              const updated = res.data?.data?.offer;
              toast.success(updated?.isActive ? "Offer activated" : "Offer deactivated");
              setSelectedOffer(null);
              load();
            } catch (err) { toast.error(describeActionError(err, "Couldn't toggle offer")); }
          };
          const handleModalDelete = () => { setSelectedOffer(null); setDeleteTarget(o.id); };

          return (
            <motion.div
              key="detail-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
              onClick={() => setSelectedOffer(null)}
            >
              <motion.div
                key="detail-modal-content"
                role="dialog"
                aria-modal="true"
                aria-label={o.name}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={o.status} />
                      <span className="text-[11px] font-medium text-slate-500">{typeLabel}</span>
                    </div>
                    <h2 className="mt-2 truncate text-lg font-bold text-slate-900">{o.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{formatWindow(o)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
                  {/* Discount summary */}
                  <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-emerald-100">
                      <Discount offer={o} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {o.discountType === "FIXED_AMOUNT"
                          ? `$${o.fixedDiscountValue} off per booking`
                          : `${o.discountPercentage}% off`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {o.discountType === "FIXED_AMOUNT"
                          ? "Fixed amount, applied at checkout."
                          : "Applied to the tour price at checkout."}
                      </p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <DetailItem label="Offer type" value={typeLabel} />
                    <DetailItem label="Capacity" value={capped ? `${Math.max(o.maxSpots - o.spotsSold, 0)} of ${o.maxSpots} left` : "Unlimited"} />
                    <DetailItem label="Valid days" value={o.timeSlotMode === "SPECIFIC_WEEKDAYS" ? o.specificWeekdays?.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") || "—" : "All days"} />
                    {o.promoCode && <DetailItem label="Promo code" value={o.promoCode} highlight />}
                    {o.minQuantity && <DetailItem label="Min travellers" value={o.minQuantity} />}
                    {o.minSpendAmount && <DetailItem label="Min spend" value={`$${o.minSpendAmount}`} />}
                    {o.maxRedemptionsPerCustomer && <DetailItem label="Max per customer" value={o.maxRedemptionsPerCustomer} />}
                    <DetailItem label="Stackable" value={o.stackable ? "Yes" : "No"} />
                    {o.offerType === "EARLY_BIRD" && <DetailItem label="Advance booking" value={`${o.earlyBirdAdvanceDays || 7}+ days`} />}
                    {o.offerType === "LAST_MINUTE" && <DetailItem label="Booking window" value={`Within ${o.lastMinuteWindowHours || 72}h`} />}
                  </div>

                  {capped && o.maxSpots > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">Capacity</span>
                        <span className="text-slate-500">{o.spotsSold} of {o.maxSpots} sold</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(spotsUsed, 100)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full",
                            spotsUsed >= 90 ? "bg-red-500" : spotsUsed >= 70 ? "bg-amber-500" : "bg-emerald-500",
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {o.targets?.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-500">
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
                              className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                            >
                              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                {tData.photos?.[0] || t.tourPhoto ? (
                                  <OptimizedImage src={tData.photos?.[0] || t.tourPhoto} alt="" width={36} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center">
                                    <Package size={14} className="text-slate-400" />
                                  </span>
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-slate-700 group-hover:text-emerald-700">
                                  {tData.title || t.tourTitle || "Tour"}
                                </span>
                                {t.tourOptionLabel && (
                                  <span className="block truncate text-[11px] text-slate-400">{t.tourOptionLabel}</span>
                                )}
                              </span>
                              {price && (
                                <span className="shrink-0 text-right">
                                  <span className="block text-[11px] text-slate-400 line-through">${Math.round(price)}</span>
                                  <span className="block text-sm font-semibold text-emerald-700">${discountPrice(price, o)}</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 border-t border-slate-200 px-6 py-4">
                  <button
                    onClick={handleModalEdit}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                  >
                    <Edit size={15} />
                    Edit offer
                  </button>
                  <button
                    onClick={handleModalToggle}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <Power size={15} />
                    {o.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={handleModalDelete}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
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
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold", highlight ? "font-mono text-emerald-700" : "text-slate-700")}>{value}</p>
    </div>
  );
}
