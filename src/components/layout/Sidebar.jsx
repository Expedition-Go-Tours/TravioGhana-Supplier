import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { loadSupplierProfile } from "@/features/auth/api";
import api from "@/lib/axios";
import { LogOut, ChevronLeft, LayoutDashboard, Package, Ticket, CalendarDays, Users, DollarSign, Star, Bell, BarChart3, BadgeCheck, Settings, CalendarX2, BadgePercent, MapPinned, ShieldCheck, Calendar } from "lucide-react";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { useTeamRole } from "@/hooks/useTeamRole";
import { PAGE_ACCESS } from "@/config/pageAccess";
import { describeRoles } from "@/config/teamRoles";

// `permission` comes from PAGE_ACCESS so the sidebar, the search palette and
// the route guards can never disagree about who sees what.
const allNavItems = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard size={20} />, permission: PAGE_ACCESS["/"] },
  { label: "Products", path: "/products", icon: <Package size={20} />, permission: PAGE_ACCESS["/products"] },
  { label: "Bookings", path: "/bookings", icon: <Ticket size={20} />, permission: PAGE_ACCESS["/bookings"] },
  { label: "Pickup Planner", path: "/pickup-planner", icon: <MapPinned size={20} />, permission: PAGE_ACCESS["/pickup-planner"] },
  { label: "Special Offers", path: "/special-offers", icon: <BadgePercent size={20} />, permission: PAGE_ACCESS["/special-offers"] },
  { label: "Cancellation", path: "/cancellation-rate", icon: <CalendarX2 size={20} />, permission: PAGE_ACCESS["/cancellation-rate"] },
  { label: "Availability", path: "/availability", icon: <CalendarDays size={20} />, permission: PAGE_ACCESS["/availability"] },
  { label: "Customers", path: "/chat", icon: <Users size={20} />, permission: PAGE_ACCESS["/chat"] },
  { label: "Finance", path: "/finance", icon: <DollarSign size={20} />, permission: PAGE_ACCESS["/finance"] },
  { label: "Reviews", path: "/reviews", icon: <Star size={20} />, permission: PAGE_ACCESS["/reviews"] },
  { label: "Notifications", path: "/notifications", icon: <Bell size={20} />, permission: PAGE_ACCESS["/notifications"] },
  { label: "Verification", path: "/verification", icon: <ShieldCheck size={20} />, permission: PAGE_ACCESS["/verification"] },
  { label: "Analytics", path: "/analytics", icon: <BarChart3 size={20} />, permission: PAGE_ACCESS["/analytics"] },
  { label: "Settings", path: "/settings", icon: <Settings size={20} />, permission: PAGE_ACCESS["/settings"] },
];

function extractBusinessName(businessInfo) {
  if (!businessInfo) return null;
  if (typeof businessInfo === "string") {
    try { const p = JSON.parse(businessInfo); return p.businessName || p.legalBusinessName || null; } catch { return null; }
  }
  return businessInfo.businessName || businessInfo.legalBusinessName || null;
}

const SIDEBAR_STATUS_STYLES = {
  PENDING: { dot: "bg-amber-300", text: "text-white/70", label: "Pending" },
  UNDER_REVIEW: { dot: "bg-blue-300", text: "text-white/70", label: "Under Review" },
  APPROVED: { dot: "bg-blue-300", text: "text-white/70", label: "Approved" },
  ACTIVE: { dot: "bg-white", text: "text-white", label: "Verified" },
  SUSPENDED: { dot: "bg-red-300", text: "text-white/70", label: "Suspended" },
  REJECTED: { dot: "bg-red-300", text: "text-white/70", label: "Rejected" },
};

export default function Sidebar() {
  const { isCollapsed, toggle, isMobileOpen, closeMobile } = useSidebarStore();
  const user = useAuthStore((state) => state.user);
  const supplierProfile = useAuthStore((state) => state.supplierProfile);
  const location = useLocation();
  const navigate = useNavigate();
  const logoUrl = user?.logoUrl;
  const [fetchedLogoUrl, setFetchedLogoUrl] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [business, setBusiness] = useState(null);
const [logoutConfirmOpen, setShowLogoutConfirm] = useState(false);
  // Derived state: a collapsed sidebar can never show the confirm dialog.
  // Expressing the reset during render avoids a setState-from-effect cascade.
  const showLogoutConfirm = logoutConfirmOpen && !isCollapsed;
  const { hasPermission, isOwner, teamRoles } = useTeamRole();

  // Who the viewer is acting as. A team member's own account is a plain
  // `customer` account, so testing `user.roles` alone hid the business card
  // from every member: they were all looking at their own name and avatar
  // instead of the business they work for.
  const actsForSupplier =
    Boolean(user?.roles?.includes("supplier")) || Boolean(supplierProfile) || teamRoles.length > 0;

  // A member without business-profile rights still gets their own Security tab,
  // so the card falls back to the settings root instead of a hidden tab.
  const canEditBusiness = hasPermission("settings.business");

  const navItems = allNavItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  // This card is the BUSINESS, so it must show the business whoever is signed
  // in. `/suppliers/application/status` is resolved server-side through the
  // supplier membership, which means a team member receives the owner's name,
  // logo, verification status and join date — their own account is a different
  // person with (usually) no supplier profile at all.
  useEffect(() => {
    if (!actsForSupplier) return;
    let cancelled = false;
    loadSupplierProfile()
      .then((profile) => { if (!cancelled) setBusiness(profile || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [actsForSupplier]);

  // Company logo is fetched directly from the backend on mount so it always
  // reflects the server even after a fresh login/refresh (the auth store is
  // hydrated from localStorage, which may be stale). The fetched value is also
  // persisted so future refreshes keep it without another request each render.
  useEffect(() => {
    if (!user?.roles?.includes("supplier")) return;
    let cancelled = false;
    api
      .get("/users/me", { skipGlobalErrorHandler: true })
      .then((res) => {
        if (cancelled) return;
        const fresh = res.data?.data?.user;
        if (!fresh) return;
        const logo = fresh.logoUrl || null;
        setFetchedLogoUrl(logo);
        setLogoLoaded(true);
        useAuthStore.getState().updateUser({ logoUrl: logo, createdAt: fresh.createdAt });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.roles]);

  // Name, logo, status and join date all describe the business. A member has
  // none of their own, so the fetched account is the first choice, the profile
  // sign-in already resolved through the membership is the second, and the
  // viewer's own name only stands in when there is no business at all.
  const businessName =
    business?.businessName ||
    extractBusinessName(business?.businessInfo) ||
    extractBusinessName(supplierProfile?.businessInfo) ||
    supplierProfile?.businessName ||
    null;

  // The business logo wins over the viewer's own avatar: a team member has
  // never uploaded one, so falling back keeps the owner unchanged.
  const effectiveLogoUrl = business?.logoUrl || (logoLoaded ? fetchedLogoUrl : logoUrl);

  const statusStyle =
    SIDEBAR_STATUS_STYLES[
      business?.status || business?.supplierProfile?.status || supplierProfile?.status
    ] || null;

  // "Member since" is when the business joined Travio, for every viewer.
  const memberSince = business?.supplierSince || supplierProfile?.createdAt || user?.createdAt;

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    navigate("/login", { replace: true });
  };

  function NavItem({ item, isCollapsed, closeMobile }) {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");

    if (item.disabled) {
      return (
        <button
          onClick={() => toast.info("Coming soon")}
          className={`relative flex items-center gap-6 w-full text-left text-white/30 cursor-default select-none ${isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}`}
          title={isCollapsed ? item.label : undefined}
        >
          <span className="shrink-0 opacity-30">{item.icon}</span>
          {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
        </button>
      );
    }

    return (
      <NavLink
        to={item.path}
        onClick={closeMobile}
        className={({ isActive: navActive }) =>
          `relative flex items-center gap-6 w-full rounded-lg text-sm font-medium transition-all duration-200 group ${
            isActive || navActive
              ? "bg-white/15 text-white font-semibold"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          } ${isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}`
        }
        title={isCollapsed ? item.label : undefined}
      >
        {(isActive) && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[5px] h-[34px] bg-white rounded-r-full" />
        )}
        <span className="shrink-0 relative">{item.icon}</span>
        {!isCollapsed && (
          <span className="truncate tracking-normal text-[15px]">{item.label}</span>
        )}
        {isCollapsed && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-white text-[#333] text-xs font-medium rounded-lg shadow-lg border border-[#eaeaea] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[70]">
            {item.label}
          </div>
        )}
      </NavLink>
    );
  }

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen bg-[#065f46] border-r border-white/10 transition-all duration-300 z-50 flex flex-col
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "lg:w-[64px] lg:translate-x-0" : "lg:w-[270px] lg:translate-x-0"}
          w-[260px]`}
      >
        {/* Collapse toggle — separate from profile */}
        <div className={`flex shrink-0 ${isCollapsed ? "justify-center px-2 pt-2 pb-1" : "justify-end px-3 pt-2 pb-1"}`}>
          <button
            onClick={() => isMobileOpen ? closeMobile() : toggle()}
            className="flex items-center gap-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 p-1.5"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={15} className={`transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`} />
            {!isCollapsed && <span className="text-xs whitespace-nowrap">Collapse sidebar</span>}
          </button>
        </div>

        {/* Profile — Glassmorphism card */}
        <div
          onClick={() => navigate(canEditBusiness ? "/settings?tab=profile" : "/settings")}
          className={`shrink-0 cursor-pointer ${
            isCollapsed
              ? "py-3 px-2"
              : "bg-white/[0.06] backdrop-blur-[16px] border border-white/[0.1] rounded-[18px] p-6 mx-3 mb-3"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="relative shrink-0">
              {effectiveLogoUrl ? (
                <div className={`${isCollapsed ? "w-9 h-9" : "w-20 h-20"} rounded-full overflow-hidden ring-[3px] ring-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.2)]`}>
                  <OptimizedImage src={effectiveLogoUrl} width={isCollapsed ? 36 : 80} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`${isCollapsed ? "w-9 h-9" : "w-20 h-20"} rounded-full bg-white/15 flex items-center justify-center ring-[3px] ring-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.2)]`}>
                  <span className={`${isCollapsed ? "text-sm" : "text-2xl"} font-bold text-white`}>
                    {(businessName || user?.name || "S").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-white truncate leading-tight" title={businessName || user?.name}>
                  {businessName || user?.name || "Supplier"}
                </p>
                {statusStyle ? (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {statusStyle.label === "Verified" ? (
                      <BadgeCheck size={13} className="text-blue-400 shrink-0" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    )}
                    <span className={`text-[11px] font-medium ${statusStyle.text}`}>{statusStyle.label}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-white/40 block mt-1">Administrator</span>
                )}
                {/* A member still needs to see what they can do: the badge above
                    describes the business, this line describes the person. The
                    owner keeps the single "Administrator" line. */}
                {!isOwner && (
                  <span className="text-[11px] text-white/40 block mt-1" title="Your team role">
                    {describeRoles(teamRoles) || "Team member"}
                  </span>
                )}
                {memberSince && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs font-normal tracking-tight text-white/50 hover:text-white/65 transition-colors duration-200">
                    <Calendar size={14} className="opacity-60 shrink-0" />
                    <span>Member since {new Date(memberSince).getFullYear()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 min-h-0 scrollbar-none">
          <ul className={`space-y-[2px] ${isCollapsed ? "px-2" : "px-3"}`}>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavItem item={item} isCollapsed={isCollapsed} closeMobile={closeMobile} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className={`border-t border-white/10 shrink-0 relative ${isCollapsed ? "p-2" : "px-3 py-2"}`}>
          <button
            onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
            onBlur={() => setTimeout(() => setShowLogoutConfirm(false), 200)}
            className={`flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-all duration-200 text-white/50 hover:text-red-300 hover:bg-white/5 ${isCollapsed ? "justify-center p-2" : "px-3 py-2.5"}`}
          >
            <LogOut size={17} />
            {!isCollapsed && <span className="text-[15px]">Sign out</span>}
          </button>
          {showLogoutConfirm && (
            <div className={`absolute bottom-full mb-2 bg-white rounded-xl shadow-xl shadow-black/10 p-3 min-w-[200px] z-[70] border border-[#eaeaea] ${isCollapsed ? "left-0" : "left-1/2 -translate-x-1/2"}`}>
              <p className="text-xs font-medium text-[#464255] mb-2.5 text-center whitespace-nowrap">Sign out of dashboard?</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-[#64748b] bg-[#f5f5f5] hover:bg-[#eaeaea] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
