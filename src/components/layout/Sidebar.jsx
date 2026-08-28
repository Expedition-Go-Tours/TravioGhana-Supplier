import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { loadSupplierProfile } from "@/features/auth/api";
import api from "@/lib/axios";
import { LogOut, ChevronLeft, ChevronRight, Menu, LayoutDashboard, Package, Ticket, CalendarDays, Users, DollarSign, Star, Bell, BarChart3, BadgeCheck, Settings, CalendarX2, BadgePercent, MapPinned, ShieldCheck } from "lucide-react";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { useTeamRole } from "@/hooks/useTeamRole";

const allNavItems = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard size={20} />, permission: null },
  { label: "Products", path: "/products", icon: <Package size={20} />, permission: "tours.view" },
  { label: "Bookings", path: "/bookings", icon: <Ticket size={20} />, permission: "bookings.view" },
  { label: "Pickup Planner", path: "/pickup-planner", icon: <MapPinned size={20} />, permission: "bookings.view" },
  { label: "Special Offers", path: "/special-offers", icon: <BadgePercent size={20} />, permission: "tours.manage" },
  { label: "Cancellation", path: "/cancellation-rate", icon: <CalendarX2 size={20} />, permission: null },
  { label: "Availability", path: "/availability", icon: <CalendarDays size={20} />, permission: "tours.view" },
  { label: "Customers", path: "/chat", icon: <Users size={20} />, permission: "chat.view" },
  { label: "Finance", path: "/finance", icon: <DollarSign size={20} />, permission: "earnings.view" },
  { label: "Reviews", path: "/reviews", icon: <Star size={20} />, permission: "reviews.view" },
{ label: "Notifications", path: "/notifications", icon: <Bell size={20} />, permission: null },
{ label: "Verification", path: "/verification", icon: <ShieldCheck size={20} />, permission: null },
{ label: "Analytics", path: "/analytics", icon: <BarChart3 size={20} />, permission: null },
  { label: "Settings", path: "/settings", icon: <Settings size={20} />, permission: null },
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
  const [businessName, setBusinessName] = useState(null);
const [logoutConfirmOpen, setShowLogoutConfirm] = useState(false);
  // Derived state: a collapsed sidebar can never show the confirm dialog.
  // Expressing the reset during render avoids a setState-from-effect cascade.
  const showLogoutConfirm = logoutConfirmOpen && !isCollapsed;
  const [profileHover, setProfileHover] = useState(false);
  const { hasPermission } = useTeamRole();

  const navItems = allNavItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  useEffect(() => {
    if (!user?.roles?.includes("supplier")) return;
    loadSupplierProfile().then((profile) => {
      if (!profile) return;
      const name = extractBusinessName(profile.businessInfo);
      if (name) setBusinessName(name);
    });
  }, [user?.roles]);

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
        useAuthStore.getState().updateUser({ logoUrl: logo });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.roles]);

  const effectiveLogoUrl = logoLoaded ? fetchedLogoUrl : logoUrl;

  const statusStyle = SIDEBAR_STATUS_STYLES[supplierProfile?.status] || null;

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
      <button
        onClick={() => useSidebarStore.getState().toggleMobile()}
        className={`fixed top-3 left-3 z-[60] p-2.5 rounded-xl bg-[#065f46] text-white shadow-lg hover:bg-[#047857] transition-colors ${isMobileOpen ? "hidden" : "lg:hidden"}`}
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      <aside
        className={`fixed left-0 top-0 h-screen bg-[#065f46] border-r border-white/10 transition-all duration-300 z-50 flex flex-col
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "lg:w-[64px] lg:translate-x-0" : "lg:w-[270px] lg:translate-x-0"}
          w-[260px]`}
      >
        {/* Brand + Collapse */}
        <div className={`flex items-center h-[80px] shrink-0 border-b border-white/10 ${isCollapsed ? "justify-center px-2" : "justify-between px-5"}`}>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-2xl font-bold text-white tracking-tight block leading-none">Travio Ghana</span>
              <span className="text-xs font-medium text-white/50 block mt-1">Supplier Dashboard</span>
            </div>
          )}
          <button
            onClick={() => isMobileOpen ? closeMobile() : toggle()}
            className="flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 p-1.5"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={15} />
          </button>
        </div>

        {/* Profile */}
        <button
          onClick={() => navigate("/settings?tab=profile")}
          onMouseEnter={() => setProfileHover(true)}
          onMouseLeave={() => setProfileHover(false)}
          className={`shrink-0 w-full text-center cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 relative ${isCollapsed ? "py-4" : "py-4 px-5"}`}
        >
          <div className={`flex flex-col items-center gap-2 ${isCollapsed ? "" : "relative"}`}>
            <div className="relative shrink-0">
              {effectiveLogoUrl ? (
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20">
                  <OptimizedImage src={effectiveLogoUrl} width={40} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center ring-2 ring-white/20">
                  <span className="text-sm font-bold text-white">
                    {(businessName || user?.name || "S").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight" title={businessName || user?.name}>
                  {businessName || user?.name || "Supplier"}
                </p>
                {statusStyle ? (
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    {statusStyle.label === "Verified" ? (
                      <BadgeCheck size={13} className="text-blue-400 shrink-0" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    )}
                    <span className={`text-[11px] font-medium ${statusStyle.text}`}>{statusStyle.label}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-white/40 block mt-0.5">Administrator</span>
                )}
              </div>
            )}
          </div>
          <AnimatePresence>
            {profileHover && !isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
              >
                <ChevronRight size={16} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

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
