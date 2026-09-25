import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTeamRole } from "@/hooks/useTeamRole";
import { pageAccessFor } from "@/config/pageAccess";

/**
 * Route guard for team members.
 *
 * The sidebar already hides pages a role cannot use, but a bookmarked URL, a
 * stale tab or a hand-typed path can still land on one — and those pages used
 * to render a blank shell full of failed requests. This guard sends the member
 * back to the dashboard with an explanation instead.
 *
 * Used as a layout route (`{ element: <RequirePageAccess />, children: [...] }`)
 * so it gates the whole app shell in one place. Owners and admins (who hold `*`)
 * pass everything, as do pages with no permission rule. While the member's
 * permissions are still loading we render nothing rather than redirecting, so a
 * page never flashes "no access" on a hard refresh.
 */
export default function RequirePageAccess() {
  const { hasPermission, loading } = useTeamRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { permission } = pageAccessFor(location.pathname);
  const deniedFor = useRef(null);

  const allowed = !permission || hasPermission(permission);

  useEffect(() => {
    if (loading || allowed) return;

    // One message per page, not one per render.
    if (deniedFor.current !== location.pathname) {
      deniedFor.current = location.pathname;
      toast.error("You don't have access to that page", {
        description: "Ask the business owner to update your team role.",
      });
    }
    navigate("/", { replace: true });
  }, [allowed, loading, location.pathname, navigate]);

  if (loading || !allowed) return null;
  return <Outlet />;
}
