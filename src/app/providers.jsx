import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import PreviewBanner from "@/components/shared/PreviewBanner";



export default function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreviewBanner />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
