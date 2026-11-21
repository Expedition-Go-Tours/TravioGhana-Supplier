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
import AuthShell from "@/features/auth/AuthShell";
import { resetPasswordWithToken } from "@/features/auth/api";

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
      const message =
        err?.response?.data?.message ||
        "We could not reset the password. Please try again.";
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
      <AuthShell
        icon={AlertCircle}
        iconTone="amber"
        title="This link is incomplete"
        subtitle="Open the reset link from your email again, or request a new one."
      >
        <Link to="/forgot-password" className={PRIMARY_LINK}>
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        icon={CheckCircle2}
        title="Password updated"
        subtitle="You can now sign in with your new password."
      >
        <Link to="/login" className={PRIMARY_LINK}>
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={KeyRound}
      title="Choose a new password"
      subtitle="Use at least 8 characters. You will sign in with this password from now on."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <p
            role="alert"
            className="flex items-start gap-2 border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
          {saving ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound size={16} aria-hidden="true" />
          )}
          {saving ? "Saving..." : "Save new password"}
        </button>
      </form>

      <Link to="/login" className={SECONDARY_LINK}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  disabled,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium text-slate-700"
      >
        {label}
      </label>
      <div className="relative">
        <Lock
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

const PRIMARY_BUTTON =
  "flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

// This one had no focus ring while its sibling button two lines above did.
const PRIMARY_LINK =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50 focus-visible:ring-offset-2";

const SECONDARY_LINK =
  "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-sm px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40";
