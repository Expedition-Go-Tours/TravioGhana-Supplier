import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useTeamRole } from "@/hooks/useTeamRole";
import {
  acceptInvite,
  declineInvite,
  fetchInviteDetails,
  registerInvite,
} from "@/features/settings/api";
import { setAccountPassword } from "@/features/auth/api";
import {
  TEAM_ROLE_COLORS,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_SUMMARIES,
  describeRoles,
  sortTeamRoles,
} from "@/config/teamRoles";
import config from "@/config";

/** Roles from the API, tolerating the legacy single-role field. */
function inviteRoles(invite) {
  const roles = sortTeamRoles(invite?.roles);
  return roles.length ? roles : sortTeamRoles(invite?.role);
}

function roleLabel(role) {
  return TEAM_ROLE_LABELS[role] || role;
}

/** "Editor + Finance", including custom role names from the API. */
function roleSummary(invite) {
  if (Array.isArray(invite?.roleNames) && invite.roleNames.length) {
    return invite.roleNames.join(" + ");
  }
  return describeRoles(inviteRoles(invite));
}

function byteLength(value) {
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length;
  }
}

function safeInternalPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

const STATUS = {
  LOADING: "loading",
  READY: "ready",
  SET_PASSWORD: "set_password",
  SUCCESS: "success",
  PROBLEM: "problem",
};

function problemFor(error) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const message = error?.response?.data?.message;

  if (status === 410 && /revoked/i.test(message || "")) {
    return {
      kind: "revoked",
      icon: AlertTriangle,
      title: "Invitation revoked",
      message: "The business owner cancelled this invitation. Ask them to send a new one if you still need access.",
    };
  }
  if (status === 410 && /expired/i.test(message || "")) {
    return {
      kind: "expired",
      icon: Clock,
      title: "Invitation expired",
      message: "This link has expired. Ask the business owner to resend the invitation, then use the new link.",
    };
  }
  if (status === 409 || code === "INVITE_ALREADY_USED") {
    return {
      kind: "used",
      icon: UserCheck,
      title: "Invitation already used",
      message: message || "This invitation has already been accepted. Sign in and open your dashboard.",
    };
  }
  if (status === 404) {
    return {
      kind: "invalid",
      icon: XCircle,
      title: "Invitation not found",
      message: "This link is not valid. Check that you copied the whole link, or ask for a new invitation.",
    };
  }
  return {
    kind: "error",
    icon: AlertTriangle,
    title: "We could not load this invitation",
    message: message || "Something went wrong. Check your connection and try again.",
  };
}

export default function TeamInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { isAuthenticated, user, login, logout, updateUser } = useAuthStore();
  const { refetch } = useTeamRole();

  const [status, setStatus] = useState(STATUS.LOADING);
  const [invite, setInvite] = useState(null);
  const [problem, setProblem] = useState(null);
  const [accepted, setAccepted] = useState(null);
  const [landingPath, setLandingPath] = useState("/");
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const finished = useRef(false);

  const loadInvite = useCallback(async () => {
    if (!token) {
      setProblem({
        kind: "invalid",
        icon: XCircle,
        title: "No invitation token",
        message: "This page needs the link from your invitation email. Open that link again, or ask for a new invitation.",
      });
      setStatus(STATUS.PROBLEM);
      return;
    }

    setStatus(STATUS.LOADING);
    setProblem(null);
    try {
      const data = await fetchInviteDetails(token);
      if (!data) {
        setProblem(problemFor({ response: { status: 404 } }));
        setStatus(STATUS.PROBLEM);
        return;
      }
      setInvite(data);
      setStatus(STATUS.READY);
    } catch (error) {
      setProblem(problemFor(error));
      setStatus(STATUS.PROBLEM);
    }
  }, [token]);

  useEffect(() => {
    if (finished.current) return;
    // Deferred so the effect body never calls setState synchronously.
    Promise.resolve().then(loadInvite);
  }, [loadInvite, reloadKey]);

  const invitedEmail = invite?.invitedEmail?.toLowerCase() || "";
  const signedEmail = user?.email?.toLowerCase() || "";
  const isMatchingAccount = Boolean(isAuthenticated && invitedEmail && signedEmail === invitedEmail);
  const roles = inviteRoles(invite);

  const roleViews = useMemo(() => {
    if (Array.isArray(invite?.roleViews) && invite.roleViews.length) {
      return invite.roleViews.map((role) => ({
        key: role.key || role.slug || role.label,
        label: role.label || role.name || "Custom role",
        summary: role.summary || role.description || "",
        custom: String(role.key || "").startsWith("custom:"),
      }));
    }
    return roles.map((role) => ({
      key: role,
      label: roleLabel(role),
      summary: TEAM_ROLE_SUMMARIES[role] || "",
      custom: false,
    }));
  }, [invite, roles]);

  const goToDashboard = () => navigate(safeInternalPath(landingPath), { replace: true });

  const handleSignIn = () => {
    const redirect = encodeURIComponent(`/team/invite?token=${token}`);
    const email = encodeURIComponent(invite?.invitedEmail || "");
    navigate(`/login?redirect=${redirect}${email ? `&email=${email}` : ""}`);
  };

  const handleForgotPassword = () => {
    const email = encodeURIComponent(invite?.invitedEmail || "");
    navigate(`/forgot-password${email ? `?email=${email}` : ""}`);
  };

  const handleGoogle = () => {
    // AuthCallback already honours this key, so the invite page is where the
    // user lands after Google sends them back.
    localStorage.setItem("auth_return_url", `/team/invite?token=${token}`);
    const state = encodeURIComponent(window.location.origin);
    window.location.href = `${config.api.baseURL}/auth/google?state=${state}`;
  };

  const handleSwitchAccount = async () => {
    await logout();
    // The invitation stays loaded; the page re-renders as the signed-out
    // version of the same invite, ready for the correct account.
    toast.success("Signed out. Use the invited email to continue.");
  };

  const mapAcceptError = (error) => {
    const mapped = problemFor(error);
    if (mapped.kind === "used") {
      // The token was consumed by this very accept (or a double click). Treat
      // it as success when the signed-in email is the invited one.
      setStatus(STATUS.READY);
      toast.success("Invitation already accepted.");
      return;
    }
    setProblem(
      mapped.kind === "error"
        ? { ...mapped, title: "We could not accept the invitation" }
        : mapped
    );
    setStatus(STATUS.PROBLEM);
  };

  const handleAccept = async () => {
    setSubmitting(true);
    setFormError("");
    setBusyLabel(`Joining ${invite?.supplierName || "the team"}...`);
    try {
      const data = await acceptInvite(token);
      setAccepted(data?.member || null);
      setLandingPath(safeInternalPath(data?.landingPath));
      await refetch();
      setStatus(user?.hasPassword === false ? STATUS.SET_PASSWORD : STATUS.SUCCESS);
    } catch (error) {
      mapAcceptError(error);
    } finally {
      setBusyLabel("");
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await declineInvite(token);
      toast.success("Invitation declined.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not decline the invitation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setFormError("");

    if (form.name.trim().length < 2) {
      setFormError("Enter your full name.");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Use at least 8 characters for your password.");
      return;
    }
    if (byteLength(form.password) > 72) {
      setFormError("That password is too long. Use 72 characters or fewer.");
      return;
    }
    if (form.password !== form.confirm) {
      setFormError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    setBusyLabel("Creating your account...");
    try {
      const data = await registerInvite(token, { name: form.name.trim(), password: form.password });
      if (data?.refreshToken) localStorage.setItem("refresh_token", data.refreshToken);
      login(data?.user || null, data?.accessToken, null);
      finished.current = true;
      toast.success(`Welcome to ${invite?.supplierName || "the team"}.`);
      navigate(safeInternalPath(data?.landingPath), { replace: true });
    } catch (error) {
      const code = error?.response?.data?.code;
      if (code === "ACCOUNT_EXISTS") {
        setFormError(error.response.data.message);
        // The account exists, so the right next step is signing in, not
        // retrying the same form.
        setInvite((prev) => (prev ? { ...prev, accountExists: true, accountHasPassword: true } : prev));
      } else {
        setFormError(error?.response?.data?.message || "Could not create your account. Please try again.");
      }
    } finally {
      setBusyLabel("");
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (event) => {
    event.preventDefault();
    setFormError("");

    if (form.password.length < 8) {
      setFormError("Use at least 8 characters for your password.");
      return;
    }
    if (byteLength(form.password) > 72) {
      setFormError("That password is too long. Use 72 characters or fewer.");
      return;
    }
    if (form.password !== form.confirm) {
      setFormError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await setAccountPassword(form.password);
      updateUser({ hasPassword: true });
      toast.success("Password set. You can now sign in with email.");
      setStatus(STATUS.SUCCESS);
    } catch (error) {
      setFormError(error?.response?.data?.message || "Could not set your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const card = (() => {
    if (status === STATUS.LOADING) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-900/5">
          <Loader2 size={30} className="mx-auto animate-spin text-emerald-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">Checking your invitation...</p>
        </div>
      );
    }

    if (status === STATUS.PROBLEM && problem) {
      return (
        <ProblemCard
          problem={problem}
          isAuthenticated={isAuthenticated}
          onRetry={() => setReloadKey((key) => key + 1)}
          onDashboard={() => navigate("/", { replace: true })}
          onSignIn={handleSignIn}
        />
      );
    }

    if (!invite) return null;

    if (busyLabel) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-900/5">
          <Loader2 size={30} className="mx-auto animate-spin text-emerald-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">{busyLabel}</p>
        </div>
      );
    }

    if (status === STATUS.SUCCESS) {
      return (
        <SuccessCard
          supplierName={invite.supplierName}
          roleNames={roleSummary(accepted || invite)}
          onDashboard={goToDashboard}
        />
      );
    }

    if (status === STATUS.SET_PASSWORD) {
      return (
        <Card>
          <InviteHeader invite={invite} roleViews={roleViews} />
          <div className="border-t border-slate-100 px-6 py-6">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-sm font-semibold text-emerald-900">You are on the team</h2>
                <p className="mt-0.5 text-xs leading-5 text-emerald-800">
                  Set a password so you can sign in with email next time. You can also do this later in Settings, under Security.
                </p>
              </div>
            </div>

            <form onSubmit={handleSetPassword} className="mt-5 space-y-4">
              <PasswordField
                id="new-password"
                label="New password"
                value={form.password}
                onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
                hint="At least 8 characters."
              />
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={form.confirm}
                onChange={(value) => setForm((prev) => ({ ...prev, confirm: value }))}
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
              />
              {formError && <FormError message={formError} />}
              <button type="submit" disabled={submitting} className={PRIMARY_BUTTON}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Set password and continue
              </button>
              <button
                type="button"
                onClick={goToDashboard}
                className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                I will set this later
              </button>
            </form>
          </div>
        </Card>
      );
    }

    if (status === STATUS.READY) {
      // Signed in, but as somebody else. Never accept on the wrong identity.
      if (isAuthenticated && !isMatchingAccount) {
        return (
          <Card>
            <InviteHeader invite={invite} roleViews={roleViews} />
            <div className="border-t border-slate-100 px-6 py-6">
              <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">This invite is for a different email</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    You are signed in as <strong>{user?.email}</strong>, but the invitation was sent to{" "}
                    <strong>{invite.invitedEmail}</strong>.
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleSwitchAccount} className={`${PRIMARY_BUTTON} mt-5`}>
                <UserCheck size={16} />
                Sign out and use {invite.invitedEmail}
              </button>
              <button type="button" onClick={goToDashboard} className={SECONDARY_BUTTON}>
                Go to my dashboard
              </button>
            </div>
          </Card>
        );
      }

      if (!isAuthenticated) {
        return (
          <Card>
            <InviteHeader invite={invite} roleViews={roleViews} />
            <div className="border-t border-slate-100 px-6 py-6">
              {invite.accountExists ? (
                invite.accountHasPassword ? (
                  <SignInDoor invite={invite} onSignIn={handleSignIn} onGoogle={handleGoogle} onForgot={handleForgotPassword} formError={formError} />
                ) : (
                  <GoogleDoor invite={invite} onGoogle={handleGoogle} onForgot={handleForgotPassword} />
                )
              ) : (
                <CreateAccountDoor
                  invite={invite}
                  form={form}
                  setForm={setForm}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  formError={formError}
                  submitting={submitting}
                  onSubmit={handleCreateAccount}
                  onSignIn={handleSignIn}
                />
              )}
            </div>
          </Card>
        );
      }

      // Signed in as the invited email: the user reviews and accepts.
      return (
        <Card>
          <InviteHeader invite={invite} roleViews={roleViews} />
          <div className="border-t border-slate-100 px-6 py-6">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              <ShieldCheck size={15} className="shrink-0 text-emerald-600" />
              Signed in as <strong className="truncate">{user?.email}</strong>
            </div>
            {user?.hasPassword === false && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                You will be able to set a password after accepting, so you can sign in with email as well as Google.
              </p>
            )}
            <button type="button" onClick={handleAccept} disabled={submitting} className={`${PRIMARY_BUTTON} mt-4`}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Accept invitation
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={submitting}
              className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </Card>
      );
    }

    return null;
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-emerald-50 to-transparent" />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm shadow-emerald-900/20">
            <Compass size={17} />
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-800">Travio Ghana</span>
        </Link>

        <main className="w-full max-w-md">{card}</main>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <Lock size={11} />
          Personal invitation. Only {invite?.invitedEmail || "the invited email"} can accept it.
        </p>
      </div>
    </div>
  );
}

const CARD = "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5";
const PRIMARY_BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY_BUTTON =
  "mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60";
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:opacity-60";

function Card({ children }) {
  return <div className={CARD}>{children}</div>;
}

function InviteHeader({ invite, roleViews }) {
  return (
    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-white px-6 pb-5 pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <Building2 size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Team invitation</p>
          <h1 className="truncate text-lg font-bold leading-6 text-slate-900">{invite.supplierName}</h1>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
          <Shield size={11} /> Secure
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {invite.invitedByName ? (
          <>
            <strong className="font-semibold text-slate-800">{invite.invitedByName}</strong> invited you to manage{" "}
            {invite.supplierName} on Travio Ghana.
          </>
        ) : (
          <>You have been invited to manage {invite.supplierName} on Travio Ghana.</>
        )}
      </p>

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Your access</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {roleViews.map((role) => (
            <span
              key={role.key}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                role.custom ? "bg-emerald-100 text-emerald-800" : TEAM_ROLE_COLORS[role.key] || "bg-slate-100 text-slate-600"
              }`}
            >
              {role.label}
            </span>
          ))}
        </div>
        {roleViews.some((role) => role.summary) && (
          <ul className="mt-2.5 space-y-1">
            {roleViews.filter((role) => role.summary).map((role) => (
              <li key={`${role.key}-summary`} className="flex gap-1.5 text-xs leading-5 text-slate-500">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>
                  <strong className="font-semibold text-slate-600">{role.label}</strong>
                  {" — "}
                  {role.summary}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
        <Mail size={15} className="shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Invitation for</p>
          <p className="truncate text-sm font-medium text-slate-700">{invite.invitedEmail}</p>
        </div>
      </div>
    </div>
  );
}

function CreateAccountDoor({
  invite,
  form,
  setForm,
  showPassword,
  onTogglePassword,
  formError,
  submitting,
  onSubmit,
  onSignIn,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">Create your account</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Choose a password for {invite.invitedEmail}. You will use it to sign in from now on.
        </p>
      </div>

      <div>
        <label htmlFor="full-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Full name
        </label>
        <input
          id="full-name"
          type="text"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="e.g. Ama Mensah"
          autoComplete="name"
          disabled={submitting}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50"
        />
      </div>

      <PasswordField
        id="create-password"
        label="Password"
        value={form.password}
        onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
        show={showPassword}
        onToggle={onTogglePassword}
        autoComplete="new-password"
        hint="At least 8 characters."
        disabled={submitting}
      />
      <PasswordField
        id="create-confirm"
        label="Confirm password"
        value={form.confirm}
        onChange={(value) => setForm((prev) => ({ ...prev, confirm: value }))}
        show={showPassword}
        onToggle={onTogglePassword}
        autoComplete="new-password"
        disabled={submitting}
      />

      {formError && <FormError message={formError} />}

      <button type="submit" disabled={submitting} className={PRIMARY_BUTTON}>
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        Create account and accept
      </button>

      <p className="text-center text-xs text-slate-400">
        Already have an account?{" "}
        <button type="button" onClick={onSignIn} className="font-semibold text-emerald-700 hover:text-emerald-800">
          Sign in instead
        </button>
      </p>
    </form>
  );
}

function SignInDoor({ invite, onSignIn, onGoogle, onForgot, formError }) {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-900">Sign in to accept</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        An account already exists for {invite.invitedEmail}. Sign in with your usual password. This invitation never changes it.
      </p>
      {formError && <div className="mt-4"><FormError message={formError} /></div>}
      <button type="button" onClick={onSignIn} className={`${PRIMARY_BUTTON} mt-5`}>
        <ArrowRight size={16} /> Continue to sign in
      </button>
      <button type="button" onClick={onGoogle} className={SECONDARY_BUTTON}>
        <GoogleMark /> Continue with Google
      </button>
      <p className="mt-4 text-center text-xs text-slate-400">
        Forgot your password?{" "}
        <button type="button" onClick={onForgot} className="font-semibold text-emerald-700 hover:text-emerald-800">
          Reset it
        </button>
      </p>
    </div>
  );
}

function GoogleDoor({ invite, onGoogle, onForgot }) {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-900">Continue with Google</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {invite.invitedEmail} signs in with Google. Continue with Google to accept, then set a password if you want to use email too.
      </p>
      <button type="button" onClick={onGoogle} className={`${PRIMARY_BUTTON} mt-5`}>
        <GoogleMark /> Continue with Google
      </button>
      <button type="button" onClick={onForgot} className="mt-3 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600">
        Prefer a password? Set one by email
      </button>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, show, onToggle, autoComplete, hint, disabled = false }) {
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
          className={INPUT}
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
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function FormError({ message }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}

function ProblemCard({ problem, isAuthenticated, onRetry, onDashboard, onSignIn }) {
  const Icon = problem.icon || AlertTriangle;
  return (
    <div className={`${CARD} p-8 text-center`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Icon size={26} className="text-slate-500" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{problem.title}</h2>
      <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-slate-500">{problem.message}</p>

      <div className="mt-6 space-y-2">
        {isAuthenticated && (problem.kind === "used" || problem.kind === "error") ? (
          <button type="button" onClick={onDashboard} className={PRIMARY_BUTTON}>
            Open my dashboard
          </button>
        ) : (
          <button type="button" onClick={onSignIn} className={PRIMARY_BUTTON}>
            Sign in
          </button>
        )}
        {problem.kind === "error" && (
          <button type="button" onClick={onRetry} className={SECONDARY_BUTTON}>
            Try again
          </button>
        )}
        <Link
          to="/"
          className="block w-full rounded-xl px-4 py-2.5 text-center text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          Go to Travio Ghana
        </Link>
      </div>
    </div>
  );
}

function SuccessCard({ supplierName, roleNames, onDashboard }) {
  return (
    <div className={`${CARD} p-8 text-center`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
        <CheckCircle2 size={28} className="text-emerald-600" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">You are on the team</h2>
      <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-slate-500">
        You joined <strong className="font-semibold text-slate-700">{supplierName}</strong>
        {roleNames ? (
          <>
            {" "}as <strong className="font-semibold text-slate-700">{roleNames}</strong>
          </>
        ) : null}
        .
      </p>
      <button type="button" onClick={onDashboard} className={`${PRIMARY_BUTTON} mt-6`}>
        Open dashboard <ArrowRight size={16} />
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
