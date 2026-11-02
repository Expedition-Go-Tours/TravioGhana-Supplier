import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useAuthStore } from "@/stores/authStore";
import { firstAllowedPath } from "@/config/pageAccess";

export default function NoAccessPage() {
  const { hasPermission, roleNames, refetch, loading } = useTeamRole();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const fallback = firstAllowedPath(hasPermission);

  const handleRetry = async () => {
    await refetch();
    if (fallback !== "/no-access") navigate(fallback, { replace: true });
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <ShieldAlert size={24} />
      </div>
      <h1 className="text-lg font-bold text-slate-800">No dashboard access yet</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {roleNames?.length
          ? `Your role (${roleNames.join(" + ")}) does not include a page you can open.`
          : "Your account is not assigned to a role that can open the supplier dashboard."}
        {" "}Ask the business owner to update your access.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={handleRetry} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Check again
        </button>
        <button type="button" onClick={async () => { await logout(); navigate("/login", { replace: true }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}
