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
          Your cancellation rate divides supplier-caused cancellations by the bookings that
          were at risk in the selected period. A booking is at risk if it travelled in the
          period or was cancelled in it. Bookings with a future travel date are not counted,
          and cancellations are counted on the date they were cancelled, not the travel date.
        </p>
        <p>
          Cancellations caused by weather, force majeure, or a customer request are shown in
          your records but do not count against you. GetYourGuide&apos;s standard is 1% or lower.
          Your rating is waived until you have 10 eligible bookings; after that, Excellent is
          1% or lower, Above standard is 2% or lower, At risk is 5% or lower, and High is above
          5%. A High rating means we may reach out to help — it never implies automatic removal
          of your products.
        </p>
        <p>
          Traveller no-shows are listed for context: these are bookings where the traveller did
          not arrive and you were still paid. They are not supplier cancellations and do not
          affect this rate.
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
