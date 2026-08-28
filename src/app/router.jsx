import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
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
              { index: true, element: <DashboardPage /> },
              { path: "bookings", element: <BookingsPage /> },
              { path: "pickup-planner", element: <PickupPlannerPage /> },
              { path: "availability", element: <AvailabilityPage /> },
              { path: "products", element: <ProductsListPage /> },
              { path: "products/:id", element: <ProductDetailPage /> },
              { path: "products/build/:id/:step", element: <ProductBuilderRedirect /> },
              { path: "products/build/:id?", element: <ProductBuilderPage /> },
              { path: "reviews", element: <ReviewsPage /> },
              { path: "finance", element: <FinancePage /> },
              { path: "notifications", element: <NotificationsPage /> },
              { path: "verification", element: <VerificationPage /> },
              { path: "settings", element: <SettingsPage /> },
              { path: "chat", element: <ChatPage /> },
              { path: "customers", element: <Navigate to="/chat" replace /> },
              { path: "analytics", element: <AnalyticsPage /> },
              { path: "cancellation-rate", element: <CancellationRatePage /> },
              { path: "special-offers", element: <SpecialOffersListPage /> },
              { path: "special-offers/build/:id?/:step?", element: <SpecialOfferBuilderPage /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
