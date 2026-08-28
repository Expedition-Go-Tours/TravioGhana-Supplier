import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, Clock, Mail, Shield, Building2, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useTeamRole } from "@/hooks/useTeamRole";
import { toast } from "sonner";
import { fetchInviteDetails, acceptInvite, declineInvite } from "@/features/settings/api";

const STATUS = {
  LOADING: "loading",
  INVALID: "invalid",
  EXPIRED: "expired",
  ACCEPTED_ALREADY: "accepted_already",
  REVOKED: "revoked",
  NOT_AUTHENTICATED: "not_authenticated",
  READY: "ready",
  ACCEPTING: "accepting",
  ERROR: "error",
  SUCCESS: "success",
};

export default function TeamInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { isAuthenticated, user } = useAuthStore();
  const { refetch } = useTeamRole();

  const [status, setStatus] = useState(STATUS.LOADING);
  const [invite, setInvite] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadInvite = useCallback(async () => {
    setStatus(STATUS.LOADING);
    try {
      const data = await fetchInviteDetails(token);
      if (!data) {
        setStatus(STATUS.INVALID);
        setErrorMsg("Invitation not found.");
        return;
      }
      setInvite(data);
      setStatus(STATUS.READY);
    } catch (err) {
      const errData = err?.response?.data;
      const msg = errData?.message || "Could not load invitation.";
      if (err?.response?.status === 410) {
        if (msg.toLowerCase().includes("revoked")) {
          setStatus(STATUS.REVOKED);
        } else {
          setStatus(STATUS.EXPIRED);
        }
        setErrorMsg(msg);
      } else if (err?.response?.status === 409) {
        setStatus(STATUS.ACCEPTED_ALREADY);
        setErrorMsg(msg);
      } else if (err?.response?.status === 404) {
        setStatus(STATUS.INVALID);
        setErrorMsg(msg);
      } else {
        setStatus(STATUS.ERROR);
        setErrorMsg(msg);
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      Promise.resolve().then(() => {
        setStatus(STATUS.INVALID);
        setErrorMsg("No invitation token provided.");
      });
      return;
    }

    if (!isAuthenticated) {
      Promise.resolve().then(() => setStatus(STATUS.NOT_AUTHENTICATED));
      return;
    }

    Promise.resolve().then(() => loadInvite());
  }, [token, isAuthenticated, loadInvite]);

  useEffect(() => {
    if (status === STATUS.READY && invite && isAuthenticated && user) {
      if (user.email?.toLowerCase() === invite.invitedEmail?.toLowerCase()) {
        Promise.resolve().then(async () => {
          setStatus(STATUS.ACCEPTING);
          try {
            await acceptInvite(token);
            await refetch();
            setStatus(STATUS.SUCCESS);
          } catch (err) {
            const msg = err?.response?.data?.message || "Failed to accept invitation.";
            setErrorMsg(msg);
            setStatus(STATUS.ERROR);
          }
        });
      }
    }
  }, [status, invite, isAuthenticated, user, token, refetch]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      setStatus(STATUS.NOT_AUTHENTICATED);
      return;
    }

    if (user?.email?.toLowerCase() !== invite?.invitedEmail?.toLowerCase()) {
      setErrorMsg(`This invitation was sent to ${invite.invitedEmail}. Please sign in with that email address.`);
      setStatus(STATUS.ERROR);
      return;
    }

    setStatus(STATUS.ACCEPTING);
    try {
      await acceptInvite(token);
      await refetch();
      setStatus(STATUS.SUCCESS);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to accept invitation.";
      setErrorMsg(msg);
      setStatus(STATUS.ERROR);
    }
  };

  const handleDecline = async () => {
    try {
      await declineInvite(token);
      navigate("/", { replace: true });
    } catch {
      toast.error("Failed to decline invitation. Please try again.");
    }
  };

  const handleSignIn = () => {
    const redirect = encodeURIComponent(`/team/invite?token=${token}`);
    navigate(`/login?redirect=${redirect}`);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <ErrorCard icon={XCircle} title="Invalid Link" message="No invitation token was provided. Please check the link you received." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {status === STATUS.LOADING && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <Loader2 size={32} className="animate-spin text-[#044b3b] mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-medium">Loading invitation...</p>
          </div>
        )}

        {status === STATUS.NOT_AUTHENTICATED && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
              <Mail size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">You're Invited!</h2>
            <p className="text-sm text-slate-500">Sign in to your account to accept this team invitation.</p>
            <button onClick={handleSignIn}
              className="w-full px-4 py-2.5 bg-[#044b3b] text-white rounded-xl text-sm font-semibold hover:bg-[#033a2e] transition-all shadow-sm">
              Sign In to Accept
            </button>
          </div>
        )}

        {status === STATUS.INVALID && (
          <ErrorCard icon={XCircle} title="Invalid Invitation" message={errorMsg || "This invitation link is not valid."} />
        )}

        {status === STATUS.EXPIRED && (
          <ErrorCard icon={Clock} title="Invitation Expired" message={errorMsg || "This invitation has expired. Please ask the supplier to send a new invitation."} />
        )}

        {status === STATUS.ACCEPTED_ALREADY && (
          <SuccessActionCard
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            title="Already Accepted"
            message={errorMsg || "You're already a team member."}
            buttonText="Go to Dashboard"
            buttonLink="/"
          />
        )}

        {status === STATUS.REVOKED && (
          <ErrorCard icon={AlertTriangle} title="Invitation Revoked" message="This invitation has been revoked by the supplier." />
        )}

        {status === STATUS.READY && invite && (
          <ReadyCard invite={invite} onAccept={handleAccept} onDecline={handleDecline} />
        )}

        {status === STATUS.ACCEPTING && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <Loader2 size={32} className="animate-spin text-[#044b3b] mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-medium">Accepting invitation...</p>
          </div>
        )}

        {status === STATUS.SUCCESS && (
          <SuccessActionCard
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            title="Welcome to the Team!"
            message={invite ? `You've joined ${invite.supplierName} as ${invite.role}.` : "Invitation accepted!"}
            buttonText="Go to Dashboard"
            buttonLink="/"
          />
        )}

        {status === STATUS.ERROR && !invite && (
          <ErrorCard icon={XCircle} title="Something Went Wrong" message={errorMsg || "Could not load invitation details. Please try again."} />
        )}

        {status === STATUS.ERROR && invite && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <XCircle size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Cannot Accept</h2>
            <p className="text-sm text-slate-500">{errorMsg}</p>
            <button onClick={loadInvite}
              className="px-4 py-2 text-sm font-medium text-[#044b3b] hover:bg-slate-100 rounded-xl transition-all">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadyCard({ invite, onAccept, onDecline }) {
  const [declining, setDeclining] = useState(false);

  const handleDecline = async () => {
    setDeclining(true);
    await onDecline();
    setDeclining(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 text-center border-b border-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <Building2 size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Team Invitation</h2>
        <p className="text-sm text-slate-500">You've been invited to join a team</p>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Supplier</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{invite.supplierName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-indigo-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Role</p>
            <p className="text-sm font-semibold text-slate-800 capitalize">{invite.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Mail size={16} className="text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Invited Email</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{invite.invitedEmail}</p>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0 space-y-3">
        <button onClick={onAccept}
          className="w-full px-4 py-2.5 bg-[#044b3b] text-white rounded-xl text-sm font-semibold hover:bg-[#033a2e] transition-all shadow-sm flex items-center justify-center gap-2">
          Accept Invitation <ArrowRight size={16} />
        </button>
        <button onClick={handleDecline} disabled={declining}
          className="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50">
          {declining ? "Declining..." : "Decline"}
        </button>
      </div>
    </div>
  );
}

function ErrorCard({ icon: Icon, title, message }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
        <Icon size={28} className="text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500">{message}</p>
      <Link to="/" className="inline-block mt-2 px-4 py-2 text-sm font-medium text-[#044b3b] hover:bg-slate-100 rounded-xl transition-all">
        Go to Home
      </Link>
    </div>
  );
}

function SuccessActionCard({ icon: Icon, iconBg, iconColor, title, message, buttonText, buttonLink }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
      <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mx-auto`}>
        <Icon size={28} className={iconColor} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">{title}</h2>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
      <Link to={buttonLink}
        className="inline-block w-full px-4 py-2.5 bg-[#044b3b] text-white rounded-xl text-sm font-semibold hover:bg-[#033a2e] transition-all shadow-sm">
        {buttonText}
      </Link>
    </div>
  );
}
