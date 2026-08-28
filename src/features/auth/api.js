import { toast } from "sonner";
import api from "@/lib/axios";
import { canAccessSupplierDashboard, getAuthToken } from "@/stores/authStore";

const AUTH_REQUEST_OPTIONS = {
  skipGlobalErrorHandler: true,
};

async function fetchSupplierProfile(authToken) {
  if (!authToken) {
    return null;
  }

  try {
    const response = await api.get("/suppliers/application/status", {
      skipGlobalErrorHandler: true,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return response.data?.data?.supplierProfile || response.data?.data || null;
  } catch {
    return null;
  }
}

export async function loadSupplierProfile(authToken = getAuthToken()) {
  return fetchSupplierProfile(authToken);
}

export async function loginWithEmail(email, password) {
  const response = await api.post(
    "/auth/login",
    { email, password },
    AUTH_REQUEST_OPTIONS
  );

  return response.data?.data || response.data;
}

export async function fetchCurrentUser(token) {
  const config = { skipGlobalErrorHandler: true };
  if (token) {
    config.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await api.get("/users/me", config);
  return response.data?.data?.user || null;
}

export function getSupplierLoginToast(supplierProfile, user) {
  const name = user?.name || user?.email || "there";
  const status = supplierProfile?.status;

  if (canAccessSupplierDashboard(supplierProfile)) {
    if (status === "ACTIVE") {
      return {
        type: "success",
        message: `Welcome back, ${name}! Your supplier account is active.`,
      };
    }

    return {
      type: "success",
      message: `Welcome back, ${name}! Your supplier account has been approved.`,
    };
  }

  if (!supplierProfile) {
    return {
      type: "success",
      message: `Welcome back, ${name}! Signed in successfully.`,
    };
  }

  if (status === "PENDING" || status === "UNDER_REVIEW") {
    return {
      type: "success",
      message: `Welcome back, ${name}! Your supplier application is being reviewed.`,
    };
  }

  if (status === "REJECTED") {
    return {
      type: "warning",
      message: "Signed in, but your supplier application was not approved.",
    };
  }

  if (status === "SUSPENDED") {
    return {
      type: "error",
      message: "Your supplier account is suspended. Please contact support.",
    };
  }

  return {
    type: "success",
    message: `Welcome back, ${name}! Signed in successfully.`,
  };
}

let lastToastTime = 0;

export function showSupplierLoginToast(supplierProfile, user) {
  const now = Date.now();
  if (now - lastToastTime < 5000) return;
  lastToastTime = now;

  const { type, message } = getSupplierLoginToast(supplierProfile, user);

  if (type === "success") {
    toast.success(message);
  } else if (type === "warning") {
    toast.warning(message);
  } else if (type === "error") {
    toast.error(message);
  } else {
    toast.info(message);
  }
}

export async function loginWithGoogleOneTap(credential) {
  const response = await api.post("/auth/google/onetap", { credential }, {
    skipGlobalErrorHandler: true,
  });
  return response.data?.data || response.data;
}

export function getLoginErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Sign in failed. Please try again."
  );
}
