import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  useAuthStore,
  isAdminUser,
  canAccessSupplierDashboard,
  getAuthToken,
} from "@/stores/authStore";
import { loadSupplierProfile } from "@/features/auth/api";
import { useTeamRole } from "@/hooks/useTeamRole";
import { Loader2 } from "lucide-react";

const PROFILE_CHECK_TIMEOUT_MS = 8000;

function SessionLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-[#044b3b]" />
        <p className="text-sm text-[#64748b]">Verifying session...</p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ requireAdmin = false }) {
  const { isAuthenticated, hasHydrated, supplierProfile, setSupplierProfile } = useAuthStore();
  const location = useLocation();
  const isAdmin = isAdminUser();
  const authToken = getAuthToken();
  const profileCheckStarted = useRef(false);
  const { teamRole, loading: teamRoleLoading } = useTeamRole();

  const isTeamMember = !teamRoleLoading && teamRole !== null;
  const hasDashboardAccess = isAdmin || canAccessSupplierDashboard(supplierProfile) || isTeamMember;
  const needsProfileLookup =
    hasHydrated && isAuthenticated && Boolean(authToken) && !isAdmin && !isTeamMember && !canAccessSupplierDashboard(supplierProfile);

  const [profileResolved, setProfileResolved] = useState(() => !needsProfileLookup);

  useEffect(() => {
    if (!needsProfileLookup) {
      return undefined;
    }

    if (profileCheckStarted.current) {
      return undefined;
    }

    profileCheckStarted.current = true;
    let cancelled = false;

    // Defer the state writes into a microtask so the effect body stays free
    // of synchronous setState (avoids cascading render warnings).
    Promise.resolve().then(() => {
      if (cancelled) return;
      setProfileResolved(false);

      const timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setProfileResolved(true);
        }
      }, PROFILE_CHECK_TIMEOUT_MS);

      loadSupplierProfile(authToken)
        .then((profile) => {
          if (!cancelled) {
            setSupplierProfile(profile);
          }
        })
        .finally(() => {
          if (!cancelled) {
            window.clearTimeout(timeoutId);
            setProfileResolved(true);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [needsProfileLookup, authToken, setSupplierProfile]);

  useEffect(() => {
    if (isAuthenticated && !authToken) {
      useAuthStore.getState().setUnauthenticated();
    }
  }, [isAuthenticated, authToken]);

  if (!hasHydrated) {
    return <SessionLoadingScreen />;
  }

  if (!isAuthenticated || !authToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (teamRoleLoading || (needsProfileLookup && !profileResolved)) {
    return <SessionLoadingScreen />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin && !hasDashboardAccess) {
    return <Navigate to="/supplier/status" replace />;
  }

  return <Outlet />;
}
