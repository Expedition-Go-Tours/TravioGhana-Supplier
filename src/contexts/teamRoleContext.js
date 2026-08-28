import { createContext, useContext } from "react";

/**
 * Team-role context split into its own module so the provider file only
 * exports React components (react-refresh/only-export-components).
 */
export const TeamRoleContext = createContext(null);

export function useTeamRoleProvider() {
  const context = useContext(TeamRoleContext);
  if (!context) {
    throw new Error("useTeamRoleProvider must be used within a TeamRoleProvider");
  }
  return context;
}