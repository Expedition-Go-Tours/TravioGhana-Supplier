import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginWithEmail,
  fetchCurrentUser,
  loadSupplierProfile,
  getLoginErrorMessage,
} from "@/features/auth/api";
import { useAuthStore, canAccessSupplierDashboard } from "@/stores/authStore";
import api from "@/lib/axios";

/**
 * Read the stored post-login return URL, but only accept a real internal path.
 * Never trust "/login" or the auth-callback routes — landing back on those after
 * login is what previously produced a redirect loop and a blank screen.
 */
export function getSafeReturnUrl() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_return_url");
  if (!raw) return null;

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (!url.pathname.startsWith("/")) return null;
    if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return null;
    if (url.pathname === "/auth/callback" || url.pathname.startsWith("/auth/")) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function getPostLoginPath(supplierProfile, isTeamMember) {
  const returnUrl = getSafeReturnUrl();

  if (returnUrl) {
    return returnUrl;
  }

  if (canAccessSupplierDashboard(supplierProfile) || isTeamMember) {
    return "/";
  }

  return "/supplier/status";
}

async function checkIsTeamMember() {
  try {
    const res = await api.get("/suppliers/settings/team/my-role", {
      skipGlobalErrorHandler: true,
    });
    return res.data?.data?.role !== null;
  } catch {
    return false;
  }
}

export function useSupplierLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finalizeLogin = useCallback(
    async (user, token, supplierProfile) => {
      login(user, token, supplierProfile);

      const isTeamMember = await checkIsTeamMember();
      const path = getPostLoginPath(supplierProfile, isTeamMember);
      localStorage.removeItem("auth_return_url");
      navigate(path, { replace: true });
    },
    [login, navigate]
  );

  const completeLoginWithEmail = useCallback(
    async (email, password) => {
      setError("");
      setLoading(true);

      try {
        const data = await loginWithEmail(email, password);
        const { user, accessToken, refreshToken } = data;

        if (!user) {
          throw new Error("Backend did not return user data.");
        }

        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }

        const supplierProfile = await loadSupplierProfile(accessToken);
        await finalizeLogin(user, accessToken, supplierProfile);

        return { user, supplierProfile };
      } catch (err) {
        const message = getLoginErrorMessage(err);
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [finalizeLogin]
  );

  const completeLoginFromToken = useCallback(
    async (accessToken, refreshToken) => {
      setError("");
      setLoading(true);

      try {
        localStorage.setItem("auth_token", accessToken);
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }

        const user = await fetchCurrentUser(accessToken);
        if (!user) {
          throw new Error("Backend did not return user data.");
        }

        const supplierProfile = await loadSupplierProfile(accessToken);
        await finalizeLogin(user, accessToken, supplierProfile);

        return { user, supplierProfile };
      } catch (err) {
        const message = getLoginErrorMessage(err);
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [finalizeLogin]
  );

  return { completeLoginWithEmail, completeLoginFromToken, loading, error, setError };
}
