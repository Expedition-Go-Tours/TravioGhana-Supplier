import { Navigate, Outlet, useParams } from "react-router-dom";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { TeamRoleProvider } from "@/contexts/TeamRoleProvider";
import { Toaster } from "sonner";

const LEGACY_STEP_MAP = {
  type: { section: "basics", step: "categorization" },
  basics: { section: "basics", step: "language-and-title" },
  content: { section: "product-content", step: "meeting-and-pickup" },
  photos: { section: "basics", step: "photos" },
  pricing: { section: "schedules-and-pricing", step: "pricing-schedules" },
  schedule: { section: "schedules-and-pricing", step: "pricing-schedules" },
  booking: { section: "booking-and-tickets", step: "booking-process" },
  review: { section: "finish", step: "submit-for-review" },
};

export function ProductBuilderRedirect() {
  const { id, step } = useParams();
  const mapping = LEGACY_STEP_MAP[step];
  const params = new URLSearchParams();
  if (mapping) {
    params.set("section", mapping.section);
    params.set("step", mapping.step);
  } else {
    params.set("section", "basics");
    params.set("step", "language-and-title");
  }
  const target = `/products/build/${id || "new"}?${params.toString()}`;
  return <Navigate to={target} replace />;
}

export default function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <TeamRoleProvider>
        <Outlet />
      </TeamRoleProvider>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "'DM Sans', system-ui, sans-serif",
          },
        }}
      />
    </>
  );
}
