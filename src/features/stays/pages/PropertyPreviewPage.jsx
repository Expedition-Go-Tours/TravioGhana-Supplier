import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, Pencil } from "lucide-react";
import { useTeamRole } from "@/hooks/useTeamRole";
import StaysSurface from "../components/StaysSurface";
import StaysButton from "../components/StaysButton";
import StaysCard from "../components/StaysCard";
import StaysPill from "../components/StaysPill";
import PropertyDetailsView from "../components/PropertyDetailsView";
import { getProperty, STAYS_KEYS } from "../api";
import { statusTone } from "../utils/status";

function locationLabel(property) {
  return [property.city, property.region].filter(Boolean).join(", ") || "Location pending";
}

/**
 * Full-page property preview. The eye action on a property card lands here
 * instead of opening a modal: the same read-only sections now live on a
 * shareable route with the dashboard's full width.
 */
export default function PropertyPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useTeamRole();
  const canEdit = hasPermission("stays.manage");

  const { data: property, isLoading, isError } = useQuery({
    queryKey: STAYS_KEYS.property(id),
    queryFn: () => getProperty(id),
    enabled: Boolean(id),
    retry: false,
  });

  const backToProperties = () => navigate("/stays/properties");

  if (isLoading) {
    return (
      <StaysSurface className="max-w-6xl">
        <StaysCard className="flex min-h-[240px] flex-col items-center justify-center gap-3">
          <Loader2 size={26} className="animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading property details…</p>
        </StaysCard>
      </StaysSurface>
    );
  }

  if (isError || !property) {
    return (
      <StaysSurface className="max-w-6xl">
        <StaysCard className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle size={22} />
          </span>
          <h1 className="text-lg font-semibold text-slate-800">Property not found</h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-500">
            This property may have been removed, or the link is no longer valid.
          </p>
          <StaysButton variant="primary" onClick={backToProperties}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to properties
          </StaysButton>
        </StaysCard>
      </StaysSurface>
    );
  }

  return (
    <StaysSurface className="max-w-6xl">
      <button
        type="button"
        onClick={backToProperties}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-700"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Properties
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 md:text-2xl">{property.name}</h1>
            <StaysPill tone={statusTone(property.status)}>{property.status}</StaysPill>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {property.type || "Property"} · {locationLabel(property)}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            <StaysButton
              variant="primary"
              onClick={() => navigate(`/stays/properties/build/${property.id}`)}
            >
              <Pencil size={16} aria-hidden="true" />
              Edit listing
            </StaysButton>
          </div>
        )}
      </div>

      <PropertyDetailsView
        property={property}
        canEdit={canEdit}
        onEdit={(path) => navigate(path)}
      />
    </StaysSurface>
  );
}
