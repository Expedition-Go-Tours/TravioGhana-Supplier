import { useEffect } from "react";
import Providers from "./providers";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { initAuthFromStorage } from "@/stores/authStore";

function App() {
  useTokenRefresh();

  useEffect(() => {
    initAuthFromStorage();
  }, []);

  return (
    <ErrorBoundary>
      <Providers />
    </ErrorBoundary>
  );
}

export default App;
