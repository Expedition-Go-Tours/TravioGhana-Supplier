import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listProperties, STAYS_KEYS } from "../api";
import { useStaysWorkspaceStore } from "@/stores/staysWorkspaceStore";

/**
 * Which property the property-scoped pages (Availability, Rates, Rooms,
 * Policies) are operating on.
 *
 * The prototype kept this in a hidden global ("active property") with no way
 * to see or change it from most pages — a real audit finding. Here the URL is
 * the source of truth (`?property=<id>`), persisted to the workspace store so
 * navigating between pages keeps the context. When nothing is selected the
 * first property becomes the default without writing to the URL (deep links
 * stay clean); picking one from the switcher writes the param.
 */
export function usePropertyContext() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activePropertyId = useStaysWorkspaceStore((state) => state.activePropertyId);
  const setActivePropertyId = useStaysWorkspaceStore((state) => state.setActivePropertyId);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    staleTime: 30_000,
  });

  const requestedId = searchParams.get("property") || activePropertyId;
  const property = properties.find((p) => p.id === requestedId) || properties[0] || null;

  const selectProperty = useCallback(
    (id) => {
      setActivePropertyId(id);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("property", id);
          return next;
        },
        { replace: true },
      );
    },
    [setActivePropertyId, setSearchParams],
  );

  return { property, properties, isLoading, selectProperty };
}
