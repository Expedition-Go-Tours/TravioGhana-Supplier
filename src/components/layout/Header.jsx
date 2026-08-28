import { ChevronDown, LogOut, User, Mail, Loader2 } from "lucide-react";
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

export default function Header() {
  const navigate = useNavigate();
  const { isCollapsed } = useSidebarStore();
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
      className={`fixed top-0 right-0 h-16 bg-white border-b border-[#eaeaea] flex items-center justify-between px-4 lg:px-6 z-40 transition-all duration-300 ${
        isCollapsed ? "lg:left-[64px]" : "lg:left-[270px]"
      } left-0`}
    >
      <div className="flex items-center ml-12 lg:ml-0">
        <SearchDropdown />
      </div>
      <div className="flex-1 min-w-0" />
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-[#eaeaea] hover:bg-[#f5f5f5] rounded-lg py-1 pr-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#065f46]/30">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-700">{displayName}</p>
                <p className="text-[10px] text-slate-400 capitalize">{displayRole}</p>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-[#044b3b] shrink-0 ring-2 ring-[#044b3b]/10">
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
