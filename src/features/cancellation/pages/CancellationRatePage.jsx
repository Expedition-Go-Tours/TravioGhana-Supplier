import { useState, useEffect } from "react";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { fetchCancellationSummary, fetchCancellationRecords, fetchCancellationProducts } from "../api";
import CancellationCard from "../components/CancellationCard";
import AboutCancellationCard from "../components/AboutCancellationCard";
import CancellationRecordsTable from "../components/CancellationRecordsTable";
import CancellationDetailsModal from "../components/CancellationDetailsModal";

export default function CancellationRatePage() {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [days, setDays] = useState(30);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const loadData = (productId, pageNum, dayCount) => {
    setLoading(true);
    setError(null);
    const pid = productId === "all" ? undefined : productId;

    Promise.all([
      fetchCancellationSummary(pid, dayCount),
      fetchCancellationRecords({ productId: pid, page: pageNum, limit: 25, days: dayCount }),
      fetchCancellationProducts(),
    ])
      .then(([summaryData, recordsData, productsData]) => {
        setSummary(summaryData);
        setRecords(recordsData.records);
        setPagination(recordsData.pagination);
        setProducts(productsData);
      })
      .catch(() => {
        setError("Failed to load cancellation data. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let mounted = true;
    const pid = selectedProduct === "all" ? undefined : selectedProduct;

    Promise.all([
      fetchCancellationSummary(pid, days),
      fetchCancellationRecords({ productId: pid, page, limit: 25, days }),
      fetchCancellationProducts(),
    ])
      .then(([summaryData, recordsData, productsData]) => {
        if (!mounted) return;
        setSummary(summaryData);
        setRecords(recordsData.records);
        setPagination(recordsData.pagination);
        setProducts(productsData);
      })
      .catch(() => {
        if (mounted) setError("Failed to load cancellation data. Please try again.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedProduct, page, days]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const totalLost = summary?.bookingValueLost ?? 0;
  const productCount = products.length > 0 ? products.length : "—";

  const exportCSV = async () => {
    const pid = selectedProduct === "all" ? undefined : selectedProduct;
    const { records: allRecords } = await fetchCancellationRecords({ productId: pid, page: 1, limit: 10000, days });
    const headers = [
      "Travel Date",
      "Reason",
      "Booking Reference",
      "Product",
      "Booking Value",
      "Refund Amount",
    ];
    const rows = allRecords.map((r) => [
      r.travelDate,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      r.bookingReference,
      `"${(r.productName || "").replace(/"/g, '""')}"`,
      r.bookingValue ?? "",
      r.refundAmount ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cancellations-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto space-y-6 bg-linear-to-b from-transparent via-teal-50/3 to-teal-50/6 rounded-[20px]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-1 h-10 bg-linear-to-b from-teal-600 to-teal-400 rounded-full" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Cancellation rate</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and review booking cancellations across your products
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Product:</label>
        <Select
          value={selectedProduct}
          onValueChange={(v) => {
            setSelectedProduct(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products ({productCount})</SelectItem>
            {products
              .filter((p) => p.id !== "all")
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
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
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="text-center px-4 py-3 space-y-2">
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
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-3 w-8 bg-slate-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-[20px] shadow-none p-10 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">{error}</p>
          <button
            onClick={() => loadData(selectedProduct, page, days)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            <RotateCw size={14} />
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Main Cancellation Card */}
          <CancellationCard
            summary={summary}
            days={days}
            onDaysChange={(d) => {
              setDays(d);
              setPage(1);
            }}
            onViewDetails={() => setShowDetailsModal(true)}
          />

          {/* About Section */}
          <AboutCancellationCard mostCommonReason={summary?.mostCommonReason} />

          {/* Records Table */}
          <CancellationRecordsTable
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

      {/* Details Modal */}
      {showDetailsModal && (
        <CancellationDetailsModal
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
  );
}
