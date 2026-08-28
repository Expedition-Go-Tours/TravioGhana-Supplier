import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

export default function AuthOnlyRoute() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const location = useLocation();

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 size={32} className="animate-spin text-[#044b3b]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}
