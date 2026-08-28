import { useContext } from "react";
import { TeamRoleContext } from "@/contexts/teamRoleContext";

export function useTeamRole() {
  const context = useContext(TeamRoleContext);
  if (!context) {
    throw new Error("useTeamRole must be used within a TeamRoleProvider");
  }
  return context;
}
