import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WORKSPACES } from "@/config/staysWorkspace";

/**
 * Which workspace the shell is currently rendering, and the property the
 * Stays pages are scoped to.
 *
 * `workspace` drives the sidebar grouping and the visual language; the URL
 * stays the source of truth for what content renders:
 *
 *   - visiting `/stays/**`      → `syncWorkspace(stays)`
 *   - visiting an Experiences page → `syncWorkspace(experiences)`
 *
 * The account pages exist in both workspaces (`/stays/settings` vs
 * `/settings`), so the URL alone decides — nothing is shared.
 *
 * `userOverride` records an explicit switch through the workspace card; the
 * landing gate on `/` reads it so an accommodation supplier who deliberately
 * chose Experiences is not bounced back to `/stays` on every visit.
 */
export const useStaysWorkspaceStore = create(
  persist(
    (set) => ({
      workspace: WORKSPACES.EXPERIENCES,
      userOverride: false,
      activePropertyId: null,

      /** Explicit switch from the workspace card — remembered. */
      switchWorkspace: (workspace) =>
        set({ workspace, userOverride: true }),

      /** Route-driven sync — does not mark a user preference. */
      syncWorkspace: (workspace) =>
        set((state) => (state.workspace === workspace ? state : { workspace })),

      setActivePropertyId: (activePropertyId) => set({ activePropertyId }),

      /** Test/debug helper: forget the preference. */
      resetWorkspacePreference: () =>
        set({ workspace: WORKSPACES.EXPERIENCES, userOverride: false }),
    }),
    {
      name: "stays-workspace",
      partialize: (state) => ({
        workspace: state.workspace,
        userOverride: state.userOverride,
        activePropertyId: state.activePropertyId,
      }),
    }
  )
);

/** Non-reactive read, for helpers that run outside React. */
export function getWorkspace() {
  return useStaysWorkspaceStore.getState().workspace;
}

export function isStaysWorkspace() {
  return getWorkspace() === WORKSPACES.STAYS;
}
