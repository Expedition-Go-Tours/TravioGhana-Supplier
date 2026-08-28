import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  User, Bell, CreditCard, Shield, FileText, Users,
  Loader2, Upload, Trash2, X, Plus, Building2,
  Wallet, Globe, MapPin, Clock, Phone, Save, Key, Eye, EyeOff,
  Landmark, Banknote, AlertTriangle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import PhoneInput from "@/components/forms/PhoneInput";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import OptimizedImage from "@/components/shared/OptimizedImage";
import {
  fetchCurrentUser, updateCurrentUser, uploadSupplierLogo,
  fetchBusinessProfile, updateBusinessProfile,
  fetchNotificationPreferences, updateNotificationPreferences,
  fetchTaxInfo, updateTaxInfo,
  fetchPayoutMethods, createPayoutMethod, deletePayoutMethod,
  fetchPayouts,
  fetchTeamMembers, inviteTeamMember, removeTeamMember, updateTeamMemberRole,
  directAddTeamMember, resendInvite
} from "../api";
import { getAuthToken, useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency } from "@/lib/utils";
import { config } from "@/config";
import { useTeamRole } from "@/hooks/useTeamRole";
import { TEAM_ROLE_LABELS, TEAM_ROLE_COLORS } from "@/config/teamRoles";
import SocialMediaManager from "../components/SocialMediaManager";

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "payouts", label: "Payout Settings", icon: Banknote },
  { key: "security", label: "Security", icon: Shield },
  { key: "tax", label: "Tax Information", icon: FileText },
  { key: "team", label: "Team", icon: Users },
];

const METHOD_TYPES = [
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2, desc: "Direct bank deposit" },
  { value: "PAYPAL", label: "PayPal", icon: Wallet, desc: "Online payment platform" },
];

const FADE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
};

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || "profile";
  const { canManageTeam, canManageFinance, isOwner, teamRole } = useTeamRole();

  const filteredTabs = TABS.filter((tab) => {
    if (tab.key === "team") return canManageTeam();
    if (tab.key === "payouts") return canManageFinance() || isOwner;
    if (tab.key === "notifications") return isOwner;
    return true;
  });
  // Guard against a stale/removed tab in the URL (e.g. the removed booking-rules tab).
  const activeTab = filteredTabs.some((t) => t.key === requestedTab) ? requestedTab : "profile";

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-1 h-10 bg-linear-to-b from-emerald-500 to-emerald-300 rounded-full" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your account and business settings</p>
        </div>
        {!isOwner && teamRole && (
          <span className={cn("text-[10px] font-medium px-2 py-1 rounded-full", TEAM_ROLE_COLORS[teamRole])}>
            {TEAM_ROLE_LABELS[teamRole]} Access
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1 mb-6 overflow-x-auto scrollbar-none">
        {filteredTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setSearchParams({ tab: tab.key })}
              className={cn(
                "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                activeTab === tab.key ? "text-white" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {activeTab === tab.key && (
                <motion.span
                  layoutId="settingsTab"
                  className="absolute inset-0 rounded-lg bg-emerald-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={14} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "profile" && <ProfileTab key="profile" />}
        {activeTab === "notifications" && <NotificationsTab key="notifications" />}
        {activeTab === "payouts" && <PayoutsTab key="payouts" />}
        {activeTab === "security" && <SecurityTab key="security" />}
        {activeTab === "tax" && <TaxTab key="tax" />}
        {activeTab === "team" && <TeamTab key="team" />}
      </AnimatePresence>
    </div>
  );
}

function ProfileTab() {
  const authUser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", language: "en", timezone: "UTC", email: "",
    description: "", address: "", city: "", country: "", region: "",
    website: "", operatingHours: "",
    instagram: "", facebook: "", twitter: "",
    tiktok: "", youtube: "", linkedin: "", whatsapp: "", pinterest: "",
  });
  const [initialForm, setInitialForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      if (!getAuthToken()) { setLoading(false); return; }
      try {
        const [user, biz] = await Promise.all([
          fetchCurrentUser(),
          fetchBusinessProfile(),
        ]);
        if (user) {
          const bi = biz?.businessInfo || {};
          const loaded = {
            name: user.name || "", phone: user.phone || "",
            language: user.language || "en", timezone: user.timezone || "UTC",
            email: user.email || "",
            description: bi.description || "", address: bi.address || "",
            city: bi.city || "", country: bi.country || "",
            region: bi.region || "", website: bi.website || "",
            instagram: bi.instagram || "", facebook: bi.facebook || "",
            twitter: bi.twitter || "", operatingHours: bi.operatingHours || "",
            tiktok: bi.tiktok || "", youtube: bi.youtube || "",
            linkedin: bi.linkedin || "", whatsapp: bi.whatsapp || "",
            pinterest: bi.pinterest || "",
          };
          setForm(loaded);
          setInitialForm(loaded);
          setCurrentLogoUrl(user.logoUrl || null);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCurrentUser({ name: form.name, phone: form.phone, language: form.language, timezone: form.timezone });
      const user = await fetchCurrentUser();
      if (user) useAuthStore.getState().updateUser(user);
      toast.success("Personal info updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update personal info");
    } finally { setSaving(false); }
  };

  const handleSaveBusiness = async () => {
    setSaving(true);
    try {
      await updateBusinessProfile({
        businessInfo: {
          description: form.description, address: form.address,
          city: form.city, country: form.country, region: form.region,
          website: form.website, operatingHours: form.operatingHours,
          instagram: form.instagram, facebook: form.facebook, twitter: form.twitter,
          tiktok: form.tiktok, youtube: form.youtube, linkedin: form.linkedin,
          whatsapp: form.whatsapp, pinterest: form.pinterest,
        },
      });
      toast.success("Business profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update business profile");
    } finally { setSaving(false); }
  };

  // Social links persist to the backend immediately on add / edit / remove.
  const handlePersistSocials = async (socials) => {
    await updateBusinessProfile({ businessInfo: socials });
    setInitialForm((prev) => (prev ? { ...prev, ...socials } : prev));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > config.upload.maxFileSize) { toast.error("Logo must be smaller than 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);
      const result = await uploadSupplierLogo(formData);
      if (result?.logoUrl) {
        setCurrentLogoUrl(result.logoUrl);
        useAuthStore.getState().updateUser({ logoUrl: result.logoUrl });
        toast.success("Logo uploaded");
        setLogoFile(null); setLogoPreview(null);
      }
    } catch (err) { toast.error(err.response?.data?.message || "Failed to upload logo"); }
    finally { setUploadingLogo(false); }
  };

  const handleRemoveLogo = async () => {
    try {
      await updateCurrentUser({ logoUrl: null });
      setCurrentLogoUrl(null);
      useAuthStore.getState().updateUser({ logoUrl: null });
      toast.success("Logo removed");
    } catch { toast.error("Failed to remove logo"); }
  };

  const hasPersonalChanges = initialForm && JSON.stringify({
    name: form.name, phone: form.phone, language: form.language, timezone: form.timezone,
    email: form.email,
  }) !== JSON.stringify({
    name: initialForm.name, phone: initialForm.phone,
    language: initialForm.language, timezone: initialForm.timezone,
    email: initialForm.email,
  });

  const hasBusinessChanges = initialForm && JSON.stringify({
    description: form.description, address: form.address, city: form.city,
    country: form.country, region: form.region, website: form.website,
    operatingHours: form.operatingHours,
    instagram: form.instagram, facebook: form.facebook, twitter: form.twitter,
    tiktok: form.tiktok, youtube: form.youtube, linkedin: form.linkedin,
    whatsapp: form.whatsapp, pinterest: form.pinterest,
  }) !== JSON.stringify({
    description: initialForm.description, address: initialForm.address, city: initialForm.city,
    country: initialForm.country, region: initialForm.region, website: initialForm.website,
    operatingHours: initialForm.operatingHours,
    instagram: initialForm.instagram, facebook: initialForm.facebook, twitter: initialForm.twitter,
    tiktok: initialForm.tiktok, youtube: initialForm.youtube, linkedin: initialForm.linkedin,
    whatsapp: initialForm.whatsapp, pinterest: initialForm.pinterest,
  });

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Personal Info */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <User size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Personal Information</h2>
            <p className="text-xs text-slate-500">Update your personal details</p>
          </div>
        </div>
        <form onSubmit={handleSavePersonal} className="px-6 py-5 space-y-5">
          <div className="flex flex-col items-center mb-2">
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg bg-slate-50 ring-2 ring-emerald-100">
              {(authUser?.photoURL || authUser?.avatar) ? (
                <OptimizedImage src={authUser.photoURL || authUser.avatar} width={80} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600">{(authUser?.name || "S").charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">Photo from your Google account</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={form.email || authUser?.email || ""} disabled
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Phone size={13} className="inline mr-1 text-slate-400" />Phone
              </label>
              <PhoneInput
                value={form.phone || ''}
                onChange={(val) => setForm((p) => ({ ...p, phone: val }))}
                defaultCountry="US"
                placeholder="Phone number"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Globe size={13} className="inline mr-1 text-slate-400" />Language
                </label>
                <Select value={form.language} onValueChange={(v) => setForm((p) => ({ ...p, language: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Clock size={13} className="inline mr-1 text-slate-400" />Timezone
                </label>
                <input type="text" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
                  placeholder="e.g. Africa/Accra"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving || !hasPersonalChanges}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Company Logo */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Company Logo</h2>
          <p className="text-xs text-slate-500">Upload your business logo for public display</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start gap-6">
            <div className="shrink-0">
              {logoPreview ? (
                <div className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <img src={logoPreview} alt="Preview" loading="lazy" className="w-full h-full object-cover" />
                </div>
              ) : currentLogoUrl ? (
                <div className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <OptimizedImage src={currentLogoUrl} width={96} className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; }} />
                </div>
              ) : null}
            </div>
            <div className="flex-1 space-y-3">
              {logoPreview ? (
                <div className="flex items-center gap-2">
                  <button onClick={handleUploadLogo} disabled={uploadingLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </button>
                  <button onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all">
                    <X size={16} /> Cancel
                  </button>
                </div>
              ) : currentLogoUrl ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all">
                    <Upload size={13} /> Change Logo
                  </button>
                  <button onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 rounded-xl text-xs font-medium hover:bg-red-50 transition-all">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all">
                  <Upload size={13} /> Select Logo
                </button>
              )}
              <p className="text-xs text-slate-400">Supports JPG, PNG, WebP. Max 5MB. Square images work best.</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
        </div>
      </div>

      {/* Business Profile */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Building2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Business Profile</h2>
            <p className="text-xs text-slate-500">Information displayed to customers on your public profile</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Tell travelers about your business, your story, and what makes your tours special..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <MapPin size={13} className="inline mr-1 text-slate-400" />Address
              </label>
              <input type="text" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street address"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input type="text" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                <input type="text" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Region</label>
                <input type="text" value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Globe size={13} className="inline mr-1 text-slate-400" />Website
              </label>
              <input type="url" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://yourbusiness.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Clock size={13} className="inline mr-1 text-slate-400" />Operating Hours
              </label>
              <input type="text" value={form.operatingHours} onChange={(e) => setForm((p) => ({ ...p, operatingHours: e.target.value }))}
                placeholder="e.g. Mon-Fri 9AM-5PM"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Social Media Links</label>
            <SocialMediaManager
              value={{
                twitter: form.twitter, instagram: form.instagram, facebook: form.facebook,
                tiktok: form.tiktok, youtube: form.youtube, linkedin: form.linkedin,
                whatsapp: form.whatsapp, pinterest: form.pinterest,
              }}
              onChange={(next) => setForm((p) => ({ ...p, ...next }))}
              onPersist={handlePersistSocials}
            />
            <p className="mt-2 text-xs text-slate-400">
              Social links are saved to your public business profile automatically.
            </p>
          </div>

          <div className="pt-2">
            <button onClick={handleSaveBusiness} disabled={saving || !hasBusinessChanges}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Business Profile
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NotificationsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialPrefs, setInitialPrefs] = useState(null);
  const [prefs, setPrefs] = useState({
    emailNotifications: { bookings: true, reviews: true, payments: true, systemAlerts: true },
    pushNotifications: { bookings: true, reviews: true, payments: true, systemAlerts: true },
  });

  useEffect(() => {
    fetchNotificationPreferences()
      .then((data) => {
        if (data) {
          setPrefs(data);
          setInitialPrefs(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (channel, category) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [category]: !prev[channel][category] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateNotificationPreferences({
        emailNotifications: prefs.emailNotifications,
        pushNotifications: prefs.pushNotifications,
      });
      if (data) setPrefs(data);
      toast.success("Notification preferences updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update preferences");
    } finally { setSaving(false); }
  };

  const categories = [
    { key: "bookings", label: "New Bookings", desc: "When a customer makes a booking" },
    { key: "reviews", label: "Reviews & Ratings", desc: "When you receive a new review" },
    { key: "payments", label: "Payments & Payouts", desc: "Payment received, payout approved or released" },
    { key: "systemAlerts", label: "System Alerts", desc: "Important updates and announcements" },
  ];

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Bell size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Notification Preferences</h2>
            <p className="text-xs text-slate-500">Choose which notifications you want to receive and how</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 pr-4 text-xs font-semibold text-slate-500">Notification Type</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">Email</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">Push</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.key} className="border-b border-slate-50 last:border-0">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-medium text-slate-700">{cat.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
                    </td>
                    <td className="text-center px-4">
                      <ToggleSwitch
                        checked={prefs.emailNotifications[cat.key]}
                        onChange={() => toggle("emailNotifications", cat.key)}
                      />
                    </td>
                    <td className="text-center px-4">
                      <ToggleSwitch
                        checked={prefs.pushNotifications[cat.key]}
                        onChange={() => toggle("pushNotifications", cat.key)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">Push notifications are delivered via the mobile app and browser</p>
          <button onClick={handleSave} disabled={saving || (initialPrefs && JSON.stringify(prefs) === JSON.stringify(initialPrefs))}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Preferences
          </button>
        </div>
      </div>

      <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Bell size={16} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Email Notifications</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Review-related emails are sent to your registered email address.
              Payment and booking notifications include important transaction details.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PayoutsTab() {
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutsSummary, setPayoutsSummary] = useState({});
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [methodForm, setMethodForm] = useState({
    type: "BANK_TRANSFER", accountName: "", accountNumber: "", bankName: "",
    bankCountry: "", paypalEmail: "", currency: "USD",
  });
  const [savingMethod, setSavingMethod] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([
        fetchPayoutMethods(),
        fetchPayouts({ limit: 10 }),
      ]);
      setMethods(m);
      setPayouts(p?.payouts || []);
      setPayoutsSummary(p?.summary || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { Promise.resolve().then(() => loadData()); }, []);

  const handleAddMethod = async (e) => {
    e.preventDefault();
    setSavingMethod(true);
    try {
      const payload = { type: methodForm.type, currency: methodForm.currency };
      if (methodForm.type === "BANK_TRANSFER") {
        Object.assign(payload, {
          accountName: methodForm.accountName, accountNumber: methodForm.accountNumber,
          bankName: methodForm.bankName, bankCountry: methodForm.bankCountry,
        });
      } else {
        payload.paypalEmail = methodForm.paypalEmail;
      }
      await createPayoutMethod(payload);
      toast.success("Payout method added");
      setShowMethodForm(false);
      setMethodForm({ type: "BANK_TRANSFER", accountName: "", accountNumber: "", bankName: "", bankCountry: "", paypalEmail: "", currency: "USD" });
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add payout method");
    } finally { setSavingMethod(false); }
  };

  const handleDeleteMethod = async (id) => {
    try {
      await deletePayoutMethod(id);
      toast.success("Payout method removed");
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove payout method");
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-emerald-100/60 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mb-2.5">
            <Banknote size={16} className="text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-800">
            {formatCurrency(Number(payoutsSummary.totalEarned) || 0, payoutsSummary.currency || "USD")}
          </p>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">Total Paid Out</p>
        </div>
        <div className="bg-white border border-emerald-100/60 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mb-2.5">
            <CreditCard size={16} className="text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-800">{methods.length}</p>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">Payout Methods</p>
        </div>
      </div>

      {/* Payout Methods */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CreditCard size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Payout Methods</h2>
              <p className="text-xs text-slate-500">Manage how you receive payments</p>
            </div>
          </div>
          <button onClick={() => setShowMethodForm((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm",
              showMethodForm ? "bg-white text-slate-600 border border-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}>
            {showMethodForm ? <X size={14} /> : <Plus size={14} />}
            {showMethodForm ? "Cancel" : "Add Method"}
          </button>
        </div>

        <div className="px-6 py-4">
          <AnimatePresence>
            {showMethodForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddMethod}
                className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  {METHOD_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button key={t.value} type="button"
                        onClick={() => setMethodForm((p) => ({ ...p, type: t.value }))}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                          methodForm.type === t.value
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}>
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          methodForm.type === t.value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className={cn("text-sm font-semibold", methodForm.type === t.value ? "text-emerald-800" : "text-slate-700")}>{t.label}</p>
                          <p className="text-[11px] text-slate-500">{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {methodForm.type === "BANK_TRANSFER" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name</label>
                      <input value={methodForm.accountName} onChange={(e) => setMethodForm((p) => ({ ...p, accountName: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                      <input value={methodForm.accountNumber} onChange={(e) => setMethodForm((p) => ({ ...p, accountNumber: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                      <input value={methodForm.bankName} onChange={(e) => setMethodForm((p) => ({ ...p, bankName: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Country</label>
                      <input value={methodForm.bankCountry} onChange={(e) => setMethodForm((p) => ({ ...p, bankCountry: e.target.value }))}
                        placeholder="e.g. GH, US, UK"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                      <Select value={methodForm.currency} onValueChange={(v) => setMethodForm((p) => ({ ...p, currency: v }))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="GHS">GHS</SelectItem>
                          <SelectItem value="NGN">NGN</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PayPal Email</label>
                    <input type="email" value={methodForm.paypalEmail} onChange={(e) => setMethodForm((p) => ({ ...p, paypalEmail: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={savingMethod}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {savingMethod ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Add Payout Method
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {methods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <CreditCard size={24} className="text-emerald-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No payout methods</h3>
              <p className="text-xs text-slate-400 max-w-[220px]">Add a bank account or PayPal to receive payouts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      {method.type === "BANK_TRANSFER" ? <Landmark size={18} className="text-slate-600" /> : <Wallet size={18} className="text-slate-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {method.type === "BANK_TRANSFER" ? method.bankName || "Bank Account" : "PayPal"}
                        {method.isDefault && <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-medium">Default</span>}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {method.type === "BANK_TRANSFER"
                          ? `****${method.accountNumber?.slice(-4) || ""}`
                          : method.paypalEmail}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMethod(method.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Banknote size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Recent Payouts</h2>
            <p className="text-xs text-slate-500">Your latest payout transactions</p>
          </div>
        </div>
        <div className="px-6 py-4">
          {payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Banknote size={28} className="text-slate-200 mb-2" />
              <p className="text-sm font-medium text-slate-500">No payouts yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Payouts are processed once bookings are completed.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      p.status === "PAID" && "bg-emerald-100",
                      p.status === "PENDING" && "bg-amber-100",
                      p.status === "APPROVED" && "bg-blue-100",
                      p.status === "FAILED" && "bg-red-100",
                    )}>
                      <Banknote size={16} className={cn(
                        p.status === "PAID" && "text-emerald-600",
                        p.status === "PENDING" && "text-amber-600",
                        p.status === "APPROVED" && "text-blue-600",
                        p.status === "FAILED" && "text-red-600",
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{p.bookingNumber || "Payout"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.tour || ""}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(Number(p.amount) || 0, p.currency || "USD")}
                      </p>
                      {p.date && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      )}
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg min-w-[68px] justify-center",
                      p.status === "PAID" && "bg-emerald-50 text-emerald-700",
                      p.status === "PENDING" && "bg-amber-50 text-amber-700",
                      p.status === "APPROVED" && "bg-blue-50 text-blue-700",
                      p.status === "FAILED" && "bg-red-50 text-red-700",
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        p.status === "PAID" && "bg-emerald-500",
                        p.status === "PENDING" && "bg-amber-500",
                        p.status === "APPROVED" && "bg-blue-500",
                        p.status === "FAILED" && "bg-red-500",
                      )} />
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const api = (await import("@/lib/axios")).default;
      await api.patch("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success("Password updated successfully");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update password";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Key size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Change Password</h2>
            <p className="text-xs text-slate-500">Update your account password</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={form.currentPassword}
                onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
              <button type="button" onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={form.newPassword}
                onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Minimum 8 characters with at least one uppercase, lowercase, and number</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              Update Password
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Danger Zone</h2>
            <p className="text-xs text-slate-500">Irreversible account actions</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-red-800">Delete Account</p>
              <p className="text-xs text-red-600 mt-0.5">Permanently delete your account and all associated data</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-700 transition-all shadow-sm">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TaxTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialForm, setInitialForm] = useState(null);
  const [form, setForm] = useState({
    taxId: "", taxCountry: "", legalBusinessName: "", businessType: "individual",
  });

  useEffect(() => {
    fetchTaxInfo()
      .then((data) => {
        if (data?.taxInfo) {
          const loaded = {
            taxId: data.taxInfo.taxId || "", taxCountry: data.taxInfo.taxCountry || "",
            legalBusinessName: data.taxInfo.legalBusinessName || "",
            businessType: data.taxInfo.businessType || "individual",
          };
          setForm(loaded);
          setInitialForm(loaded);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTaxInfo(form);
      toast.success("Tax information updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update tax info");
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileText size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Tax Information</h2>
            <p className="text-xs text-slate-500">Your tax details for payment processing and reporting</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Legal Business Name</label>
            <input type="text" value={form.legalBusinessName}
              onChange={(e) => setForm((p) => ({ ...p, legalBusinessName: e.target.value }))}
              placeholder="Your registered business name"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Type</label>
            <Select value={form.businessType} onValueChange={(v) => setForm((p) => ({ ...p, businessType: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                <SelectItem value="company">Registered Company</SelectItem>
                <SelectItem value="non_profit">Non-Profit Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax ID / VAT Number</label>
              <input type="text" value={form.taxId}
                onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
                placeholder="e.g. 123-45-6789"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Country</label>
              <input type="text" value={form.taxCountry}
                onChange={(e) => setForm((p) => ({ ...p, taxCountry: e.target.value }))}
                placeholder="e.g. US, GH, UK"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
          </div>
          <div className="pt-2">
            <button onClick={handleSave} disabled={saving || (initialForm && JSON.stringify(form) === JSON.stringify(initialForm))}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Tax Information
            </button>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileText size={16} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Why we need this</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Your tax information is required for payment processing and regulatory compliance.
              This information is kept secure and only shared with our payment partners when necessary.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResendButton({ email }) {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendInvite(email);
      toast.success("Invitation resent to " + email);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend invitation");
    } finally {
      setResending(false);
    }
  };

  return (
    <button onClick={handleResend} disabled={resending}
      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all disabled:opacity-50" title="Resend invitation">
      {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
    </button>
  );
}

function TeamTab() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", role: "editor" });
  const [sending, setSending] = useState(false);
  const [directAdd, setDirectAdd] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);

  useEffect(() => {
    fetchTeamMembers()
      .then(setMembers)
      .catch(() => toast.error("Failed to load team members"))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      if (directAdd) {
        const member = await directAddTeamMember({ email: form.email, role: form.role });
        setMembers((prev) => [...prev, member]);
        toast.success(form.email + " added as a team member");
      } else {
        const member = await inviteTeamMember({ email: form.email, role: form.role });
        setMembers((prev) => [...prev, member]);
        toast.success("Invitation sent to " + form.email);
      }
      setForm({ email: "", role: "editor" });
      setShowInvite(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateTeamMemberRole(memberId, newRole);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
      setEditingRole(null);
      toast.success("Role updated successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update role");
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    try {
      await removeTeamMember(memberToRemove.id);
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      toast.success("Removed " + memberToRemove.email);
      setMemberToRemove(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to remove member");
    }
  };

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Team Members</h2>
              <p className="text-xs text-slate-500">Invite team members to manage your tours</p>
            </div>
          </div>
          <button onClick={() => setShowInvite((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm">
            <Plus size={14} /> Invite Member
          </button>
        </div>

        <div className="px-6 py-4">
          <AnimatePresence>
            {showInvite && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleInvite}
                className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 overflow-hidden"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input type="email" value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="colleague@example.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                      <SelectItem value="editor">Editor - Manage tours and bookings</SelectItem>
                      <SelectItem value="finance">Finance - View earnings and payouts</SelectItem>
                      <SelectItem value="support">Support - Handle chat and reviews</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" checked={directAdd} onChange={(e) => setDirectAdd(e.target.checked)}
                        className="sr-only peer" />
                      <div className="w-8 h-4 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
                    </div>
                    Add directly (no email)
                  </label>
                  <div className="flex-1" />
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="px-3 py-2 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-100 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={sending}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50">
                    {sending ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    {directAdd ? "Add Member" : "Send Invitation"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          ) : members.length === 0 && !showInvite ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <Users size={24} className="text-emerald-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No team members yet</h3>
              <p className="text-xs text-slate-400 max-w-[240px]">Invite colleagues to help manage your tours, bookings, and customer communications.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-3 text-xs font-semibold text-slate-400 border-b border-slate-100">
                <span className="flex-1">Member</span>
                <span className="w-24">Role</span>
                <span className="w-20">Status</span>
                <span className="w-10" />
              </div>
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-700">{m.email.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="flex-1 text-sm text-slate-700">{m.email}</span>
                  <div className="w-24 relative">
                    {editingRole === m.id ? (
                      <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v)} onOpenChange={(open) => !open && setEditingRole(null)}>
                        <SelectTrigger className="h-7 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        onClick={() => setEditingRole(m.id)}
                        className={cn("text-[10px] font-medium px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity", TEAM_ROLE_COLORS[m.role] || "bg-slate-100 text-slate-600")}
                      >
                        {TEAM_ROLE_LABELS[m.role] || m.role}
                      </button>
                    )}
                  </div>
                  <span className="w-20">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", m.status === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                      {m.status === "PENDING" ? "Pending" : "Active"}
                    </span>
                  </span>
                  {m.status === "PENDING" && (
                    <ResendButton email={m.email} />
                  )}
                  <button onClick={() => setMemberToRemove(m)}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {memberToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setMemberToRemove(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Remove Team Member</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to remove <span className="font-medium">{memberToRemove.email}</span> from your team?
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setMemberToRemove(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleRemove}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-emerald-500" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-slate-100 rounded-xl" />
      <div className="h-40 bg-slate-100 rounded-xl" />
    </div>
  );
}
