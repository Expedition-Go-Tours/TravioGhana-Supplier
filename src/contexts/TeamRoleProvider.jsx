import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { getChatSocket } from "@/features/chat/chatSocket";
import { TeamRoleContext } from "./teamRoleContext";

const EMPTY = {
  teamRole: null,
  teamRoles: [],
  customRoles: [],
  roleNames: [],
  permissions: [],
  isOwner: false,
  storefronts: [],
  supplierCreatedBookings: false,
  landingPath: null,
  notificationCategories: [],
  uiPreferences: {},
};

export function TeamRoleProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const lastFetchRef = useRef(0);
  const permissionSignatureRef = useRef("");
  const queryClient = useQueryClient();

  const applyPayload = useCallback((data) => {
    const signature = JSON.stringify(data?.permissions || []);
    if (permissionSignatureRef.current && permissionSignatureRef.current !== signature) {
      // A role edit changed this member's access. Drop cached pages so a
      // revenue or customer view from the previous role cannot linger.
      queryClient.clear();
    }
    permissionSignatureRef.current = signature;
    setState({
      teamRole: data?.role || null,
      teamRoles: data?.roles || (data?.role ? [data.role] : []),
      customRoles: data?.customRoles || [],
      roleNames: data?.roleNames || [],
      permissions: data?.permissions || [],
      isOwner: data?.isOwner || false,
      storefronts: data?.storefronts || [],
      supplierCreatedBookings: data?.supplierCreatedBookings || false,
      landingPath: data?.landingPath || null,
      notificationCategories: data?.notificationCategories || [],
      uiPreferences: data?.uiPreferences || {},
    });
    setError(null);
  }, [queryClient]);

  const fetchAndSet = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/suppliers/settings/team/my-role", {
        skipGlobalErrorHandler: true,
      });
      applyPayload(response.data?.data);
    } catch (err) {
      // A network failure is not "no access". Keep the last known state and
      // surface an error so the shell can offer a retry instead of looping.
      if (!silent) setError(err?.response?.data?.message || "Could not load your access");
    } finally {
      if (!silent) setLoading(false);
      lastFetchRef.current = Date.now();
    }
  }, [applyPayload]);

  const refetch = useCallback(async () => {
    await fetchAndSet();
  }, [fetchAndSet]);

  useEffect(() => {
    if (!isAuthenticated) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (cancelled) return;
        setState(EMPTY);
        setError(null);
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) fetchAndSet();
    });
    return () => { cancelled = true; };
  }, [isAuthenticated, fetchAndSet]);

  // Role edits also reach the client over the shared socket. Refetch on the
  // team event so a member loses/gains access without a manual reload.
  useEffect(() => {
    if (!isAuthenticated || !userId) return undefined;
    let socket;
    try {
      socket = getChatSocket(userId);
    } catch {
      return undefined;
    }
    const refresh = () => fetchAndSet({ silent: true });
    socket.on("team:access-changed", refresh);
    socket.on("team:removed", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("team:access-changed", refresh);
      socket.off("team:removed", refresh);
      socket.off("connect", refresh);
    };
  }, [isAuthenticated, userId, fetchAndSet]);

  // A tab that was backgrounded through a role change should re-check on
  // focus, but not stampede: at most once every 20 seconds.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current < 20_000) return;
      fetchAndSet({ silent: true });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated, fetchAndSet]);

  const hasPermission = (permission) => {
    if (state.isOwner) return true;
    if (state.permissions.includes("*")) return true;
    if (state.permissions.includes(permission)) return true;
    const prefix = permission.split(".")[0];
    return state.permissions.some((p) => p.endsWith("*") && p.startsWith(prefix));
  };

  const canManageTeam = () => hasPermission("team.manage");
  const canManageRoles = () => state.isOwner;
  const canManageTours = () => hasPermission("tours.view");
  const canManageFinance = () => hasPermission("finance.view") || hasPermission("payouts.view");
  const canManageChat = () => hasPermission("chat.view");
  const canManageAnalytics = () => hasPermission("analytics.view");
  const canManageBusinessProfile = () => hasPermission("settings.business");

  return (
    <TeamRoleContext.Provider
      value={{
        ...state,
        loading,
        error,
        refetch,
        hasPermission,
        canManageTeam,
        canManageRoles,
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
