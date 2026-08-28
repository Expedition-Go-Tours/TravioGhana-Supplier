import { Navigate } from "react-router-dom";
import { useAuthStore, canAccessSupplierDashboard } from "@/stores/authStore";
import { getPostLoginPath } from "@/features/auth/hooks/useSupplierLogin";

/**
 * Redirects authenticated APPROVED/ACTIVE suppliers away from public auth pages.
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated, user, supplierProfile } = useAuthStore();

  if (isAuthenticated && user && canAccessSupplierDashboard(supplierProfile)) {
    return <Navigate to={getPostLoginPath(supplierProfile)} replace />;
  }

  return children;
}
