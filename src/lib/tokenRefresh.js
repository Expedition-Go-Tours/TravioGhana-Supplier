import axios from "axios";
import config from "@/config";
import { useAuthStore } from "@/stores/authStore";

let inFlightRefresh = null;

export function getRefreshToken() {
  return localStorage.getItem("refresh_token") || null;
}

export function getStoredAccessToken() {
  return localStorage.getItem("auth_token") || null;
}

/**
 * True when the Authorization header the failing request was sent with no
 * longer matches the currently stored access token — i.e. the request is a
 * stale leftover from a previous session. Such 401s must never wipe a fresh
 * session or trigger a redirect (a login may be in flight).
 */
export function isStaleSessionRequest(authorizationValue) {
  if (!authorizationValue) return false;
  const current = getStoredAccessToken();
  if (!current) return true;
  const sent = String(authorizationValue).replace(/^Bearer\s+/i, "");
  return sent !== current;
}

/**
 * Single-flight access-token refresh. Concurrent callers (the proactive
 * useTokenRefresh timer/activity listener and the axios 401 interceptor) share
 * one /auth/refresh request so the backend's rotating refresh token can't be
 * raced into a revoked-token 401.
 */
export async function refreshAccessToken() {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  const promise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      const err = new Error("No refresh token available");
      err.code = "NO_REFRESH_TOKEN";
      throw err;
    }

    const res = await axios.post(
      `${config.api.baseURL}/auth/refresh`,
      { refreshToken },
      { skipGlobalErrorHandler: true }
    );

    const data = res.data?.data;
    if (!data?.accessToken) {
      throw new Error("Refresh response did not include an access token");
    }

    localStorage.setItem("auth_token", data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem("refresh_token", data.refreshToken);
    }
    useAuthStore.getState().setToken(data.accessToken);
    return data;
  })();

  inFlightRefresh = promise;
  try {
    return await promise;
  } finally {
    if (inFlightRefresh === promise) {
      inFlightRefresh = null;
    }
  }
}
