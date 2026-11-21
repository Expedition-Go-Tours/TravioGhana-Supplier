import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { GoogleOAuthProvider, useGoogleOneTapLogin } from "@react-oauth/google";
import AuthShell from "@/features/auth/AuthShell";
import { useSupplierLogin } from "@/features/auth/hooks/useSupplierLogin";
import {
  getLoginErrorMessage,
  loginWithGoogleOneTap,
} from "@/features/auth/api";
import config from "@/config";

const googleClientId = config.google.clientId;

// Only used to reject an obviously malformed address before the request. The
// backend is the authority on whether an account exists, and it must keep
// answering the same way either way.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function OneTapHandler({ onSuccess }) {
  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      const credential = credentialResponse.credential;
      if (!credential) return;
      await onSuccess(credential);
    },
    onError: () => {},
    // An identity prompt that cannot be dismissed sits on top of the form the
    // user came here to fill in. The admin sign-in already allows dismissal.
    cancel_on_tap_outside: true,
  });

  return null;
}

const CONTROL =
  "h-12 w-full rounded-sm text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60";

const INPUT = `${CONTROL} border bg-white pl-11 pr-3.5 text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50`;

/**
 * The border carries the focus state, not the ring.
 *
 * A 20%-opacity ring on white is about 1.4:1, which is decoration, not an
 * indicator. The border goes to emerald-600 (#059669, 3.8:1 on white) which
 * clears the 3:1 focus-appearance minimum on its own; the ring only widens the
 * target.
 */
function fieldBorder(hasError) {
  return hasError
    ? "border-red-300 focus:border-red-400"
    : "border-slate-200 focus:border-emerald-600";
}

export default function LoginPage() {
  const {
    completeLoginWithEmail,
    completeLoginFromToken,
    loading,
    error,
    setError,
  } = useSupplierLogin();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    document.title = "Sign in | Travio Ghana Supplier";
  }, []);

  useEffect(() => {
    if (redirect) {
      localStorage.setItem("auth_return_url", redirect);
    }
  }, [redirect]);

  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const errorRef = useRef(null);

  // A failed sign-in must reach the person who cannot see the red box.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) setGoogleLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const busy = loading || googleLoading;

  const handleOneTapSuccess = useCallback(
    async (credential) => {
      setGoogleLoading(true);
      setError("");

      try {
        const data = await loginWithGoogleOneTap(credential);
        const { accessToken, refreshToken } = data;

        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }

        await completeLoginFromToken(accessToken, refreshToken);
      } catch (err) {
        setError(getLoginErrorMessage(err));
        setGoogleLoading(false);
      }
    },
    [completeLoginFromToken, setError]
  );

  const handleEmailSignIn = async (event) => {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    const next = {};

    if (!cleanEmail) next.email = "Enter your email address.";
    else if (!EMAIL_RE.test(cleanEmail)) next.email = "Enter a valid email address.";

    if (!password) next.password = "Enter your password.";

    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      (next.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setFieldErrors({});

    try {
      await completeLoginWithEmail(cleanEmail, password);
    } catch {
      // The hook already set the message; see useSupplierLogin.
    }
  };

  const handleGoogleSignIn = () => {
    setError("");
    setGoogleLoading(true);
    try {
      const baseUrl = config.api.baseURL;
      const state = encodeURIComponent(window.location.origin);
      window.location.href = `${baseUrl}/auth/google?state=${state}`;
    } catch {
      setGoogleLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <OneTapHandler onSuccess={handleOneTapSuccess} />

      <AuthShell
        title="Sign in"
        subtitle="Manage your tours, bookings and payouts."
        footer={
          <>
            <p>
              New to Travio Ghana?{" "}
              <a
                href="https://www.travioghana.com/supplier/register"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-800 hover:underline"
              >
                Apply to become a supplier
              </a>
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Approved suppliers only
              <span aria-hidden="true"> · </span>
              <a
                href="https://www.travioghana.com"
                className="underline-offset-2 transition-colors hover:text-slate-700 hover:underline"
              >
                travioghana.com
              </a>
            </p>
          </>
        }
      >
        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mb-5 flex items-start gap-2.5 border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-5 text-red-700 outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailSignIn} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-medium text-slate-700"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={emailRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                spellCheck={false}
                autoCapitalize="none"
                inputMode="email"
                disabled={busy}
                aria-invalid={fieldErrors.email ? "true" : undefined}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={`${INPUT} ${fieldBorder(fieldErrors.email)}`}
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-slate-700"
              >
                Password
              </label>
              <Link
                to={`/forgot-password${
                  email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""
                }`}
                className="text-xs font-medium text-emerald-700 transition-colors hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={busy}
                aria-invalid={fieldErrors.password ? "true" : undefined}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={`${INPUT} pr-12 ${fieldBorder(fieldErrors.password)}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-2 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className={`${CONTROL} mt-1 flex items-center justify-center gap-2 bg-emerald-700 font-semibold text-white hover:bg-emerald-800 focus-visible:ring-emerald-700/40 focus-visible:ring-offset-2`}
          >
            {loading && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
          <span className="text-xs text-slate-500">or</span>
          <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={busy}
          className={`${CONTROL} flex items-center justify-center gap-3 border border-slate-300 bg-white font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2`}
        >
          {googleLoading ? (
            <Loader2 size={18} className="animate-spin text-emerald-700" aria-hidden="true" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {googleLoading ? "Redirecting..." : "Sign in with Google"}
        </button>
      </AuthShell>
    </GoogleOAuthProvider>
  );
}
