import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTeamRole } from "@/hooks/useTeamRole";
import { pageAccessFor, firstAllowedPath, isAllowedLandingPath } from "@/config/pageAccess";

/**
 * Route guard for team members.
 *
 * Two failure modes are handled deliberately:
 *  - a denied page redirects to the role's landing path, never back to the
 *    same path (which used to create a redirect loop for a zero-permission
 *    role);
 *  - a failed /my-role request shows a retry state instead of treating the
 *    member as having no access.
 */
export default function RequirePageAccess() {
  const { hasPermission, loading, error, landingPath, refetch } = useTeamRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { permission } = pageAccessFor(location.pathname);
  const deniedFor = useRef(null);

  const allowed = !permission || hasPermission(permission);
  const target = isAllowedLandingPath(hasPermission, landingPath)
    ? landingPath
    : firstAllowedPath(hasPermission);

  useEffect(() => {
    if (loading || allowed) return;

    if (deniedFor.current !== location.pathname) {
      deniedFor.current = location.pathname;
      toast.error("You don't have access to that page", {
        description: "Ask the business owner to update your role.",
      });
    }

    const destination = target === location.pathname ? "/no-access" : target;
    navigate(destination, { replace: true });
  }, [allowed, loading, location.pathname, navigate, target]);

  if (error && !loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-slate-700">We couldn't load your access</p>
        <p className="max-w-sm text-xs text-slate-500">
          {error} This is a loading failure, not a permissions decision.
        </p>
        <button type="button" onClick={() => refetch()} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
          Retry
        </button>
      </div>
    );
  }

  if (loading || !allowed) return null;
  return <Outlet />;
}
