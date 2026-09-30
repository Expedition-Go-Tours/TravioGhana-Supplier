import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import DeleteModal from "@/components/ui/DeleteModal";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysButton from "../components/StaysButton";
import StaysStatCard from "../components/StaysStatCard";
import StaysSeg from "../components/StaysSeg";
import StaysEmptyState from "../components/StaysEmptyState";
import PropertyCard from "../components/PropertyCard";
import PropertyPreviewModal from "../components/PropertyPreviewModal";
import { StaysSelect } from "../components/StaysForm";
import { deleteProperty, listProperties, STAYS_KEYS } from "../api";
import { PROPERTY_STATUSES } from "../utils/status";

/**
 * Properties list — the prototype's Properties page.
 *
 * Filtering happens client-side over the full list, exactly like the
 * prototype: accommodation suppliers manage tens of listings, not thousands,
 * and the toolbar counts ("Showing 1 of 1") need the unfiltered total anyway.
 * When the API grows pagination this becomes a server query and the counts
 * move to the response.
 */
export default function PropertiesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [layout, setLayout] = useState("Grid");
  const [preview, setPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
      toast.success("Property deleted");
    },
    onError: () => toast.error("Could not delete the property"),
  });

  const counts = useMemo(
    () => ({
      Live: properties.filter((p) => p.status === "Live").length,
      "Under review": properties.filter((p) => p.status === "Under review").length,
      Draft: properties.filter((p) => p.status === "Draft").length,
      total: properties.length,
    }),
    [properties],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter((property) => {
      if (status !== "All" && property.status !== status) return false;
      if (!q) return true;
      return `${property.name} ${property.city} ${property.type}`.toLowerCase().includes(q);
    });
  }, [properties, status, query]);

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Properties"
        subtitle={`${counts.total} accommodation ${counts.total === 1 ? "listing" : "listings"} · Manage drafts, reviews and live stays.`}
        actions={
          <StaysButton variant="primary" onClick={() => navigate("/stays/properties/build")}>
            + Add property
          </StaysButton>
        }
      />

      {/* Status tiles */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaysStatCard compact label="Live" value={counts.Live} />
        <StaysStatCard compact label="Under review" value={counts["Under review"]} />
        <StaysStatCard compact label="Draft" value={counts.Draft} />
        <StaysStatCard compact label="Total listings" value={counts.total} />
      </div>

      {/* Toolbar */}
      <StaysCard className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-[240px] max-w-full">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search properties..."
            aria-label="Search properties"
            className="w-full rounded-lg border border-emerald-100/60 bg-emerald-50/40 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 transition-all focus:border-[#044b3b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#044b3b]/20"
          />
        </div>
        <StaysSelect
          aria-label="Filter property status"
          options={PROPERTY_STATUSES}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-auto py-2 text-sm"
        />
        <StaysSeg
          ariaLabel="Property layout"
          options={[
            { value: "Grid", label: "Grid" },
            { value: "List", label: "List" },
          ]}
          value={layout}
          onChange={setLayout}
        />
        <span className="ml-auto text-xs text-slate-400">
          Showing {shown.length} of {counts.total}
        </span>
      </StaysCard>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <StaysCard key={key} className="min-h-[220px] animate-pulse bg-white/60" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <StaysCard>
          <StaysEmptyState title="No properties match these filters">
            Try a different search or status, or add a new property.
          </StaysEmptyState>
        </StaysCard>
      ) : (
        <div
          className={
            layout === "Grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "grid grid-cols-1 gap-4"
          }
        >
          {shown.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              layout={layout}
              onEdit={() => navigate(`/stays/properties/build/${property.id}`)}
              onPreview={() => setPreview(property)}
              onCreateOffer={() => navigate(`/stays/special-offers?create=1&property=${property.id}`)}
              onDelete={() => setDeleteTarget(property)}
            />
          ))}
        </div>
      )}

      <PropertyPreviewModal
        open={Boolean(preview)}
        property={preview}
        onClose={() => setPreview(null)}
      />

      <DeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        entityName={deleteTarget?.name}
        title="Delete property"
        isLoading={deleteMutation.isPending}
      />
    </StaysSurface>
  );
}
