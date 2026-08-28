import { AlertTriangle } from "lucide-react";

export default function AboutCancellationCard({ mostCommonReason }) {
  return (
    <div className="bg-amber-50/40 border border-amber-200/50 rounded-[20px] shadow-none p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={15} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-800">About cancellation rate</h3>
      </div>
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          Your cancellation rate is calculated by dividing supplier-caused cancellations by total
          eligible bookings in the selected period. We exclude cancellations due to weather, force
          majeure, or customer-requested cancellations.
        </p>
        <p>
          Keep your rate below 2% to maintain Excellent status. Rates between 2% and 3% are Good,
          3% to 5% need attention, and anything above 5% is considered High and may require action.
        </p>
        {mostCommonReason && (
          <p>
            <span className="font-medium text-slate-600">Most common reason: </span>
            <span className="font-semibold text-amber-700">{mostCommonReason}</span>
          </p>
        )}
      </div>
    </div>
  );
}
