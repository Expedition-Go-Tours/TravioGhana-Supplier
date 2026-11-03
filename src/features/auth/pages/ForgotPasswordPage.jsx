import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Compass, Loader2, Mail, ShieldCheck } from "lucide-react";
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
        setError(err?.response?.data?.message || "We could not send the email. Check your connection and try again.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell>
      {sent ? (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <Mail size={26} className="text-emerald-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Check your inbox</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            If an account exists for <strong className="font-semibold text-slate-700">{email.trim().toLowerCase()}</strong>,
            we have sent a link to reset the password. The link expires in 15 minutes.
          </p>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-slate-400">
            Nothing arrived? Check the spam folder, then try again in a few minutes.
          </p>
          <Link to="/login" className={PRIMARY_LINK}>
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <ShieldCheck size={26} className="text-emerald-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">Reset your password</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Enter the email address for your account and we will send a link to choose a new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={sending}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:opacity-60"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <button type="submit" disabled={sending} className={PRIMARY_BUTTON}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {sending ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <Link to="/login" className={SECONDARY_LINK}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </>
      )}
    </PageShell>
  );
}

const PRIMARY_BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_LINK =
  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700";
const SECONDARY_LINK =
  "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600";

export function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-emerald-50 to-transparent" />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm shadow-emerald-900/20">
            <Compass size={17} />
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-800">Travio Ghana</span>
        </Link>
        <main className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
