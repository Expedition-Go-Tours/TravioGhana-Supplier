import { useState, useRef, useEffect } from "react";
import { Download, Printer, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function escapeCsv(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function generateCsv(bookings) {
  const headers = [
    "Date",
    "Time",
    "Tour",
    "Booking #",
    "Customer",
    "Phone",
    "Travelers",
    "Pickup Location",
    "Pickup Time",
    "Instructions",
    "Status",
  ];
  const rows = bookings.map((b) => {
    const p = b.pickup || {};
    return [
      new Date(b.travelDate).toLocaleDateString(),
      b.selectedTime || "",
      b.tourName,
      b.bookingNumber,
      b.customerName,
      b.customerPhone,
      b.travelers,
      p.place || p.areaName || p.locationName || "",
      p.time || "",
      p.instructions || "",
      b.status,
    ];
  });
  return [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
}

function generatePrintHtml(bookings, dateRange) {
  const rows = bookings
    .map((b) => {
      const p = b.pickup || {};
      return `<tr>
        <td>${new Date(b.travelDate).toLocaleDateString()}</td>
        <td>${p.time || b.selectedTime || "—"}</td>
        <td><strong>${b.tourName}</strong></td>
        <td>${b.bookingNumber}</td>
        <td>${b.customerName}</td>
        <td>${b.customerPhone || "—"}</td>
        <td>${b.travelers}</td>
        <td>${p.place || p.areaName || p.locationName || "—"}</td>
        <td>${p.instructions || "—"}</td>
        <td>${b.status}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><head><title>Pickup Manifest ${dateRange}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #1e293b; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Pickup Manifest</h1>
<p class="subtitle">${dateRange} &middot; ${bookings.length} bookings</p>
<table>
<thead><tr>
  <th>Date</th><th>Pickup Time</th><th>Tour</th><th>Booking #</th>
  <th>Customer</th><th>Phone</th><th>Travelers</th>
  <th>Location</th><th>Instructions</th><th>Status</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
</body></html>`;
}

export default function ExportMenu({ bookings, dateRange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!bookings || bookings.length === 0) return null;

  const handleCsv = () => {
    const csv = generateCsv(bookings);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pickup-manifest-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handlePrint = () => {
    const html = generatePrintHtml(bookings, dateRange);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
    setOpen(false);
  };

  const handlePdf = () => {
    const html = generatePrintHtml(bookings, dateRange);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 300);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-all",
          open
            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
            : "bg-white border-emerald-200/60 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300"
        )}
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer size={14} className="text-slate-400" />
            Print manifest
          </button>
          <button
            type="button"
            onClick={handleCsv}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText size={14} className="text-slate-400" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePdf}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download size={14} className="text-slate-400" />
            Save as PDF
          </button>
        </div>
      )}
    </div>
  );
}
