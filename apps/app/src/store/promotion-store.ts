import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Id,
  Promotion,
  PromotionCreateInput,
  PromotionUpdateInput,
} from '@reinly/domain';
import { PROMOTION_STORE_KEY, PROMOTION_STORE_VERSION } from '@/lib/persist-keys';
import { useDevToolbar } from './dev-toolbar';

interface PromotionState {
  promotions: Promotion[];
  create: (input: PromotionCreateInput, tenantId: Id) => Promotion;
  update: (id: Id, patch: PromotionUpdateInput) => Promotion | null;
  remove: (id: Id) => void;
  toggleActive: (id: Id) => void;
}

export const usePromotionStore = create<PromotionState>()(
  persist(
    (set, get) => ({
      promotions: [],
      create: (input, tenantId) => {
        const now = new Date().toISOString();
        const promo: Promotion = {
          id: crypto.randomUUID(),
          tenantId,
          code: input.code.toUpperCase(),
          name: input.name,
          type: input.type,
          value: input.value,
          scope: input.scope,
          productIds: input.productIds ?? [],
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          active: input.active ?? true,
          createdAt: now,
          updatedAt: now,
        };
        set({ promotions: [...get().promotions, promo] });
        return promo;
      },
      update: (id, patch) => {
        const now = new Date().toISOString();
        let updated: Promotion | null = null;
        set({
          promotions: get().promotions.map((p) => {
            if (p.id !== id) return p;
            const next: Promotion = {
              ...p,
              ...patch,
              code: patch.code ? patch.code.toUpperCase() : p.code,
              updatedAt: now,
            };
            updated = next;
            return next;
          }),
        });
        return updated;
      },
      remove: (id) => set({ promotions: get().promotions.filter((p) => p.id !== id) }),
      toggleActive: (id) => {
        const now = new Date().toISOString();
        set({
          promotions: get().promotions.map((p) =>
            p.id === id ? { ...p, active: !p.active, updatedAt: now } : p,
          ),
        });
      },
    }),
    {
      name: PROMOTION_STORE_KEY,
      version: PROMOTION_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function usePromotions(): Promotion[] {
  const tenantId = useDevToolbar((s) => s.tenantId);
  const promotions = usePromotionStore((s) => s.promotions);
  return promotions.filter((p) => p.tenantId === tenantId);
}
