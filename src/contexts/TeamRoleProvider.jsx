import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { TeamRoleContext } from "./teamRoleContext";

export function TeamRoleProvider({ children }) {
  const [teamRole, setTeamRole] = useState(null);
  const [teamRoles, setTeamRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const fetchAndSet = useCallback(async () => {
    try {
      const response = await api.get("/suppliers/settings/team/my-role", {
        skipGlobalErrorHandler: true,
      });
      const data = response.data?.data;
      setTeamRole(data?.role || null);
      setTeamRoles(data?.roles || (data?.role ? [data.role] : []));
      setPermissions(data?.permissions || []);
      setIsOwner(data?.isOwner || false);
    } catch {
      setTeamRole(null);
      setTeamRoles([]);
      setPermissions([]);
      setIsOwner(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchAndSet();
    setLoading(false);
  }, [fetchAndSet]);

  useEffect(() => {
    if (!isAuthenticated) {
      let cancelled = false;
      // Deferred so the resets never run synchronously inside the effect
      Promise.resolve().then(() => {
        if (cancelled) return;
        setTeamRole(null);
        setTeamRoles([]);
        setPermissions([]);
        setIsOwner(false);
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    let cancelled = false;
    // Deferred: keeps the synchronous effect body free of state updates
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);

      const fetchTeamRole = async () => {
        try {
          const response = await api.get("/suppliers/settings/team/my-role", {
            skipGlobalErrorHandler: true,
          });
          if (cancelled) return;
          const data = response.data?.data;
          setTeamRole(data?.role || null);
          setTeamRoles(data?.roles || (data?.role ? [data.role] : []));
          setPermissions(data?.permissions || []);
          setIsOwner(data?.isOwner || false);
        } catch {
          if (cancelled) return;
          setTeamRole(null);
          setTeamRoles([]);
          setPermissions([]);
          setIsOwner(false);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      fetchTeamRole();
    });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const hasPermission = (permission) => {
    if (isOwner) return true;
    if (permissions.includes("*")) return true;
    if (permissions.includes(permission)) return true;
    const prefix = permission.split(".")[0];
    return permissions.some((p) => p.endsWith("*") && p.startsWith(prefix));
  };

  // Permission-based, never role-name based: an ADMIN-role member who is not the
  // account owner must be treated exactly like the owner, and the key used here
  // is the same one the API enforces on the matching route.
  const canManageTeam = () => hasPermission("settings.manage");
  const canManageTours = () => hasPermission("tours.view");
  const canManageFinance = () => hasPermission("payouts.view");
  const canManageChat = () => hasPermission("chat.view");
  const canManageAnalytics = () => hasPermission("analytics.view");
  const canManageBusinessProfile = () => hasPermission("settings.business");

  return (
    <TeamRoleContext.Provider
      value={{
        teamRole,
        teamRoles,
        permissions,
        isOwner,
        loading,
        refetch,
        hasPermission,
        canManageTeam,
        canManageTours,
        canManageFinance,
        canManageChat,
        canManageAnalytics,
        canManageBusinessProfile,
      }}
    >
      {children}
    </TeamRoleContext.Provider>
  );
}
