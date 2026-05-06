import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Id } from '@reinly/domain';
import { DEV_TOOLBAR_KEY, DEV_TOOLBAR_VERSION } from '@/lib/persist-keys';

interface DevToolbarPersistedState {
  tenantId: Id | null;
  branchId: Id | null;
  userId: Id | null;
  /** ISO timestamp of last successful sign-in. `null` = signed out. */
  authedAt: string | null;
}

interface DevToolbarState extends DevToolbarPersistedState {
  setTenant: (id: Id | null) => void;
  setBranch: (id: Id | null) => void;
  setUser: (id: Id | null) => void;
  /** Mark the session authenticated under the supplied scope. */
  signIn: (input: { tenantId: Id; branchId: Id; userId: Id }) => void;
  /** Clear auth flag without wiping the last-used scope (so the login form
   *  can pre-fill the same dropdowns next time). */
  signOut: () => void;
}

export const useDevToolbar = create<DevToolbarState>()(
  persist(
    (set) => ({
      tenantId: null,
      branchId: null,
      userId: null,
      authedAt: null,
      setTenant: (tenantId) => set({ tenantId, branchId: null }),
      setBranch: (branchId) => set({ branchId }),
      setUser: (userId) => set({ userId }),
      signIn: ({ tenantId, branchId, userId }) =>
        set({
          tenantId,
          branchId,
          userId,
          authedAt: new Date().toISOString(),
        }),
      signOut: () => set({ authedAt: null }),
    }),
    {
      name: DEV_TOOLBAR_KEY,
      version: DEV_TOOLBAR_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): DevToolbarPersistedState => ({
        tenantId: state.tenantId,
        branchId: state.branchId,
        userId: state.userId,
        authedAt: state.authedAt,
      }),
    },
  ),
);
