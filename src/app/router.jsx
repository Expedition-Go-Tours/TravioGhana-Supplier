import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import RequirePageAccess from "@/components/shared/RequirePageAccess";
import AuthOnlyRoute from "@/components/shared/AuthOnlyRoute";
import GuestRoute from "@/components/shared/GuestRoute";
import RootLayout, { ProductBuilderRedirect } from "./RootLayout";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import BookingsPage from "@/features/bookings/pages/BookingsPage";
import PickupPlannerPage from "@/features/bookings/pages/PickupPlannerPage";
import AvailabilityPage from "@/features/availability/pages/AvailabilityPage";
import ProductsListPage from "@/features/products/pages/ProductsListPage";
import ProductDetailPage from "@/features/products/pages/ProductDetailPage";
import ProductBuilderPage from "@/features/products/pages/ProductBuilderPage";
import ReviewsPage from "@/features/reviews/pages/ReviewsPage";
import FinancePage from "@/features/finance/pages/FinancePage";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import ChatPage from "@/features/chat/pages/ChatPage";
import AnalyticsPage from "@/features/analytics/pages/AnalyticsPage";
import CancellationRatePage from "@/features/cancellation/pages/CancellationRatePage";
import SpecialOffersListPage from "@/features/special-offers/pages/SpecialOffersListPage";
import SpecialOfferBuilderPage from "@/features/special-offers/pages/SpecialOfferBuilderPage";

// Stays workspace (property suppliers) — see config/staysNav.js for the nav.
import StaysDashboardPage from "@/features/stays/pages/StaysDashboardPage";
import PropertiesListPage from "@/features/stays/pages/PropertiesListPage";
import PropertyBuilderPage from "@/features/stays/pages/PropertyBuilderPage";
import StaysBookingsPage from "@/features/stays/pages/StaysBookingsPage";
import StaysAvailabilityPage from "@/features/stays/pages/StaysAvailabilityPage";
import StaysRatesPage from "@/features/stays/pages/StaysRatesPage";
import StaysRoomsPage from "@/features/stays/pages/StaysRoomsPage";
import StaysPoliciesPage from "@/features/stays/pages/StaysPoliciesPage";
import StaysOffersPage from "@/features/stays/pages/StaysOffersPage";
import StaysCancellationPage from "@/features/stays/pages/StaysCancellationPage";
import StaysLandingGate from "@/features/stays/components/StaysLandingGate";

import AuthCallback from "@/features/auth/pages/AuthCallback";
import LoginPage from "@/features/auth/pages/LoginPage";

import SupplierStatusPage from "@/features/supplier/pages/SupplierStatusPage";
import VerificationPage from "@/features/supplier/pages/VerificationPage";

import TeamInvitePage from "@/pages/TeamInvitePage";

import NotFoundPage from "@/pages/errors/NotFoundPage";
import ServerErrorPage from "@/pages/errors/ServerErrorPage";
import ForbiddenPage from "@/pages/errors/ForbiddenPage";
import NetworkErrorPage from "@/pages/errors/NetworkErrorPage";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/auth/callback", element: <AuthCallback /> },
      {
        path: "/login",
        element: <GuestRoute><LoginPage /></GuestRoute>,
      },
      { path: "/supplier/status", element: <SupplierStatusPage /> },
      { path: "/error/404", element: <NotFoundPage /> },
      { path: "/error/500", element: <ServerErrorPage /> },
      { path: "/error/403", element: <ForbiddenPage /> },
      { path: "/error/network", element: <NetworkErrorPage /> },
      {
        element: <AuthOnlyRoute />,
        children: [
          { path: "/team/invite", element: <TeamInvitePage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              // Everything below is filtered by PAGE_ACCESS (config/pageAccess.js):
              // a team member without the page's permission is sent back to the
              // dashboard instead of landing on a page whose requests all fail.
              { element: <RequirePageAccess />, children: [
                { index: true, element: <StaysLandingGate><DashboardPage /></StaysLandingGate> },
                { path: "bookings", element: <BookingsPage /> },
                { path: "pickup-planner", element: <PickupPlannerPage /> },
                { path: "availability", element: <AvailabilityPage /> },
                { path: "products", element: <ProductsListPage /> },
                // `handle.bleed` opts a route out of the shared PageContainer —
                // see components/layout/shell.js. Use it only for routes that
                // own their full-viewport layout (and import SHELL_GUTTER).
                { path: "products/:id", element: <ProductDetailPage />, handle: { bleed: true } },
                { path: "products/build/:id/:step", element: <ProductBuilderRedirect />, handle: { bleed: true } },
                { path: "products/build/:id?", element: <ProductBuilderPage />, handle: { bleed: true } },
                { path: "reviews", element: <ReviewsPage /> },
                { path: "finance", element: <FinancePage /> },
                { path: "notifications", element: <NotificationsPage /> },
                { path: "verification", element: <VerificationPage /> },
                { path: "settings", element: <SettingsPage /> },
                { path: "chat", element: <ChatPage />, handle: { bleed: true } },
                { path: "customers", element: <Navigate to="/chat" replace /> },
                { path: "analytics", element: <AnalyticsPage /> },
                { path: "cancellation-rate", element: <CancellationRatePage /> },
                { path: "special-offers", element: <SpecialOffersListPage /> },
                { path: "special-offers/build/:id?/:step?", element: <SpecialOfferBuilderPage /> },

                // ── Stays workspace (property suppliers) ─────────────────
                // Permissions live in config/pageAccess.js. The builder keeps
                // the shared PageContainer: its chrome is the stays gutter.
                { path: "stays", element: <StaysDashboardPage /> },
                { path: "stays/properties", element: <PropertiesListPage /> },
                { path: "stays/properties/build/:id?", element: <PropertyBuilderPage />, handle: { bleed: true } },
                { path: "stays/bookings", element: <StaysBookingsPage /> },
                { path: "stays/availability", element: <StaysAvailabilityPage /> },
                { path: "stays/rates", element: <StaysRatesPage /> },
                { path: "stays/rooms", element: <StaysRoomsPage /> },
                { path: "stays/policies", element: <StaysPoliciesPage /> },
                { path: "stays/special-offers", element: <StaysOffersPage /> },
                { path: "stays/cancellation", element: <StaysCancellationPage /> },
              ] },
              // The 404 owns its own full-screen centred layout.
              { path: "*", element: <NotFoundPage />, handle: { bleed: true } },
            ],
          },
        ],
      },
    ],
  },
]);
