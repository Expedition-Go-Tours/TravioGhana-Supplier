import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw } from "lucide-react";
import StaysSurface from "../components/StaysSurface";
import { StaysSelect } from "../components/StaysForm";
import StaysCancellationCard from "../components/cancellation/StaysCancellationCard";
import StaysAboutCancellationCard from "../components/cancellation/StaysAboutCancellationCard";
import StaysCancellationRecordsTable from "../components/cancellation/StaysCancellationRecordsTable";
import StaysCancellationDetailsModal from "../components/cancellation/StaysCancellationDetailsModal";
import {
  fetchCancellationSummary,
  fetchCancellationRecords,
  listProperties,
  STAYS_KEYS,
} from "../api";

/**
 * Cancellation rate — the Stays mirror of the Experiences page: the rate card
 * with its threshold gauge, the about card, the sortable cancellation records
 * with CSV export + pagination, and the details modal. Amounts are USD,
 * matching the Experiences page.
 */
export default function StaysCancellationPage() {
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [days, setDays] = useState(90);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const propertyId = selectedProperty === "all" ? undefined : selectedProperty;

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: STAYS_KEYS.cancellation(days, propertyId),
    queryFn: () => fetchCancellationSummary({ days, propertyId }),
    staleTime: 30_000,
  });

  const {
    data: recordsData,
    isLoading: recordsLoading,
    isError: recordsError,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: STAYS_KEYS.cancellationRecords({ propertyId, page, days }),
    queryFn: () => fetchCancellationRecords({ propertyId, page, limit: 25, days }),
    staleTime: 30_000,
  });

  const { data: properties = [] } = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    staleTime: 60_000,
  });

  const loading = summaryLoading || recordsLoading;
  const error = summaryError || recordsError;
  const pagination = recordsData?.pagination || null;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedRecords = useMemo(() => {
    const rows = recordsData?.records || [];
    return [...rows].sort((a, b) => {
      if (!sortField) return 0;
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (typeof aValue === "string") {
        return sortDir === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sortDir === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [recordsData, sortField, sortDir]);

  const totalLost = summary?.bookingValueLost ?? 0;

  const exportCSV = async () => {
    const { records: allRecords } = await fetchCancellationRecords({
      propertyId,
      page: 1,
      limit: 10000,
      days,
    });
    const headers = [
      "Travel Date",
      "Reason",
      "Note",
      "Booking Reference",
      "Property",
      "Booking Value",
      "Refund Amount",
    ];
    const rows = allRecords.map((record) => [
      record.travelDate,
      `"${(record.reason || "").replace(/"/g, '""')}"`,
      `"${(record.note || "").replace(/"/g, '""')}"`,
      record.bookingReference,
      `"${(record.productName || "").replace(/"/g, '""')}"`,
      record.bookingValue ?? "",
      record.refundAmount ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cancellations-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StaysSurface>
      <div className="max-w-5xl space-y-6 bg-linear-to-b from-transparent via-teal-50/3 to-teal-50/6 rounded-[20px]">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-1 h-10 bg-linear-to-b from-teal-600 to-teal-400 rounded-full" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Cancellation rate</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor and review booking cancellations across your properties
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Property:</label>
          <StaysSelect
            className="w-60"
            options={[
              { value: "all", label: `All properties (${properties.length})` },
              ...properties.map((property) => ({ value: property.id, label: property.name })),
            ]}
            value={selectedProperty}
            onChange={(event) => {
              setSelectedProperty(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Main content */}
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="bg-white border border-slate-200 rounded-[20px] shadow-none p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-slate-100 rounded" />
                  <div className="h-4 w-56 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="h-16 w-32 bg-slate-100 rounded" />
                  <div className="h-8 w-40 bg-slate-100 rounded-full" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                </div>
                <div className="border border-slate-200 rounded-2xl p-4">
                  <div className="grid grid-cols-3 divide-x divide-slate-200">
                    {[1, 2, 3].map((index) => (
                      <div key={index} className="text-center px-4 py-3 space-y-2">
                        <div className="h-8 w-12 bg-slate-100 rounded mx-auto" />
                        <div className="h-3 w-16 bg-slate-100 rounded mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[20px] shadow-none p-6">
              <div className="h-3 w-full bg-slate-100 rounded-full mb-4" />
              <div className="flex justify-between">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="h-3 w-8 bg-slate-100 rounded" />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white border border-slate-200 rounded-[20px] shadow-none p-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Failed to load cancellation data. Please try again.
            </p>
            <button
              onClick={() => {
                refetchSummary();
                refetchRecords();
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              <RotateCw size={14} />
              Retry
            </button>
          </div>
        ) : (
          <>
            <StaysCancellationCard
              summary={summary}
              days={days}
              onDaysChange={(value) => {
                setDays(value);
                setPage(1);
              }}
              onViewDetails={() => setShowDetailsModal(true)}
            />

            <StaysAboutCancellationCard mostCommonReason={summary?.mostCommonReason} />

            <StaysCancellationRecordsTable
              records={sortedRecords}
              pagination={pagination}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              onPageChange={setPage}
              onExportCSV={exportCSV}
              days={days}
              totalLost={totalLost}
            />
          </>
        )}

        {showDetailsModal && (
          <StaysCancellationDetailsModal
            summary={summary}
            records={sortedRecords}
            pagination={pagination}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onPageChange={setPage}
            onExportCSV={exportCSV}
            days={days}
            onClose={() => setShowDetailsModal(false)}
          />
        )}
      </div>
    </StaysSurface>
  );
}
