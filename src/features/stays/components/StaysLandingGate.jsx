import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useStaysWorkspaceStore } from "@/stores/staysWorkspaceStore";
import { WORKSPACES, defaultWorkspaceForProfile } from "@/config/staysWorkspace";

/**
 * Sends accommodation suppliers to their workspace on `/`.
 *
 * Decision (agreed with the product owner): suppliers whose application
 * services include accommodation land on `/stays`; everyone else keeps the
 * Experiences dashboard. The switcher stays available to all, and once a
 * supplier explicitly picks a workspace (`userOverride`) this gate stops
 * redirecting — choosing Experiences is remembered, not overruled.
 */
export default function StaysLandingGate({ children }) {
  const supplierProfile = useAuthStore((state) => state.supplierProfile);
  const workspace = useStaysWorkspaceStore((state) => state.workspace);
  const userOverride = useStaysWorkspaceStore((state) => state.userOverride);

  const belongsToStays = defaultWorkspaceForProfile(supplierProfile) === WORKSPACES.STAYS;

  if (belongsToStays && !userOverride && workspace !== WORKSPACES.STAYS) {
    return <Navigate to="/stays" replace />;
  }

  return children;
}
