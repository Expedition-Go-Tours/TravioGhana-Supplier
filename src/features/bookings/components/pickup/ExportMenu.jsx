import { useState, useRef, useEffect } from "react";
import { Download, Printer, FileText, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateCsv, generatePrintHtml } from "../../lib/pickupExport";

/**
 * Export the whole filtered range, not the current 50-row page.
 *
 * `getBookings` is async and pages through the planner. Print/PDF open the
 * window synchronously (inside the click) so pop-up blockers do not reject a
 * window opened after the await.
 */
export default function ExportMenu({ getBookings, dateRange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const openPrintWindow = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write("<!DOCTYPE html><html><body><p style=\"font-family: sans-serif; padding: 24px;\">Preparing pickup manifest…</p></body></html>");
      w.document.close();
    }
    return w;
  };

  const loadRows = async () => {
    try {
      const result = await getBookings?.();
      const rows = result?.bookings || [];
      if (rows.length === 0) {
        toast.info("No pickups to export for this view");
        return null;
      }
      if (result?.truncated) {
        toast.warning("This range is larger than the export cap; the file contains the first batch.");
      }
      return { rows, truncated: !!result?.truncated };
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Could not prepare the export");
      return null;
    }
  };

  const handleCsv = async () => {
    if (busy) return;
    setOpen(false);
    setBusy("csv");
    try {
      const data = await loadRows();
      if (!data) return;
      const csv = generateCsv(data.rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pickup-manifest-${dateRange}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${data.rows.length} pickups`);
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async (pdf = false) => {
    if (busy) return;
    setOpen(false);
    setBusy(pdf ? "pdf" : "print");
    const w = openPrintWindow();
    if (!w) {
      toast.error("Allow pop-ups to print the pickup manifest");
      setBusy(null);
      return;
    }
    try {
      const data = await loadRows();
      if (!data) {
        w.close();
        return;
      }
      const html = generatePrintHtml(data.rows, dateRange, { truncated: data.truncated });
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        if (!w.closed) w.print();
      }, pdf ? 400 : 250);
    } catch (err) {
      w.close();
      toast.error(err.message || "Could not open the manifest");
    } finally {
      setBusy(null);
    }
  };

  const isDisabled = disabled || !!busy;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={isDisabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => !isDisabled && setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
          open
            ? "border-slate-300 bg-slate-100 text-slate-800"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
          isDisabled && "cursor-not-allowed opacity-50"
        )}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {busy ? "Preparing…" : "Export"}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Export pickup manifest"
          className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePrint(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Printer size={14} className="text-slate-400" />
            Print manifest
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleCsv}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileText size={14} className="text-slate-400" />
            Export CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePrint(true)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download size={14} className="text-slate-400" />
            Save as PDF
          </button>
          <p className="border-t border-slate-100 px-3 pb-1 pt-2 text-[10px] leading-snug text-slate-400">
            Exports the full filtered range.
          </p>
        </div>
      )}
    </div>
  );
}
