import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";
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

    localStorage.setItem("auth_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }

    fetchCurrentUser(accessToken)
      .then(async (user) => {
        if (!user) {
          throw new Error("Backend did not return user data.");
        }

        const supplierProfile = await loadSupplierProfile(accessToken);
        login(user, accessToken, supplierProfile);

        setStatus("success");

        const returnUrl = getSafeReturnUrl();
        const redirectTo = returnUrl || getPostLoginPath(supplierProfile);

        setTimeout(() => {
          localStorage.removeItem("auth_return_url");
          navigate(redirectTo, { replace: true });
        }, 1500);
      })
      .catch((err) => {
        const message = getLoginErrorMessage(err);

        setStatus("error");
        setErrorMessage(message);
        toast.error(message);
      });
  }, [searchParams, login, navigate, accessToken, refreshToken, hasToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-[#eaeaea] shadow-sm p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#f0fdf4] flex items-center justify-center">
            {status === "checking" || status === "loading" ? (
              <Loader2 size={32} className="text-[#044b3b] animate-spin" />
            ) : status === "success" ? (
              <CheckCircle2 size={32} className="text-[#16a34a]" />
            ) : (
              <AlertCircle size={32} className="text-[#dc2626]" />
            )}
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#1e293b] mb-2">
          {status === "checking" && "Checking authentication\u2026"}
          {status === "loading" && "Verifying your session\u2026"}
          {status === "success" && "Authentication successful!"}
          {status === "error" && "Authentication failed"}
        </h1>

        <p className="text-sm text-[#64748b] mb-6">
          {status === "checking" &&
            "We're reading the token from your main site sign-in."}
          {status === "loading" &&
            "Please wait while we validate your credentials and establish a secure session."}
          {status === "success" &&
            "Your session is active. Redirecting you to the dashboard\u2026"}
          {status === "error" && errorMessage}
        </p>

        {status === "success" && (
          <button
            onClick={() => {
              const returnUrl = getSafeReturnUrl();
              localStorage.removeItem("auth_return_url");
              navigate(returnUrl || "/", { replace: true });
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors"
          >
            <span>{getSafeReturnUrl() ? "Continue Where You Left Off" : "Go to Dashboard"}</span>
            <ArrowRight size={16} />
          </button>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <button
              onClick={() =>
                (window.location.href = "https://travioghana.com/login")
              }
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#044b3b] text-white rounded-lg text-sm font-medium hover:bg-[#033629] transition-colors"
            >
              <Shield size={16} />
              <span>Log in on Main Site</span>
            </button>
            <p className="text-xs text-[#9e9e9e]">
              After logging in, click "Become a supplier" again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
