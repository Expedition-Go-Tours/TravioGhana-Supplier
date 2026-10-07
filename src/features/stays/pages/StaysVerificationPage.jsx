import { useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  FileText,
  Upload,
  Loader2,
  Home,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  CalendarClock,
  Eye,
  UserCheck,
} from "lucide-react";
import {
  loadStaysVerification,
  replaceStaysDocument,
  addStaysDocument,
} from "../verification/api";
import { formatDate } from "@/lib/utils";

const DOC_LABEL = (type) =>
  (type || "Other").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const DOC_STATUS = {
  APPROVED: { label: "Approved", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", icon: XCircle, cls: "bg-rose-50 text-rose-600" },
  REPLACEMENT_REQUESTED: { label: "Replacement requested", icon: AlertTriangle, cls: "bg-amber-50 text-amber-700" },
  EXPIRED: { label: "Expired", icon: XCircle, cls: "bg-rose-50 text-rose-600" },
  PENDING: { label: "Pending review", icon: Clock, cls: "bg-sky-50 text-sky-700" },
  MISSING: { label: "Not uploaded", icon: Upload, cls: "bg-slate-100 text-slate-500" },
};

const NEEDS_REUPLOAD = ["REJECTED", "REPLACEMENT_REQUESTED", "EXPIRED"];

// Fallback when an older status payload carries no per-property requirements.
const PROPERTY_DOC_TYPES = [
  { type: "PROPERTY_OWNERSHIP", label: "Ownership or lease" },
  { type: "GTA_PROPERTY_CERTIFICATE", label: "Property GTA certificate" },
  { type: "UTILITY_BILL", label: "Utility bill" },
];

const SUPPLIER_TYPE_LABEL = {
  TOUR_GUIDE: "Tour Guide",
  TOUR_COMPANY: "Tour Company",
  ACCOMMODATION_PROVIDER: "Accommodation",
  TRANSPORTATION_PROVIDER: "Transportation",
  VEHICLE_OPERATOR: "Vehicle Operator",
  OTHER_SERVICE_PROVIDER: "Other Service",
};

const ADDABLE_DOC_TYPES = [
  { value: "BUSINESS_CERTIFICATE", label: "Business certificate" },
  { value: "GTA_CERTIFICATE", label: "Ghana Tourism Authority certificate" },
  { value: "GHANA_CARD", label: "Ghana Card" },
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of address" },
  { value: "PROPERTY_OWNERSHIP", label: "Property ownership or lease" },
  { value: "UTILITY_BILL", label: "Utility bill" },
  { value: "PROFILE_PHOTO", label: "Profile photograph" },
  { value: "OTHER", label: "Other document" },
];

function StatusPill({ status }) {
  const config = DOC_STATUS[status] || { label: status, icon: Clock, cls: "bg-slate-100 text-slate-600" };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.cls}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function TimingBadge({ requirement, graceDays = 30 }) {
  // Backend sets `enforced` only for the up-front set collected at registration
  // (a government ID, plus a business certificate for businesses). Everything
  // else falls within the documentation grace period once the account is live —
  // the same number the wizard promises at signup, served by the backend.
  if (requirement.timing === "later") {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-amber-300 bg-amber-50/50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        Within {graceDays} days
      </span>
    );
  }
  if (requirement.enforced) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Required
      </span>
    );
  }
  return null;
}

function SectionHeader({ icon: Icon, title, subtitle, badge }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {typeof badge === "number" && (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 px-2 text-xs font-bold text-emerald-700">
          {badge}
        </span>
      )}
    </div>
  );
}

function ChecklistGroupHeader({ title, hint, count }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {typeof count === "number" && <span className="text-[11px] font-medium text-slate-400">{count}</span>}
    </div>
  );
}

/** Whole remaining days until the documentation window closes (negative = overdue). */
function documentationWindowInfo(deadline) {
  if (!deadline) return null;
  const due = new Date(deadline).getTime();
  if (Number.isNaN(due)) return null;
  const daysLeft = Math.ceil((due - Date.now()) / 86_400_000);
  return { daysLeft, overdue: daysLeft < 0, dueDate: formatDate(deadline) };
}

/**
 * The 30-day documentation window: only the enforced set (ID + business
 * certificate) was required to go live — everything left on the checklist is
 * due by the deadline shown here once the account is active.
 */
function DocumentationWindowBanner({ deadline }) {
  const info = documentationWindowInfo(deadline);
  if (!info) return null;
  const count = Math.abs(info.daysLeft);
  const plural = count === 1 ? "" : "s";
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
        info.overdue
          ? "border-rose-200 bg-rose-50/60 text-rose-700"
          : "border-amber-200 bg-amber-50/60 text-amber-800"
      }`}
    >
      <Clock size={15} className={`mt-0.5 shrink-0 ${info.overdue ? "text-rose-500" : "text-amber-600"}`} />
      <div className="min-w-0">
        <p className="font-semibold">
          {info.overdue
            ? `The documents below were due ${info.dueDate} — ${count} day${plural} overdue`
            : `The documents below are due ${info.dueDate} — ${count} day${plural} left`}
        </p>
        <p className="mt-0.5 opacity-80">
          {info.overdue
            ? "Provide them from this dashboard so nothing falls behind on your account."
            : "Only your ID (and business certificate, if you're a business) was required to go live — this window covers the rest."}
        </p>
      </div>
    </div>
  );
}

function AddButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-900/10 active:scale-[0.98]"
    >
      <Plus size={14} /> {label}
    </button>
  );
}

function OutlineButton({ children, onClick, danger, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        danger
          ? "border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
      } ${className}`}
    >
      {children}
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 transition-shadow focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100";

const fileLabelCls =
  "block rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center text-xs text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40";

/**
 * One line of the verification checklist: a document the operator's type needs,
 * its review status, and an upload action when it is missing or needs replacing.
 */
function RequirementRow({ requirement, doc, onUpload, graceDays }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const status = doc ? doc.status : "MISSING";
  const needsUpload = !doc || NEEDS_REUPLOAD.includes(doc.status);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 transition-colors hover:border-emerald-200">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{requirement.label}</p>
          <StatusPill status={status} />
          <TimingBadge requirement={requirement} graceDays={graceDays} />
        </div>
        {requirement.detail && <p className="mt-0.5 text-xs text-slate-500">{requirement.detail}</p>}
        {doc?.expiryDate && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
            <CalendarClock size={12} className="text-slate-400" /> expires {formatDate(doc.expiryDate)}
          </p>
        )}
        {doc?.reviewNote && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-500">
            <AlertTriangle size={12} /> {doc.reviewNote}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {doc?.url && (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-700"
          >
            <Eye size={14} /> View
          </a>
        )}
        {needsUpload && (
          <>
            <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFile} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-900/10 active:scale-[0.98] disabled:opacity-60"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading…" : doc ? "Upload replacement" : "Upload"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DocumentRow({ doc, onReplace }) {
  const inputRef = useRef(null);
  const replaceable = NEEDS_REUPLOAD.includes(doc.status);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onReplace(doc, file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="group flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 transition-colors hover:border-emerald-200">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{DOC_LABEL(doc.type)}</p>
          <StatusPill status={doc.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {doc.expiryDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={12} className="text-slate-400" /> expires {formatDate(doc.expiryDate)}
            </span>
          )}
          {doc.reviewNote && (
            <span className="inline-flex items-center gap-1 text-rose-500">
              <AlertTriangle size={12} /> {doc.reviewNote}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {doc.url && (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-700"
          >
            <Eye size={14} /> View
          </a>
        )}
        {replaceable && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-900/10 active:scale-[0.98] disabled:opacity-60"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading…" : "Upload replacement"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * One required document for a single property, with its status and an inline
 * upload/replace action. This is the "repair" path — a property created
 * without a document gets one attached (ownerType + ownerId) instead of being
 * removed and re-created.
 */
function EntityDocRow({ requirement, doc, onUpload }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const needsUpload = !doc || NEEDS_REUPLOAD.includes(doc.status);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{requirement.label}</span>
        <span className="inline-flex items-center gap-1.5">
          <StatusPill status={doc ? doc.status : "MISSING"} />
          {needsUpload && (
            <>
              <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFile} />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
              >
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                {uploading ? "Uploading…" : doc ? "Replace" : "Upload"}
              </button>
            </>
          )}
        </span>
      </div>
      {doc?.reviewNote && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
          <AlertTriangle size={11} className="shrink-0" /> {doc.reviewNote}
        </p>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent, hint }) {
  const accents = {
    emerald: "border-emerald-400 bg-emerald-50 text-emerald-700",
    amber: "border-amber-400 bg-amber-50 text-amber-700",
    rose: "border-rose-400 bg-rose-50 text-rose-600",
    sky: "border-sky-400 bg-sky-50 text-sky-700",
    slate: "border-slate-300 bg-slate-100 text-slate-600",
  };
  const bar = accents[accent] || accents.slate;
  return (
    <div className="rounded-xl border border-emerald-100/60 border-l-4 bg-white p-4 transition-shadow hover:shadow-md hover:shadow-emerald-900/5">
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bar}`}>
          <Icon size={16} />
        </div>
        <span className="text-2xl font-bold text-slate-800 tabular-nums">{value}</span>
      </div>
      <p className="mt-2.5 text-xs font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

const emptyDocForm = { type: "", file: null, expiryDate: "" };

export default function StaysVerificationPage() {
  const queryClient = useQueryClient();
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState(emptyDocForm);
  const [docSaving, setDocSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["stays", "verification"],
    queryFn: () => loadStaysVerification(),
  });

  const profile = data?.profile || null;
  const requirements = data?.requirements || null;

  // Per-property document requirements come from the backend (narrower for an
  // "optional" set, full set for a required one). The static list is only the
  // fallback for older status payloads that carry no requirements.
  const propertyDocReqs = requirements ? requirements.propertyDocuments || [] : PROPERTY_DOC_TYPES;
  // The 30-day documentation window: the grace period is served by the backend
  // (same number the signup wizard promises), the deadline is per-account and
  // starts the moment the required documents are on file.
  const graceDays = requirements?.documentationGraceDays ?? 30;
  const documentationDeadline = requirements?.documentationDeadline || null;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["stays", "verification"] });
  }, [queryClient]);

  const replaceMutation = useMutation({
    mutationFn: ({ doc, file }) => replaceStaysDocument(doc.id, file),
    onSuccess: () => {
      toast.success("Document re-uploaded — it's back under review");
      refresh();
    },
    onError: () => toast.error("Failed to upload replacement"),
  });

  const handleReplace = (doc, file) => replaceMutation.mutate({ doc, file });

  /** Upload for a checklist row: a replacement when the doc exists, else a new one. */
  const handleRequirementUpload = async (requirement, file) => {
    const existing = (profile?.documents || []).find(
      (d) => d.ownerType === "SUPPLIER" && d.type === requirement.type
    );
    try {
      if (existing && NEEDS_REUPLOAD.includes(existing.status)) {
        await replaceStaysDocument(existing.id, file);
        toast.success("Document re-uploaded — it's back under review");
      } else {
        await addStaysDocument({ type: requirement.type, file });
        toast.success("Document uploaded — it's now under review");
      }
      refresh();
    } catch {
      toast.error("Failed to upload document");
    }
  };

  /** Repair path for a property missing a document: attach it in place. */
  const handleEntityDocUpload = async (kind, entity, requirement, file) => {
    const entityDocs = (profile?.documents || []).filter(
      (d) => d.ownerType === kind && d.ownerId === entity.id
    );
    const existing = entityDocs.find((d) => d.type === requirement.type);
    try {
      if (existing && NEEDS_REUPLOAD.includes(existing.status)) {
        await replaceStaysDocument(existing.id, file);
        toast.success("Document re-uploaded — it's back under review");
      } else {
        await addStaysDocument({ type: requirement.type, file, ownerType: kind, ownerId: entity.id });
        toast.success("Document uploaded — it's now under review");
      }
      refresh();
    } catch {
      toast.error("Failed to upload document");
    }
  };

  const handleAddDocument = async () => {
    if (!docForm.type) {
      toast.error("Select a document type");
      return;
    }
    if (!docForm.file) {
      toast.error("Attach the document file");
      return;
    }
    setDocSaving(true);
    try {
      await addStaysDocument({ type: docForm.type, file: docForm.file, expiryDate: docForm.expiryDate || undefined });
      toast.success("Document added — it's now under review");
      setDocForm(emptyDocForm);
      setShowDocForm(false);
      refresh();
    } catch {
      toast.error("Failed to add document");
    } finally {
      setDocSaving(false);
    }
  };

  const documents = profile?.documents || [];
  const properties = profile?.properties || [];

  // Checklist built from the operator's requirements, matched to uploaded docs.
  const requirementRows = (requirements?.documents || []).map((requirement) => ({
    requirement,
    doc: documents.find((d) => d.ownerType === "SUPPLIER" && d.type === requirement.type) || null,
  }));
  // The backend splits its own list into the enforced "upfront" set and the
  // advisory "later" set; the page mirrors that split instead of re-deriving it.
  const upfrontRows = requirementRows.filter(({ requirement }) => requirement.timing === "upfront");
  const laterRows = requirementRows.filter(({ requirement }) => requirement.timing === "later");

  const requiredTypes = new Set((requirements?.documents || []).map((r) => r.type));
  // Supplier-level extras only: property documents live in the Properties
  // section below, so they never double up in this list.
  const additionalDocs = documents.filter(
    (d) => d.ownerType !== "PROPERTY" && (d.ownerType !== "SUPPLIER" || !requiredTypes.has(d.type)),
  );

  // Only enforced (up-front) requirements count as an action: advisory
  // documents never block anything, so a missing one is not something to fix.
  const missingRequired = upfrontRows.filter(({ requirement, doc }) => requirement.enforced && !doc).length;
  const pendingDocs = documents.filter((d) => d.status === "PENDING").length;
  const approvedDocs = documents.filter((d) => d.status === "APPROVED").length;
  const actionDocs =
    documents.filter((d) => NEEDS_REUPLOAD.includes(d.status)).length + missingRequired;

  // Older status payloads have no requirements — fall back to showing everything.
  const showProperties = requirements ? requirements.properties !== "hidden" : true;
  const typeLabel = SUPPLIER_TYPE_LABEL[profile?.supplierType] || profile?.supplierType;

  // "Additional documents" picker derived from the server's requirement list
  // (server labels included), so it can never disagree with the wizard. Types
  // already on file at supplier level are hidden because the backend rejects a
  // second pending/approved document of the same type for the same entity.
  const supplierDocTypes = new Set(
    documents.filter((d) => d.ownerType === "SUPPLIER").map((d) => d.type)
  );
  const addableTypes = requirements
    ? [
        ...Array.from(
          new Map(
            (requirements.documents || [])
              .filter((r) => !supplierDocTypes.has(r.type))
              .map((r) => [r.type, { value: r.type, label: r.label }])
          ).values()
        ),
        { value: "OTHER", label: "Other document" },
      ]
    : ADDABLE_DOC_TYPES;

  const pendingProperties = properties.filter((property) => property.status !== "VERIFIED").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Verification</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {requirements
                ? `Everything a ${typeLabel} needs on file. Only a government ID (plus a business certificate, if you're a business) is required to go live — the rest are due within ${graceDays} days of going live.`
                : "Track every document and property on file."}
            </p>
          </div>
        </div>
        {profile?.supplierType && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <UserCheck size={14} /> {SUPPLIER_TYPE_LABEL[profile.supplierType] || profile.supplierType}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-slate-500">
          <Loader2 size={22} className="animate-spin text-emerald-600" />
          Loading your verification details…
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className={`grid grid-cols-2 gap-3 ${showProperties ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <SummaryCard icon={FileText} label="Documents pending review" value={pendingDocs} accent="sky" hint="Awaiting our team" />
            <SummaryCard icon={CheckCircle2} label="Documents approved" value={approvedDocs} accent="emerald" hint="Good to go" />
            <SummaryCard icon={AlertTriangle} label="Actions needed" value={actionDocs} accent={actionDocs > 0 ? "rose" : "emerald"} hint={actionDocs > 0 ? "Upload or replace" : "All clear"} />
            {showProperties && (
              <SummaryCard icon={Home} label="Properties pending" value={pendingProperties} accent={pendingProperties > 0 ? "amber" : "emerald"} hint="Awaiting verification" />
            )}
          </div>

          {/* Verification checklist (type-aware) */}
          {requirements ? (
            <>
              <section className="space-y-4 rounded-xl border border-emerald-100/60 bg-white p-5">
                <SectionHeader
                  icon={ShieldCheck}
                  title="Verification checklist"
                  subtitle="What your operator type needs to provide"
                  badge={requirementRows.length}
                />
                {documentationDeadline && laterRows.length > 0 && (
                  <DocumentationWindowBanner deadline={documentationDeadline} />
                )}
                {requirementRows.length === 0 ? (
                  <EmptyState icon={ShieldCheck} text="No documents required for your type." />
                ) : (
                  <div className="space-y-5">
                    <div>
                      <ChecklistGroupHeader
                        title="Provided during registration"
                        hint="Collected when your account was created — each document here is verified by our team."
                        count={upfrontRows.length}
                      />
                      <div className="space-y-2.5">
                        {upfrontRows.map(({ requirement, doc }) => (
                          <RequirementRow
                            key={requirement.type}
                            requirement={requirement}
                            doc={doc}
                            onUpload={(file) => handleRequirementUpload(requirement, file)}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <ChecklistGroupHeader
                        title="Still to provide"
                        hint={`Due within ${graceDays} days of your account going live.`}
                        count={laterRows.length}
                      />
                      <div className="space-y-2.5">
                        {laterRows.map(({ requirement, doc }) => (
                          <RequirementRow
                            key={requirement.type}
                            requirement={requirement}
                            doc={doc}
                            graceDays={graceDays}
                            onUpload={(file) => handleRequirementUpload(requirement, file)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Extra documents the supplier chose to add */}
              <section className="space-y-4 rounded-xl border border-emerald-100/60 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <SectionHeader
                    icon={FileText}
                    title="Additional documents"
                    subtitle="Anything else we should have on file"
                    badge={additionalDocs.length}
                  />
                  <AddButton onClick={() => setShowDocForm((v) => !v)} label="Add document" />
                </div>

                {showDocForm && (
                  <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <select
                        value={docForm.type}
                        onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value }))}
                        className={`${inputCls} sm:col-span-1`}
                      >
                        <option value="">Select document type…</option>
                        {addableTypes.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <label className={fileLabelCls}>
                        <span className="mb-1.5 block font-medium text-slate-600">{docForm.file ? docForm.file.name : "Choose document file"}</span>
                        <input
                          type="file"
                          className="block w-full text-[11px]"
                          accept="image/*,.pdf"
                          onChange={(e) => setDocForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                        />
                      </label>
                      <input
                        type="date"
                        value={docForm.expiryDate}
                        onChange={(e) => setDocForm((f) => ({ ...f, expiryDate: e.target.value }))}
                        placeholder="Expiry date (optional)"
                        className={`${inputCls} sm:col-span-1`}
                        title="Expiry date (optional)"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <OutlineButton onClick={() => setShowDocForm(false)}>Cancel</OutlineButton>
                      <button type="button" onClick={handleAddDocument} disabled={docSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60">
                        {docSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add document
                      </button>
                    </div>
                  </div>
                )}

                {additionalDocs.length === 0 ? (
                  <EmptyState icon={FileText} text="Nothing extra on file." />
                ) : (
                  <div className="space-y-2.5">
                    {additionalDocs.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} onReplace={handleReplace} />
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            /* Fallback for an older status payload (no requirements). */
            <section className="space-y-4 rounded-xl border border-emerald-100/60 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <SectionHeader icon={FileText} title="Documents" subtitle="Each document is reviewed individually" badge={documents.length} />
                <AddButton onClick={() => setShowDocForm((v) => !v)} label="Add document" />
              </div>

              {showDocForm && (
                <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      value={docForm.type}
                      onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value }))}
                      className={`${inputCls} sm:col-span-1`}
                    >
                      <option value="">Select document type…</option>
                      {addableTypes.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <label className={fileLabelCls}>
                      <span className="mb-1.5 block font-medium text-slate-600">{docForm.file ? docForm.file.name : "Choose document file"}</span>
                      <input
                        type="file"
                        className="block w-full text-[11px]"
                        accept="image/*,.pdf"
                        onChange={(e) => setDocForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                      />
                    </label>
                    <input
                      type="date"
                      value={docForm.expiryDate}
                      onChange={(e) => setDocForm((f) => ({ ...f, expiryDate: e.target.value }))}
                      className={`${inputCls} sm:col-span-1`}
                      title="Expiry date (optional)"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <OutlineButton onClick={() => setShowDocForm(false)}>Cancel</OutlineButton>
                    <button type="button" onClick={handleAddDocument} disabled={docSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60">
                      {docSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add document
                    </button>
                  </div>
                </div>
              )}

              {documents.length === 0 ? (
                <EmptyState icon={FileText} text="No documents on file yet." />
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} onReplace={handleReplace} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Properties — each listing is verified with its own documents */}
          {showProperties && (
            <section className="space-y-4 rounded-xl border border-emerald-100/60 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                {requirements?.properties === "required" ? (
                  <SectionHeader icon={Home} title="Properties" subtitle="Required for your listing type — each property needs its own documents" badge={properties.length} />
                ) : (
                  <SectionHeader icon={Home} title="Properties" subtitle="Keep each property's documents on file" badge={properties.length} />
                )}
              </div>

              {properties.length === 0 ? (
                <EmptyState icon={Home} text="No properties listed yet." />
              ) : (
                <div className="space-y-2.5">
                  {properties.map((property) => {
                    const propertyDocs = documents.filter(
                      (d) => d.ownerType === "PROPERTY" && d.ownerId === property.id
                    );
                    return (
                      <div key={property.id} className="rounded-xl border border-slate-100 bg-white p-4 transition-colors hover:border-emerald-200">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                            <Home size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">{property.name}</p>
                              <StatusPill status={property.status} />
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {[property.city, property.region].filter(Boolean).join(", ") || "No location on file"}
                            </p>
                          </div>
                        </div>
                        {propertyDocReqs.length > 0 && (
                          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                            {propertyDocReqs.map((req) => (
                              <EntityDocRow
                                key={req.type}
                                requirement={req}
                                doc={propertyDocs.find((d) => d.type === req.type) || null}
                                onUpload={(file) => handleEntityDocUpload("PROPERTY", property, req, file)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={18} />
      </div>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}
