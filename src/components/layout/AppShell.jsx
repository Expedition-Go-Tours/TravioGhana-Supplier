import { Outlet, useLocation, useMatches } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageContainer from "./PageContainer";
import { useSidebarStore } from "@/stores/sidebarStore";
import SupportFloating from "@/features/chat/components/SupportFloating";
import { useTeamRole } from "@/hooks/useTeamRole";
import { PAGE_ACCESS } from "@/config/pageAccess";
import { useRealtimeNotifications } from "@/features/notifications/hooks/useRealtimeNotifications";

export default function AppShell() {
  const { isCollapsed, isMobileOpen } = useSidebarStore();
  const location = useLocation();
  const matches = useMatches();
  const isProductBuilder = location.pathname.includes('/products/build');
  const isChatPage = location.pathname.startsWith('/chat');
  // Routes that own their full-viewport layout opt out of the shared container
  // with `handle.bleed` in router.jsx (they import SHELL_GUTTER themselves).
  const isBleed = matches.some((match) => match.handle?.bleed);
  useRealtimeNotifications();
  // The floating support bubble is chat, and it polls the unread count on every
  // page. Without this it asked for a thread the role may not read, and the API
  // answered a visible "You do not have permission" toast on every page load.
  const canChat = useTeamRole().hasPermission(PAGE_ACCESS["/chat"]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Header />
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => useSidebarStore.getState().closeMobile()}
        />
      )}
      <main
        className={`pt-14 min-h-screen transition-all duration-300 ${
          isCollapsed ? "lg:ml-[64px]" : "lg:ml-[270px]"
        }`}
      >
        <PageContainer bleed={isBleed}>
          <Outlet />
        </PageContainer>
      </main>
      {!isProductBuilder && !isChatPage && canChat && <SupportFloating />}
    </div>
  );
}
