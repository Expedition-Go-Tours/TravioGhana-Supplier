import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";
import AuthShell from "@/features/auth/AuthShell";
import { getLoginErrorMessage, fetchCurrentUser, loadSupplierProfile } from "@/features/auth/api";
import { useAuthStore } from "@/stores/authStore";
import { getPostLoginPath, getSafeReturnUrl } from "@/features/auth/hooks/useSupplierLogin";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const hasToken = Boolean(accessToken);
  const [status, setStatus] = useState(() => (hasToken ? "loading" : "error"));
  const [errorMessage, setErrorMessage] = useState(() =>
    hasToken ? "" : "No authentication token found in the URL."
  );

  useEffect(() => {
    if (window.history.replaceState) {
      const cleanUrl =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname;
      try {
        window.history.replaceState({ path: cleanUrl }, "", cleanUrl);
      } catch {
        // replaceState can throw in sandboxed/inline-frame contexts; auth continues
      }
    }

    if (!hasToken) {
      toast.error("Authentication failed: missing token.");
      return;
    }

    // The token arrives in the URL because the main site redirects here, but
    // it must NOT be written to localStorage until it has been proven: a
    // truncated, expired or replayed token would otherwise leave a half-signed
    // session that every later request fails against. `login()` below is what
    // persists it, and only after the user and profile fetches succeed.
    let cancelled = false;
    let redirectTimer = null;

    const fail = (message) => {
      if (cancelled) return;
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_user");
      useAuthStore.getState().setUnauthenticated();
      setStatus("error");
      setErrorMessage(message);
      toast.error(message);
    };

    (async () => {
      try {
        const user = await fetchCurrentUser(accessToken);
        if (!user) {
          throw new Error("Backend did not return user data.");
        }

        const supplierProfile = await loadSupplierProfile(accessToken);
        if (cancelled) return;

        login(user, accessToken, supplierProfile);
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }

        setStatus("success");

        const returnUrl = getSafeReturnUrl();
        const redirectTo = returnUrl || getPostLoginPath(supplierProfile);

        redirectTimer = setTimeout(() => {
          localStorage.removeItem("auth_return_url");
          navigate(redirectTo, { replace: true });
        }, 1500);
      } catch (err) {
        fail(getLoginErrorMessage(err));
      }
    })();

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [searchParams, login, navigate, accessToken, refreshToken, hasToken]);

  const statusCopy = {
    checking: {
      icon: Loader2,
      spinning: true,
      title: "Checking authentication",
      subtitle: "We're reading the token from your main site sign-in.",
    },
    loading: {
      icon: Loader2,
      spinning: true,
      title: "Verifying your session",
      subtitle:
        "Please wait while we validate your credentials and establish a secure session.",
    },
    success: {
      icon: CheckCircle2,
      spinning: false,
      title: "Authentication successful",
      subtitle: "Your session is active. Redirecting you to the dashboard.",
    },
    error: {
      icon: AlertCircle,
      spinning: false,
      title: "Authentication failed",
      subtitle: errorMessage,
    },
  };
  const copy = statusCopy[status] || statusCopy.error;

  return (
    <AuthShell
      icon={copy.icon}
      iconTone={status === "error" ? "red" : "primary"}
      iconClassName={copy.spinning ? "animate-spin" : ""}
      title={copy.title}
      subtitle={copy.subtitle}
    >
      {status === "success" && (
        <button
          type="button"
          onClick={() => {
            const returnUrl = getSafeReturnUrl();
            localStorage.removeItem("auth_return_url");
            navigate(returnUrl || "/", { replace: true });
          }}
          className={PRIMARY_LINK}
        >
          <span>
            {getSafeReturnUrl() ? "Continue where you left off" : "Go to dashboard"}
          </span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => (window.location.href = "https://travioghana.com/login")}
            className={PRIMARY_LINK}
          >
            <Shield size={16} aria-hidden="true" />
            <span>Sign in on travioghana.com</span>
          </button>
          <p className="text-center text-xs leading-5 text-slate-400">
            Then return here and apply to become a supplier.
          </p>
        </div>
      )}
    </AuthShell>
  );
}

const PRIMARY_LINK =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50 focus-visible:ring-offset-2";

