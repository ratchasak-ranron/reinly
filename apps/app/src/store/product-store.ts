import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Id,
  Product,
  ProductCreateInput,
  ProductUpdateInput,
} from '@reinly/domain';
import { PRODUCT_STORE_KEY, PRODUCT_STORE_VERSION } from '@/lib/persist-keys';
import { useDevToolbar } from './dev-toolbar';

interface ProductState {
  products: Product[];
  create: (input: ProductCreateInput, tenantId: Id) => Product;
  update: (id: Id, patch: ProductUpdateInput) => Product | null;
  remove: (id: Id) => void;
  toggleActive: (id: Id) => void;
}

const SEEDED_TENANTS = new Set<string>();

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      create: (input, tenantId) => {
        const now = new Date().toISOString();
        const product: Product = {
          id: crypto.randomUUID(),
          tenantId,
          sku: input.sku,
          name: input.name,
          category: input.category,
          price: input.price,
          bundleItems: input.bundleItems ?? [],
          description: input.description,
          active: input.active ?? true,
          createdAt: now,
          updatedAt: now,
        };
        set({ products: [...get().products, product] });
        return product;
      },
      update: (id, patch) => {
        const now = new Date().toISOString();
        let updated: Product | null = null;
        set({
          products: get().products.map((p) => {
            if (p.id !== id) return p;
            updated = { ...p, ...patch, updatedAt: now };
            return updated;
          }),
        });
        return updated;
      },
      remove: (id) => set({ products: get().products.filter((p) => p.id !== id) }),
      toggleActive: (id) => {
        const now = new Date().toISOString();
        set({
          products: get().products.map((p) =>
            p.id === id ? { ...p, active: !p.active, updatedAt: now } : p,
          ),
        });
      },
    }),
    {
      name: PRODUCT_STORE_KEY,
      version: PRODUCT_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Hook returning products scoped to the active tenant. Seeds a small
 * demo catalog the first time a tenant is observed so the page is
 * never empty in mocking mode.
 */
export function useProducts(): Product[] {
  const tenantId = useDevToolbar((s) => s.tenantId);
  const products = useProductStore((s) => s.products);
  const create = useProductStore((s) => s.create);

  if (tenantId && !SEEDED_TENANTS.has(tenantId) && products.filter((p) => p.tenantId === tenantId).length === 0) {
    SEEDED_TENANTS.add(tenantId);
    const seeds: ProductCreateInput[] = [
      { sku: 'WHTN-1', name: 'Teeth whitening', category: 'dental', price: 4500 },
      { sku: 'CLN-STD', name: 'Standard cleaning', category: 'dental', price: 1500 },
      { sku: 'BTX-20', name: 'Botox 20U', category: 'aesthetic', price: 8500 },
      { sku: 'FLR-RT', name: 'Filler retreatment', category: 'aesthetic', price: 12500 },
      { sku: 'MEM-VIP', name: 'VIP membership (annual)', category: 'membership', price: 25000 },
    ];
    queueMicrotask(() => seeds.forEach((s) => create(s, tenantId)));
  }

  return products.filter((p) => p.tenantId === tenantId);
}
