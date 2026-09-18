import { Navigate, Outlet, useParams } from "react-router-dom";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { TeamRoleProvider } from "@/contexts/TeamRoleProvider";
import { Toaster } from "sonner";

const LEGACY_STEP_MAP = {
  type: { section: "getting-started", step: "category" },
  basics: { section: "getting-started", step: "language" },
  content: { section: "product-content", step: "descriptions" },
  photos: { section: "media", step: "photos" },
  pricing: { section: "option-setup", step: "pricing" },
  schedule: { section: "option-setup", step: "pricing" },
  booking: { section: "option-setup", step: "options" },
  review: { section: "option-setup", step: "cutoff" },
};

export function ProductBuilderRedirect() {
  const { id, step } = useParams();
  const mapping = LEGACY_STEP_MAP[step];
  const params = new URLSearchParams();
  if (mapping) {
    params.set("section", mapping.section);
    params.set("step", mapping.step);
  } else {
    params.set("section", "getting-started");
    params.set("step", "language");
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
