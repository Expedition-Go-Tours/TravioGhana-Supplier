import { ChevronDown, LogOut, User, Mail, Loader2, Menu } from "lucide-react";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import SearchDropdown from "@/components/layout/SearchDropdown";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import OptimizedImage from "@/components/shared/OptimizedImage";
import logoSrc from "@/assets/TravioGhana_Gold_Logo.svg";

export default function Header() {
  const navigate = useNavigate();
  const { isCollapsed, isMobileOpen, toggleMobile } = useSidebarStore();
  const user = useAuthStore((state) => state.user);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const displayName = user?.name || "Admin User";
  const displayRole = user?.roles?.includes("admin") ? "Administrator" : user?.roles?.[0] || "User";
  const avatarLetter = displayName?.charAt(0)?.toUpperCase() || "A";

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    await useAuthStore.getState().logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-[#eaeaea] flex items-center px-2 sm:px-4 lg:px-6 z-40 transition-all duration-300 ${
        isCollapsed ? "lg:left-[64px]" : "lg:left-[270px]"
      } left-0`}
    >
      {/* Mobile: Menu toggle */}
      {!isMobileOpen && (
        <button
          onClick={toggleMobile}
          className="lg:hidden p-1.5 rounded-lg text-[#065f46] hover:bg-[#065f46]/10 transition-colors mr-1 sm:mr-2 shrink-0"
          aria-label="Toggle menu"
        >
          <Menu size={16} />
        </button>
      )}

      {/* Left: Logo */}
      <div className="flex items-center shrink-0 mr-2 lg:mr-4">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/') }}
          className="flex items-center"
        >
          <img src={logoSrc} alt="Travio Ghana" className="w-[100px] sm:w-[140px] lg:w-[180px] h-auto" />
        </a>
      </div>

      {/* Center: Search — centered with controlled width */}
      <div className="flex-1 flex items-center justify-end sm:justify-center min-w-0 px-2 lg:px-4">
        <div className="w-auto sm:w-full max-w-sm">
          <SearchDropdown />
        </div>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-2 lg:ml-4">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 sm:gap-3 pl-1.5 sm:pl-3 border-l border-[#eaeaea] hover:bg-[#f5f5f5] rounded-lg py-1 pr-1.5 sm:pr-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#065f46]/30">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-700">{displayName}</p>
                <p className="text-[10px] text-slate-400 capitalize">{displayRole}</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-[#044b3b] shrink-0 ring-2 ring-[#044b3b]/10">
                {(user?.avatar || user?.photoURL) ? (
                  <OptimizedImage src={user.avatar || user.photoURL} width={32} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-medium text-[11px]">{avatarLetter}</div>
                )}
              </div>
              <ChevronDown size={11} className="text-slate-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-0 overflow-hidden">
            <div className="h-1.5 bg-[#065f46]" />
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#044b3b] shrink-0 ring-2 ring-[#044b3b]/10">
                {(user?.avatar || user?.photoURL) ? (
                  <OptimizedImage src={user.avatar || user.photoURL} width={40} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold">{avatarLetter}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{displayRole}</p>
              </div>
            </div>
            <div className="p-1.5">
              <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-lg">
                <User size={15} className="text-slate-400" />
                Profile Settings
              </DropdownMenuItem>
              {user?.email && (
                <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 mx-1">
                  <Mail size={15} className="text-slate-300 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="p-1.5">
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={logoutLoading}
                className="rounded-lg text-red-500 focus:text-red-600 focus:bg-red-50"
              >
                {logoutLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <LogOut size={15} />
                )}
                {logoutLoading ? "Please wait..." : "Sign Out"}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
