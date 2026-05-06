import { useEffect, useMemo } from 'react';
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
          sessionsIncluded: input.sessionsIncluded,
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

const SEED_PRODUCTS: ReadonlyArray<ProductCreateInput> = [
  { sku: 'WHTN-1', name: 'Teeth whitening', category: 'dental', price: 4500 },
  { sku: 'CLN-STD', name: 'Standard cleaning', category: 'dental', price: 1500 },
  { sku: 'BTX-20', name: 'Botox 20U', category: 'aesthetic', price: 8500 },
  { sku: 'FLR-RT', name: 'Filler retreatment', category: 'aesthetic', price: 12500 },
  { sku: 'MEM-VIP', name: 'VIP membership (annual)', category: 'membership', price: 25000 },
  // Course packages — buying these auto-creates a multi-session Course
  // for the patient.
  {
    sku: 'LSR-FAC-6',
    name: 'Laser facial — 6 sessions',
    category: 'aesthetic',
    price: 24000,
    sessionsIncluded: 6,
  },
  {
    sku: 'LSR-HAIR-10',
    name: 'Laser hair removal — 10 sessions',
    category: 'aesthetic',
    price: 35000,
    sessionsIncluded: 10,
  },
  {
    sku: 'CLN-PKG-4',
    name: 'Cleaning package — 4 visits',
    category: 'dental',
    price: 5400,
    sessionsIncluded: 4,
  },
];

/**
 * Hook returning products scoped to the active tenant. Seeds a small
 * demo catalog the first time a tenant is observed so the page is
 * never empty in mocking mode. Seeding is deferred to a useEffect so
 * the hook never mutates state during render.
 */
export function useProducts(): Product[] {
  const tenantId = useDevToolbar((s) => s.tenantId);
  const products = useProductStore((s) => s.products);
  const createProduct = useProductStore((s) => s.create);

  const tenantProducts = useMemo(
    () => products.filter((p) => p.tenantId === tenantId),
    [products, tenantId],
  );

  useEffect(() => {
    if (!tenantId) return;
    if (SEEDED_TENANTS.has(tenantId)) return;
    if (tenantProducts.length > 0) {
      SEEDED_TENANTS.add(tenantId);
      return;
    }
    SEEDED_TENANTS.add(tenantId);
    SEED_PRODUCTS.forEach((seed) => createProduct(seed, tenantId));
  }, [tenantId, tenantProducts.length, createProduct]);

  return tenantProducts;
}
