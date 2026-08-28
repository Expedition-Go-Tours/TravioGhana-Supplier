import { useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  FileText,
  Upload,
  Loader2,
  Car,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  CalendarClock,
  Eye,
  UserCheck,
} from "lucide-react";
import { loadSupplierProfile } from "@/features/auth/api";
import { replaceDocument, addDocument, addVehicle, removeVehicle, addGuide, removeGuide } from "@/features/supplier/api";
import { formatDate } from "@/lib/utils";

const DOC_LABEL = (type) =>
  (type || "Other").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const DOC_STATUS = {
  APPROVED: { label: "Approved", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", icon: XCircle, cls: "bg-rose-50 text-rose-600" },
  REPLACEMENT_REQUESTED: { label: "Replacement requested", icon: AlertTriangle, cls: "bg-amber-50 text-amber-700" },
  EXPIRED: { label: "Expired", icon: XCircle, cls: "bg-rose-50 text-rose-600" },
  PENDING: { label: "Pending review", icon: Clock, cls: "bg-sky-50 text-sky-700" },
};

const VEHICLE_DOC_TYPES = [
  { type: "VEHICLE_REGISTRATION", label: "Vehicle registration" },
  { type: "VEHICLE_OWNERSHIP", label: "Ownership document" },
  { type: "VEHICLE_ROADWORTHINESS", label: "Roadworthiness" },
  { type: "VEHICLE_INSURANCE", label: "Insurance" },
];

const GUIDE_DOC_TYPES = [
  { type: "TOUR_GUIDE_LICENCE", label: "Tour guide licence" },
  { type: "DRIVERS_LICENCE", label: "Driver's licence" },
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
  { value: "TOUR_GUIDE_LICENCE", label: "Tour guide licence" },
  { value: "DRIVERS_LICENCE", label: "Driver's licence" },
  { value: "GHANA_CARD", label: "Ghana Card" },
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of address" },
  { value: "PROFILE_PHOTO", label: "Profile photograph" },
  { value: "PASSENGER_TRANSPORT_LICENCE", label: "Passenger transport licence" },
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

function DocumentRow({ doc, onReplace }) {
  const inputRef = useRef(null);
  const replaceable = ["REJECTED", "REPLACEMENT_REQUESTED", "EXPIRED"].includes(doc.status);
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

const emptyVehicle = { make: "", model: "", year: "", registrationNumber: "", photos: [], docs: {} };
const emptyGuide = { fullName: "", phone: "", email: "", docs: {} };
const emptyDocForm = { type: "", file: null, expiryDate: "" };

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [showGuideForm, setShowGuideForm] = useState(false);
  const [guideForm, setGuideForm] = useState(emptyGuide);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState(emptyDocForm);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [guideSaving, setGuideSaving] = useState(false);
  const [docSaving, setDocSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["supplier", "application-status"],
    queryFn: () => loadSupplierProfile(),
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["supplier", "application-status"] });
  }, [queryClient]);

  const replaceMutation = useMutation({
    mutationFn: ({ doc, file }) => replaceDocument(doc.id, file),
    onSuccess: () => {
      toast.success("Document re-uploaded — it's back under review");
      refresh();
    },
    onError: () => toast.error("Failed to upload replacement"),
  });

  const handleReplace = (doc, file) => replaceMutation.mutate({ doc, file });

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
      await addDocument({ type: docForm.type, file: docForm.file, expiryDate: docForm.expiryDate || undefined });
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

  const handleAddVehicle = async () => {
    const { make, model, registrationNumber } = vehicleForm;
    if (!make.trim() || !model.trim() || !registrationNumber.trim()) {
      toast.error("Vehicle make, model and registration number are required");
      return;
    }
    const documents = VEHICLE_DOC_TYPES.map((dt) => ({ type: dt.type, file: vehicleForm.docs[dt.type] })).filter((d) => d.file);
    const required = VEHICLE_DOC_TYPES.filter((dt) => !vehicleForm.docs[dt.type]);
    if (required.length > 0) {
      toast.error(`Attach ${required[0].label} for this vehicle`);
      return;
    }
    setVehicleSaving(true);
    try {
      await addVehicle({
        data: { key: `vehicle-${Date.now()}`, make, model, year: vehicleForm.year ? parseInt(vehicleForm.year, 10) : null, registrationNumber },
        documents,
        vehiclePhotos: vehicleForm.photos,
      });
      toast.success("Vehicle added — awaiting verification");
      setVehicleForm(emptyVehicle);
      setShowVehicleForm(false);
      refresh();
    } catch {
      toast.error("Failed to add vehicle");
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleRemoveVehicle = async (id) => {
    try {
      await removeVehicle(id);
      toast.success("Vehicle removed");
      refresh();
    } catch {
      toast.error("Failed to remove vehicle");
    }
  };

  const handleAddGuide = async () => {
    if (!guideForm.fullName.trim()) {
      toast.error("Guide full name is required");
      return;
    }
    const documents = GUIDE_DOC_TYPES.map((dt) => ({ type: dt.type, file: guideForm.docs[dt.type] })).filter((d) => d.file);
    const required = GUIDE_DOC_TYPES.filter((dt) => !guideForm.docs[dt.type]);
    if (required.length > 0) {
      toast.error(`Attach ${required[0].label} for this guide`);
      return;
    }
    setGuideSaving(true);
    try {
      await addGuide({
        data: { key: `guide-${Date.now()}`, fullName: guideForm.fullName, phone: guideForm.phone, email: guideForm.email },
        documents,
      });
      toast.success("Guide added — awaiting verification");
      setGuideForm(emptyGuide);
      setShowGuideForm(false);
      refresh();
    } catch {
      toast.error("Failed to add guide");
    } finally {
      setGuideSaving(false);
    }
  };

  const handleRemoveGuide = async (id) => {
    try {
      await removeGuide(id);
      toast.success("Guide removed");
      refresh();
    } catch {
      toast.error("Failed to remove guide");
    }
  };

  const documents = profile?.documents || [];
  const vehicles = profile?.vehicles || [];
  const guides = profile?.guides || [];

  const pendingDocs = documents.filter((d) => d.status === "PENDING").length;
  const approvedDocs = documents.filter((d) => d.status === "APPROVED").length;
  const actionDocs = documents.filter((d) => ["REJECTED", "REPLACEMENT_REQUESTED", "EXPIRED"].includes(d.status)).length;
  const pendingFleet = vehicles.filter((v) => v.status !== "VERIFIED").length + guides.filter((g) => g.status !== "VERIFIED").length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Verification</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Track every document, vehicle and guide. Nothing goes live until it's approved.
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard icon={FileText} label="Documents pending review" value={pendingDocs} accent="sky" hint="Awaiting our team" />
            <SummaryCard icon={CheckCircle2} label="Documents approved" value={approvedDocs} accent="emerald" hint="Good to go" />
            <SummaryCard icon={AlertTriangle} label="Actions needed" value={actionDocs} accent={actionDocs > 0 ? "rose" : "emerald"} hint={actionDocs > 0 ? "Rejected or expired" : "All clear"} />
            <SummaryCard icon={Car} label="Fleet & guides pending" value={pendingFleet} accent={pendingFleet > 0 ? "amber" : "emerald"} hint="Awaiting verification" />
          </div>

          {/* Documents */}
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
                    {ADDABLE_DOC_TYPES.map((t) => (
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

          {/* Vehicles */}
          <section className="space-y-4 rounded-xl border border-emerald-100/60 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader icon={Car} title="Vehicles" subtitle="Each vehicle needs its own verified documents" badge={vehicles.length} />
              <AddButton onClick={() => setShowVehicleForm((v) => !v)} label="Add vehicle" />
            </div>

            {showVehicleForm && (
              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={vehicleForm.make} onChange={(e) => setVehicleForm((f) => ({ ...f, make: e.target.value }))} placeholder="Make (e.g. Toyota)" className={inputCls} />
                  <input value={vehicleForm.model} onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))} placeholder="Model (e.g. Hiace)" className={inputCls} />
                  <input value={vehicleForm.year} onChange={(e) => setVehicleForm((f) => ({ ...f, year: e.target.value }))} placeholder="Year" className={inputCls} />
                  <input value={vehicleForm.registrationNumber} onChange={(e) => setVehicleForm((f) => ({ ...f, registrationNumber: e.target.value }))} placeholder="Registration number" className={inputCls} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {VEHICLE_DOC_TYPES.map((dt) => (
                    <label key={dt.type} className={fileLabelCls}>
                      <span className="mb-1.5 block font-medium text-slate-600">{dt.label}</span>
                      <input
                        type="file"
                        className="block w-full text-[11px]"
                        accept="image/*,.pdf"
                        onChange={(e) => setVehicleForm((f) => ({ ...f, docs: { ...f.docs, [dt.type]: e.target.files?.[0] || null } }))}
                      />
                    </label>
                  ))}
                </div>
                <label className={fileLabelCls}>
                  <span className="mb-1.5 block font-medium text-slate-600">Vehicle photos</span>
                  <input
                    type="file"
                    multiple
                    className="block w-full text-[11px]"
                    accept="image/*"
                    onChange={(e) => setVehicleForm((f) => ({ ...f, photos: Array.from(e.target.files || []) }))}
                  />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <OutlineButton onClick={() => setShowVehicleForm(false)}>Cancel</OutlineButton>
                  <button type="button" onClick={handleAddVehicle} disabled={vehicleSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60">
                    {vehicleSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save vehicle
                  </button>
                </div>
              </div>
            )}

            {vehicles.length === 0 ? (
              <EmptyState icon={Car} text="No vehicles listed yet." />
            ) : (
              <div className="space-y-2.5">
                {vehicles.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 transition-colors hover:border-emerald-200">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                      <Car size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{v.make} {v.model}{v.year ? ` · ${v.year}` : ""}</p>
                        <StatusPill status={v.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">Reg: {v.registrationNumber}</p>
                    </div>
                    <OutlineButton danger onClick={() => handleRemoveVehicle(v.id)}><Trash2 size={13} /> Remove</OutlineButton>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Guides */}
          <section className="space-y-4 rounded-xl border border-emerald-100/60 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader icon={Users} title="Guides" subtitle="Each guide gets their own verified profile" badge={guides.length} />
              <AddButton onClick={() => setShowGuideForm((v) => !v)} label="Add guide" />
            </div>

            {showGuideForm && (
              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={guideForm.fullName} onChange={(e) => setGuideForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Full name" className={inputCls} />
                  <input value={guideForm.phone} onChange={(e) => setGuideForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone" className={inputCls} />
                  <input value={guideForm.email} onChange={(e) => setGuideForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className={`${inputCls} sm:col-span-2`} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {GUIDE_DOC_TYPES.map((dt) => (
                    <label key={dt.type} className={fileLabelCls}>
                      <span className="mb-1.5 block font-medium text-slate-600">{dt.label}</span>
                      <input
                        type="file"
                        className="block w-full text-[11px]"
                        accept="image/*,.pdf"
                        onChange={(e) => setGuideForm((f) => ({ ...f, docs: { ...f.docs, [dt.type]: e.target.files?.[0] || null } }))}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <OutlineButton onClick={() => setShowGuideForm(false)}>Cancel</OutlineButton>
                  <button type="button" onClick={handleAddGuide} disabled={guideSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60">
                    {guideSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save guide
                  </button>
                </div>
              </div>
            )}

            {guides.length === 0 ? (
              <EmptyState icon={Users} text="No guides added yet." />
            ) : (
              <div className="space-y-2.5">
                {guides.map((g) => (
                  <div key={g.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 transition-colors hover:border-emerald-200">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                      <Users size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{g.fullName}</p>
                        <StatusPill status={g.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{[g.phone, g.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                    </div>
                    <OutlineButton danger onClick={() => handleRemoveGuide(g.id)}><Trash2 size={13} /> Remove</OutlineButton>
                  </div>
                ))}
              </div>
            )}
          </section>
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
