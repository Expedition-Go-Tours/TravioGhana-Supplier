import StaysModal from "./StaysModal";
import StaysButton from "./StaysButton";
import StaysPill from "./StaysPill";
import StaysRow from "./StaysRow";
import { statusTone } from "../utils/status";

/**
 * The prototype's property preview — name and location, the short/full
 * description block, room count and status. Read-only; the footer closes.
 */
export default function PropertyPreviewModal({ open, property, onClose }) {
  if (!property) return null;

  return (
    <StaysModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={property.name}
      description={`${property.type} · ${property.city || "Location pending"}, ${property.region}`}
      footer={
        <StaysButton onClick={onClose}>Close</StaysButton>
      }
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <b className="block text-sm font-semibold text-slate-800">{property.shortDescription || "New listing"}</b>
        <small className="mt-1 block text-xs text-slate-500">
          {property.description || "No description yet."}
        </small>
      </div>
      <StaysRow>
        <strong className="text-sm font-medium text-slate-700">Rooms</strong>
        <span className="text-sm text-slate-700">{property.rooms?.length || 0} types</span>
      </StaysRow>
      <StaysRow>
        <strong className="text-sm font-medium text-slate-700">Status</strong>
        <StaysPill tone={statusTone(property.status)}>{property.status}</StaysPill>
      </StaysRow>
    </StaysModal>
  );
}
