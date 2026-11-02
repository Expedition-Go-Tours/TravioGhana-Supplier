import { QueryClient } from "@tanstack/react-query";

/**
 * Shared query cache. Kept in its own module so logout can clear it without
 * importing a React component file (which breaks Fast Refresh and creates a
 * provider cycle).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
