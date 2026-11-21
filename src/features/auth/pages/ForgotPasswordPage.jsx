import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import AuthShell from "@/features/auth/AuthShell";
import { requestPasswordReset } from "@/features/auth/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Request a password reset link.
 *
 * The backend answers the same way whether or not the address exists, so the
 * success screen says "if that email is registered" rather than confirming an
 * account — otherwise this page becomes an account-enumeration oracle.
 */
export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Reset your password | Travio Ghana";
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setError("Enter the email address you use to sign in.");
      return;
    }

    setSending(true);
    try {
      await requestPasswordReset(clean);
      setSent(true);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        setError("Too many requests. Wait a few minutes, then try again.");
      } else {
        setError(
          err?.response?.data?.message ||
            "We could not send the email. Check your connection and try again."
        );
      }
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        icon={Mail}
        title="Check your inbox"
        subtitle={
          <>
            If an account exists for{" "}
            <strong className="font-semibold text-slate-700">
              {email.trim().toLowerCase()}
            </strong>
            , we have sent a link to reset the password. It expires in 15
            minutes.
          </>
        }
      >
        <p className="text-xs leading-5 text-slate-400">
          Nothing arrived? Check the spam folder, then try again in a few
          minutes.
        </p>
        <Link to="/login" className={SECONDARY_LINK}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={ShieldCheck}
      title="Reset your password"
      subtitle="Enter the email address for your account and we will send a link to choose a new password."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="reset-email"
            className="mb-1.5 block text-[13px] font-medium text-slate-700"
          >
            Email address
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              spellCheck={false}
              autoCapitalize="none"
              inputMode="email"
              disabled={sending}
              className={`${INPUT_CLASS} ${
                error
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-emerald-600"
              }`}
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <button type="submit" disabled={sending} className={PRIMARY_BUTTON}>
          {sending ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Mail size={16} aria-hidden="true" />
          )}
          {sending ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <Link to="/login" className={SECONDARY_LINK}>
        <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
      </Link>
    </AuthShell>
  );
}

const INPUT_CLASS =
  "w-full rounded-sm border bg-white py-3 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

const PRIMARY_BUTTON =
  "flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_LINK =
  "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-sm px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40";
