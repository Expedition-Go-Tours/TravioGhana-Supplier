import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  Building2,
  FileText,
  RefreshCw,
  LogIn,
} from "lucide-react";
import {
  useAuthStore,
  isSupplierUser,
  canAccessSupplierDashboard,
  getAuthToken,
} from "@/stores/authStore";
import { loadSupplierProfile } from "@/features/auth/api";
import { replaceDocument } from "@/features/supplier/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    color: "text-[#92400e]",
    bg: "bg-[#fef3c7]",
    title: "Application Pending",
    description: "Your supplier application has been submitted and is awaiting review by our team.",
  },
  UNDER_REVIEW: {
    icon: Clock,
    color: "text-[#1e40af]",
    bg: "bg-[#dbeafe]",
    title: "Application Under Review",
    description: "Your application is currently being reviewed by our team. This usually takes 2-3 business days.",
  },
  APPROVED: {
    icon: CheckCircle2,
    color: "text-[#1e40af]",
    bg: "bg-[#dbeafe]",
    title: "Application Approved",
    description: "Your application has been approved! You can now access the supplier dashboard.",
  },
  ACTIVE: {
    icon: CheckCircle2,
    color: "text-[#166534]",
    bg: "bg-[#dcfce7]",
    title: "Verified Supplier",
    description: "Your account is active. You can now create and manage tours.",
  },
  SUSPENDED: {
    icon: XCircle,
    color: "text-[#991b1b]",
    bg: "bg-[#fee2e2]",
    title: "Account Suspended",
    description: "Your supplier account has been suspended. Please contact support for more information.",
  },
  REJECTED: {
    icon: XCircle,
    color: "text-[#991b1b]",
    bg: "bg-[#fee2e2]",
    title: "Application Rejected",
    description: "Your supplier application was not approved at this time.",
  },
  EXPIRED: {
    icon: XCircle,
    color: "text-[#991b1b]",
    bg: "bg-[#fee2e2]",
    title: "Documents Expired",
    description: "A required licence or certificate has expired. Upload a renewed copy to restore your account.",
  },
};

const DOC_STATUS_STYLES = {
  APPROVED: "bg-[#dcfce7] text-[#166534]",
  REJECTED: "bg-[#fee2e2] text-[#991b1b]",
  REPLACEMENT_REQUESTED: "bg-[#fef3c7] text-[#92400e]",
  EXPIRED: "bg-[#fee2e2] text-[#991b1b]",
  PENDING: "bg-[#dbeafe] text-[#1e40af]",
};

const DOC_LABEL = (type) =>
  (type || "Other").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function SupplierStatusPage() {
  const navigate = useNavigate();
  const { supplierProfile, setSupplierProfile } = useAuthStore();
  const [loading, setLoading] = useState(!supplierProfile);
  const [error, setError] = useState(null);
  const isSupplier = isSupplierUser();

  useEffect(() => {
    if (!isSupplier || supplierProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    loadSupplierProfile()
      .then((profile) => {
        setSupplierProfile(profile);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load supplier status");
      })
      .finally(() => setLoading(false));
  }, [isSupplier, supplierProfile, setSupplierProfile]);

  useEffect(() => {
    if (canAccessSupplierDashboard(supplierProfile)) {
      navigate("/", { replace: true });
    }
  }, [supplierProfile, navigate]);

  // If not a supplier at all
  if (!isSupplier && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#eaeaea] shadow-sm p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#fef3c7] flex items-center justify-center">
              <Building2 size={32} className="text-[#92400e]" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-[#1e293b] mb-2">Not a Supplier</h1>
          <p className="text-sm text-[#64748b] mb-6">
            You need to apply to become a verified supplier before you can access the dashboard.
          </p>
          <div className="space-y-3">
            <a
              href="https://travioghana.com/become-a-supplier"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors"
            >
              <Shield size={16} />
              <span>Apply on Main Site</span>
            </a>
            <p className="text-xs text-[#9e9e9e]">
              After applying, log back in here to check your application status.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#044b3b]" />
          <p className="text-sm text-[#64748b]">Loading your supplier status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error.includes("401") || error.toLowerCase().includes("token") || error.toLowerCase().includes("session") || error.toLowerCase().includes("expired") || error.toLowerCase().includes("unauthorized") || error.toLowerCase().includes("log in again");
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#eaeaea] shadow-sm p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full ${isAuthError ? "bg-[#fef3c7]" : "bg-[#fee2e2]"} flex items-center justify-center`}>
              {isAuthError ? <LogIn size={32} className="text-[#92400e]" /> : <AlertCircle size={32} className="text-[#dc2626]" />}
            </div>
          </div>
          <h1 className="text-xl font-bold text-[#1e293b] mb-2">
            {isAuthError ? "Session Expired" : "Something went wrong"}
          </h1>
          <p className="text-sm text-[#64748b] mb-6">
            {isAuthError
              ? "Your session has expired. Please log in again to continue."
              : error}
          </p>
          {isAuthError ? (
            <button
              onClick={() => {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
                localStorage.removeItem("refresh_token");
                useAuthStore.getState().setUnauthenticated();
                window.location.href = "/login";
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors"
            >
              <LogIn size={16} />
              <span>Log In Again</span>
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors"
            >
              <RefreshCw size={16} />
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const status = supplierProfile?.status || "PENDING";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;
  const canProceed = canAccessSupplierDashboard(supplierProfile);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-[#eaeaea] shadow-sm p-8">
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-full ${config.bg} flex items-center justify-center`}>
            <StatusIcon size={32} className={config.color} />
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#1e293b] mb-2 text-center">{config.title}</h1>
        <p className="text-sm text-[#64748b] mb-6 text-center">{config.description}</p>

        {/* Status Badge */}
        <div className="flex items-center justify-center mb-6">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
            <StatusIcon size={14} />
            {status}
          </span>
        </div>

        {/* Profile Details */}
        {supplierProfile && (
          <div className="bg-[#f8fafc] rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <FileText size={14} />
              <span>Profile ID: {supplierProfile.id?.slice(0, 12)}...</span>
            </div>
            {supplierProfile.createdAt && (
              <div className="flex items-center gap-2 text-sm text-[#64748b]">
                <Clock size={14} />
                <span>Applied {formatDate(supplierProfile.createdAt)}</span>
              </div>
            )}
            {supplierProfile.reviewedAt && (
              <div className="flex items-center gap-2 text-sm text-[#64748b]">
                <Clock size={14} />
                <span>Reviewed {formatDate(supplierProfile.reviewedAt)}</span>
              </div>
            )}
            {supplierProfile.adminNotes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText size={14} className="mt-0.5 text-[#64748b]" />
                <p className="text-[#1e293b]">{supplierProfile.adminNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        {supplierProfile?.documents?.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <FileText size={15} className="text-[#044b3b]" />
              <h2 className="text-sm font-bold text-[#1e293b]">Required documents</h2>
            </div>
            <div className="space-y-2">
              {supplierProfile.documents.map((doc) => (
                <DocumentStatusRow key={doc.id} doc={doc} onReplaced={() => window.location.reload()} />
              ))}
            </div>
          </div>
        )}

        {canProceed && (
          <div className="mb-3">
            <button
              onClick={() => navigate("/verification")}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-[#044b3b] text-[#044b3b] rounded-lg text-sm font-medium hover:bg-[#f0fdf4] transition-colors"
            >
              <Shield size={16} />
              <span>Manage Verification</span>
            </button>
          </div>
        )}

        {canProceed && (
          <button
            onClick={() => navigate("/")}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors"
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={16} />
          </button>
        )}

        {!canProceed && status === "REJECTED" && (
          <div className="text-center">
            <a
              href="https://travioghana.com/become-a-supplier"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors"
            >
              <Shield size={16} />
              <span>Re-apply on Main Site</span>
            </a>
          </div>
        )}

        {!canProceed && status !== "REJECTED" && (
          <div className="text-center">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-[#044b3b] rounded-lg text-sm font-medium hover:bg-[#f0fdf4] transition-colors"
            >
              <RefreshCw size={16} />
              <span>Check Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentStatusRow({ doc, onReplaced }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const replaceable = ["REJECTED", "REPLACEMENT_REQUESTED", "EXPIRED"].includes(doc.status);
  const style = DOC_STATUS_STYLES[doc.status] || "bg-[#f1f5f9] text-[#64748b]";

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await replaceDocument(doc.id, file);
      toast.success("Document re-uploaded — it's back under review");
      onReplaced();
    } catch {
      toast.error("Failed to upload replacement");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#eaeaea] bg-white px-3 py-2.5">
      <FileText size={15} className="shrink-0 text-[#64748b]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#1e293b]">{DOC_LABEL(doc.type)}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style}`}>
            {doc.status.replace(/_/g, " ")}
          </span>
          {doc.expiryDate && (
            <span className="text-[11px] text-[#64748b]">expires {formatDate(doc.expiryDate)}</span>
          )}
        </div>
      </div>
      {replaceable && (
        <>
          <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFile} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 rounded-lg bg-[#044b3b] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#033629] disabled:opacity-60"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {uploading ? "Uploading" : "Re-upload"}
          </button>
        </>
      )}
    </div>
  );
}