import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysButton from "../components/StaysButton";
import StaysPill from "../components/StaysPill";
import StaysStatCard from "../components/StaysStatCard";
import StaysSeg from "../components/StaysSeg";
import StaysRow from "../components/StaysRow";
import StaysEmptyState from "../components/StaysEmptyState";
import OfferForm from "../components/OfferForm";
import { listOffers, saveOffer, deleteOffer, listProperties, STAYS_KEYS } from "../api";

/**
 * Special Offers — the prototype's Promotions page with its four status
 * tiles, status filter and offer cards. Create/Edit open the inline,
 * spread-out OfferForm at the top of the page (no modal):
 * `?create=1&property=<id>` opens it in create mode with the property
 * preselected (the Properties page's "Create offer" button deep-links here).
 */
export default function StaysOffersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState(null); // { offer?, openKey }
  const formRef = useRef(null);

  const { data: allOffers = [], isLoading } = useQuery({
    queryKey: STAYS_KEYS.offers("All"),
    queryFn: () => listOffers({ filter: "All" }),
    staleTime: 20_000,
  });

  const { data: properties = [] } = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    staleTime: 60_000,
  });

  // Deep link from the Properties page (`?create=1&property=<id>`): the form
  // opens straight away and the params are cleared when it closes, so a
  // refresh does not re-open it. No effect needed.
  const deepLinkCreate = searchParams.get("create");
  const preselectedProperty = searchParams.get("property");
  const formOpen = Boolean(form) || Boolean(deepLinkCreate);

  const clearDeepLink = () => {
    if (!deepLinkCreate && !preselectedProperty) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("create");
        next.delete("property");
        return next;
      },
      { replace: true },
    );
  };

  const openKeyRef = useRef(0);
  const openForm = (offer) => {
    openKeyRef.current += 1;
    setForm({ offer, openKey: openKeyRef.current });
  };
  const openCreate = () => openForm();
  const openEdit = (offer) => openForm(offer);
  const closeForm = () => {
    setForm(null);
    clearDeepLink();
  };

  // The form sits at the top of the page; bring it into view when it opens.
  useEffect(() => {
    if (!formOpen) return;
    formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [formOpen]);

  const counts = useMemo(
    () => ({
      total: allOffers.length,
      Active: allOffers.filter((offer) => offer.status === "Active").length,
      Scheduled: allOffers.filter((offer) => offer.status === "Scheduled").length,
      Ended: allOffers.filter((offer) => offer.status === "Ended").length,
    }),
    [allOffers],
  );

  const shown = allOffers.filter((offer) => filter === "All" || offer.status === filter);

  const saveMutation = useMutation({
    mutationFn: (offer) => saveOffer(offer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stays", "offers"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stays", "offers"] });
      toast.success("Offer removed");
    },
  });

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Special Offers"
        subtitle="Create property offers and manage their booking windows."
        actions={
          <StaysButton variant="primary" onClick={openCreate}>
            + Create offer
          </StaysButton>
        }
      />

      <div className="mb-[18px] grid grid-cols-2 gap-[10px] sm:gap-[18px] xl:grid-cols-4">
        <StaysStatCard compact label="Total offers" value={counts.total} />
        <StaysStatCard compact label="Active" value={counts.Active} />
        <StaysStatCard compact label="Scheduled" value={counts.Scheduled} />
        <StaysStatCard compact label="Ended" value={counts.Ended} />
      </div>

      {formOpen && (
        <div ref={formRef}>
          <OfferForm
            key={form?.openKey ?? "deep-link"}
            offer={form?.offer}
            properties={properties}
            defaultPropertyId={preselectedProperty}
            onClose={closeForm}
            onSave={(offer) => saveMutation.mutateAsync(offer)}
          />
        </div>
      )}

      <StaysSeg
        className="mb-[18px]"
        ariaLabel="Filter offers by status"
        options={["All", "Active", "Scheduled", "Ended"].map((status) => ({ value: status, label: status }))}
        value={filter}
        onChange={setFilter}
      />

      {isLoading ? (
        <StaysCard className="min-h-[200px] animate-pulse bg-white/60" />
      ) : shown.length ? (
        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
          {shown.map((offer) => (
            <StaysCard key={offer.id} className="flex flex-col" data-offer-card>
              <div className="flex items-center justify-between gap-3">
                <StaysPill tone={offer.status === "Scheduled" ? "blue" : offer.status === "Ended" ? "amber" : "green"}>
                  {offer.status}
                </StaysPill>
                <strong className="text-sm font-semibold text-emerald-600">
                  {offer.discount}% OFF
                </strong>
              </div>
              <h2 className="mb-1 mt-4 text-base font-semibold text-slate-800">{offer.name}</h2>
              <p className="m-0 text-sm leading-relaxed text-slate-500">
                {`${offer.propertyName || "Property"} · ${offer.kind}`}
              </p>
              <StaysRow className="mt-3">
                <small className="text-xs text-slate-400">Stay window</small>
                <b className="text-[14px]">{`${offer.from || "Open"} – ${offer.to || "Open"}`}</b>
              </StaysRow>
              <StaysRow>
                <small className="text-xs text-slate-400">Booking limit</small>
                <b className="text-[14px]">{offer.limit || "Unlimited"}</b>
              </StaysRow>
              <div className="mt-4 flex flex-wrap gap-[9px]">
                <StaysButton size="small" onClick={() => openEdit(offer)}>
                  Edit
                </StaysButton>
                <StaysButton
                  size="small"
                  variant="danger"
                  onClick={() => removeMutation.mutate(offer.id)}
                >
                  Remove
                </StaysButton>
              </div>
            </StaysCard>
          ))}
        </div>
      ) : (
        <StaysCard>
          <StaysEmptyState title="No offers match this status">
            Create an offer to fill quiet nights.
          </StaysEmptyState>
        </StaysCard>
      )}
    </StaysSurface>
  );
}
