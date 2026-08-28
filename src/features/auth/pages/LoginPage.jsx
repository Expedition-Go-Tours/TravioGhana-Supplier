import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Package,
  BarChart3,
  Compass,
} from "lucide-react";
import { useSupplierLogin } from "@/features/auth/hooks/useSupplierLogin";
import { GoogleOAuthProvider, useGoogleOneTapLogin } from "@react-oauth/google";
import { getLoginErrorMessage, loginWithGoogleOneTap } from "@/features/auth/api";
import config from "@/config";
import supplierLoginImage from "@/assets/supplier_login.jpg";

const googleClientId = config.google.clientId;

function OneTapHandler({ onSuccess }) {
  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      const credential = credentialResponse.credential;
      if (!credential) return;
      await onSuccess(credential);
    },
    onError: () => {},
    cancel_on_tap_outside: false,
  });

  return null;
}

const FEATURES = [
  { icon: Package, label: "Create and publish tours" },
  { icon: MapPin, label: "Manage destinations and availability" },
  { icon: BarChart3, label: "Track bookings and performance" },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function LoginPage() {
  const { completeLoginWithEmail, completeLoginFromToken, loading, error, setError } = useSupplierLogin();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    if (redirect) {
      localStorage.setItem("auth_return_url", redirect);
    }
  }, [redirect]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) setGoogleLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      await completeLoginWithEmail(email.trim(), password);
    } catch (err) {
      if (!err.response) {
        setError(getLoginErrorMessage(err));
      }
    }
  };

  const handleGoogleSignIn = () => {
    setError("");
    setGoogleLoading(true);
    try {
      const baseUrl = config.api.baseURL;
      window.location.href = `${baseUrl}/auth/google`;
    } catch {
      setGoogleLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <OneTapHandler onSuccess={handleOneTapSuccess} />
      <div className="min-h-screen flex items-center justify-center bg-slate-50/80 p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex w-full max-w-5xl xl:max-w-6xl min-h-0 sm:min-h-[560px] bg-white sm:rounded-2xl sm:shadow-xl sm:shadow-slate-900/10 overflow-hidden"
      >
        {/* Image panel */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative">
          <img
            src={supplierLoginImage}
            alt="African travel and safari experiences"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-emerald-700/30 via-emerald-800/15 to-emerald-900/5" />

          <div className="relative z-10 flex flex-col p-6 xl:p-8 text-white flex-1">
            <motion.div variants={fadeUp} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
                <Compass size={15} className="text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-0.02em" }}>Travio Ghana</span>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-3">
              <h1 className="text-xl xl:text-2xl font-bold leading-snug mb-2 text-white drop-shadow-sm">
                Supplier Dashboard
              </h1>
              <p className="text-white/70 text-sm leading-relaxed max-w-sm">
                Sign in to create tours, manage bookings, and grow your travel business across Africa.
              </p>
            </motion.div>

            <div className="flex-1" />

            <motion.ul variants={stagger} initial="initial" animate="animate" className="space-y-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <motion.li key={label} variants={fadeUp} className="flex items-center gap-2.5 text-white/80">
                  <span className="w-7 h-7 rounded-md bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/15">
                    <Icon size={13} />
                  </span>
                  <span className="text-xs font-medium">{label}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-[10px] text-white/35 mt-3"
            >
              Access is limited to approved and active suppliers.
            </motion.p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="lg:hidden text-center mb-8"
            >
              <div className="hidden sm:inline-flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-950/20 mb-3">
                <Compass size={20} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Supplier Login</h1>
              <p className="text-sm text-slate-500 mt-1">Approved & active suppliers only</p>
            </motion.div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-bold text-slate-800">Sign in</h2>
              <p className="text-sm text-slate-500 mt-1">
                Use your supplier account to access the dashboard
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-start gap-3 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors disabled:opacity-60 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors disabled:opacity-60 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400">or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full sm:w-1/2 mx-auto flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-slate-900/5"
            >
              {googleLoading ? (
                <Loader2 size={20} className="animate-spin text-emerald-600" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Sign in with Google
            </button>

            <p className="mt-5 text-center text-xs text-slate-500">
              Don't have an account?{" "}
              <a
                href="https://travioghana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
              >
                Create one on Travio Ghana
              </a>
            </p>

            <p className="mt-4 text-center text-[11px] text-slate-400 leading-relaxed">
              Only suppliers with <strong className="text-slate-500 font-medium">Approved</strong> or{" "}
              <strong className="text-slate-500 font-medium">Active</strong> status can access the dashboard.
              <br />
              <a
                href="https://travioghana.com/become-a-supplier"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 mt-1 inline-block font-medium"
              >
                Apply to become a supplier
              </a>
            </p>
          </div>
        </div>
      </motion.div>
      </div>
    </GoogleOAuthProvider>
  );
}
