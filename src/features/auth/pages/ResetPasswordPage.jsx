import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
} from "lucide-react";
import { resetPasswordWithToken } from "@/features/auth/api";
import { PageShell } from "./ForgotPasswordPage";

function byteLength(value) {
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length;
  }
}

/**
 * Choose a new password from the emailed link.
 *
 * The token is read from the query string exactly once. When it is missing or
 * the server rejects it, the page says so plainly instead of showing a form
 * that cannot succeed.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Choose a new password | Travio Ghana";
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (byteLength(form.password) > 72) {
      setError("That password is too long. Use 72 characters or fewer.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await resetPasswordWithToken(token, form.password);
      setDone(true);
    } catch (err) {
      const message = err?.response?.data?.message || "We could not reset the password. Please try again.";
      setError(
        /token/i.test(message)
          ? "This reset link is invalid or has expired. Request a new one from the sign-in page."
          : message
      );
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <PageShell>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <AlertCircle size={26} className="text-amber-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">This link is incomplete</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Open the reset link from your email again, or request a new one.
          </p>
          <Link to="/forgot-password" className={PRIMARY_LINK}>
            Request a new link
          </Link>
        </div>
      </PageShell>
    );
  }

  if (done) {
    return (
      <PageShell>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 size={26} className="text-emerald-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Password updated</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            You can now sign in with your new password.
          </p>
          <Link to="/login" className={PRIMARY_LINK}>
            Go to sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <KeyRound size={26} className="text-emerald-600" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Choose a new password</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Use at least 8 characters. You will sign in with this password from now on.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <PasswordField
          id="reset-password"
          label="New password"
          value={form.password}
          onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          autoComplete="new-password"
          disabled={saving}
        />
        <PasswordField
          id="reset-confirm"
          label="Confirm password"
          value={form.confirm}
          onChange={(value) => setForm((prev) => ({ ...prev, confirm: value }))}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          autoComplete="new-password"
          disabled={saving}
        />

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {saving ? "Saving..." : "Save new password"}
        </button>
      </form>

      <Link to="/login" className={SECONDARY_LINK}>
        Back to sign in
      </Link>
    </PageShell>
  );
}

function PasswordField({ id, label, value, onChange, show, onToggle, autoComplete, disabled }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:text-slate-600"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

const PRIMARY_BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_LINK =
  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700";
const SECONDARY_LINK =
  "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600";
