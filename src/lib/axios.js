import axios from "axios";
import config from "@/config";
import { retryWithBackoff, isRetryableError, handleApiError } from "./errorHandler";
import { useAuthStore, getAuthToken } from "@/stores/authStore";
import { refreshAccessToken, isStaleSessionRequest } from "./tokenRefresh";

const AUTH_REQUIRED_PREFIXES = [
  "/suppliers",
  "/tours/supplier",
  "/bookings",
  "/notifications",
  "/admin",
  "/reviews",
  "/payout",
];

const api = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
});

function getRequestAuthorization(headers) {
  if (!headers) return null;
  if (typeof headers.get === "function") {
    return headers.get("Authorization") || headers.get("authorization");
  }
  return headers.Authorization || headers.authorization || null;
}

function setRequestAuthorization(headers, value) {
  if (typeof headers.set === "function") {
    headers.set("Authorization", value);
    return headers;
  }
  headers.Authorization = value;
  return headers;
}

function requiresAuth(requestConfig) {
  if (requestConfig.skipAuthGuard) {
    return false;
  }

  const url = (requestConfig.url || "").split("?")[0];
  if (url === "/auth/login" || url.endsWith("/auth/login")) {
    return false;
  }

  if (AUTH_REQUIRED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return true;
  }

  const method = (requestConfig.method || "get").toLowerCase();
  if (/^\/tours(\/|$)/.test(url) && method !== "get") {
    return true;
  }

  return false;
}

function createAuthRequiredError() {
  const error = new axios.CanceledError("Authentication required");
  error.code = "AUTH_REQUIRED";
  return error;
}

function isAuthEndpoint(url) {
  const path = String(url || "").split("?")[0];
  return (
    path === "/auth/login" ||
    path.endsWith("/auth/login") ||
    path === "/auth/refresh" ||
    path.endsWith("/auth/refresh") ||
    path === "/auth/logout" ||
    path.endsWith("/auth/logout")
  );
}

function isAuthPagePath() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === "/login" || path.startsWith("/login/") || path.startsWith("/auth/");
}

/**
 * Unrecoverable 401 — clear the session and send the user back to /login.
 * The return URL is only captured when we're NOT already on the login/auth
 * pages, otherwise the post-login redirect can point back at /login and loop.
 */
function performForcedLogout() {
  if (typeof window !== "undefined" && !isAuthPagePath()) {
    localStorage.setItem("auth_return_url", window.location.pathname + window.location.search);
  }
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("refresh_token");
  useAuthStore.getState().setUnauthenticated();
  if (typeof window !== "undefined" && !isAuthPagePath()) {
    window.location.href = "/login";
  }
}

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (requestConfig) => {
    const token = getAuthToken();
    const headers = requestConfig.headers ?? {};

    if (token && !getRequestAuthorization(headers)) {
      requestConfig.headers = setRequestAuthorization(headers, `Bearer ${token}`);
    }

    const authorization = getRequestAuthorization(requestConfig.headers ?? headers);
    if (requiresAuth(requestConfig) && !authorization) {
      return Promise.reject(createAuthRequiredError());
    }

    return requestConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (axios.isCancel(error) || error.code === "AUTH_REQUIRED") {
      return Promise.reject(error);
    }

    if (config.isDevelopment()) {
      console.error("API Error:", {
        status: error.response?.status,
        url: originalRequest?.url,
        message: error.message,
        response: error.response?.data,
      });
    }

    // Handle 401 — attempt token refresh via backend
    if (error.response?.status === 401 && !originalRequest?._retry) {
      // Auth endpoints 401 on their own merit (e.g. wrong password on login);
      // never try to "refresh" or force-logout from them.
      if (isAuthEndpoint(originalRequest?.url)) {
        return Promise.reject(error);
      }

      // Stale request from a previous session (its token no longer matches the
      // current one — e.g. a fresh login just replaced the tokens). Ignore it:
      // do NOT wipe the session or redirect while a login may be in flight.
      const sentAuthorization = getRequestAuthorization(originalRequest?.headers);
      if (isStaleSessionRequest(sentAuthorization)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const data = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers = setRequestAuthorization(
            originalRequest.headers,
            `Bearer ${data.accessToken}`
          );
        }
        return api(originalRequest);
      } catch (refreshErr) {
        if (config.isDevelopment()) {
          console.error("[Auth] Token refresh failed:", refreshErr?.response?.status, refreshErr?.message);
        }

        // The session changed while refreshing (a new login replaced the
        // tokens) — don't tear down the fresh session.
        if (isStaleSessionRequest(sentAuthorization)) {
          return Promise.reject(error);
        }

        performForcedLogout();
        return Promise.reject(error);
      }
    }

    // Retry logic for retryable errors
    if (isRetryableError(error) && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      if (originalRequest._retryCount <= config.api.retryAttempts) {
        try {
          return await retryWithBackoff(
            () => api.request(originalRequest),
            config.api.retryAttempts - originalRequest._retryCount,
            1000
          );
        } catch (retryError) {
          if (!originalRequest?.skipGlobalErrorHandler) {
            handleApiError(retryError);
          }
          return Promise.reject(retryError);
        }
      }
    }

    if (!originalRequest?.skipGlobalErrorHandler) {
      handleApiError(error);
    }

    if (
      error.response?.status === 401 &&
      !isAuthEndpoint(originalRequest?.url) &&
      !isStaleSessionRequest(getRequestAuthorization(originalRequest?.headers)) &&
      typeof window !== "undefined" &&
      !isAuthPagePath()
    ) {
      performForcedLogout();
    }

    return Promise.reject(error);
  }
);

export async function apiRequest(requestFn) {
  try {
    return await retryWithBackoff(requestFn, config.api.retryAttempts);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export default api;
