import { z } from 'zod';
import { IdSchema, IsoDateSchema } from './common';

export const ProductCategorySchema = z.enum([
  'service',
  'consumable',
  'membership',
  'aesthetic',
  'dental',
]);
export type ProductCategory = z.infer<typeof ProductCategorySchema>;

/** Single line in a bundle — references another Product + a quantity. */
export const BundleItemSchema = z.object({
  productId: IdSchema,
  quantity: z.number().int().positive().max(50),
});
export type BundleItem = z.infer<typeof BundleItemSchema>;

export const ProductSchema = z.object({
  id: IdSchema,
  tenantId: IdSchema,
  sku: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  category: ProductCategorySchema,
  price: z.number().nonnegative(),
  /**
   * Optional bundled child products. When `bundleItems` has entries the
   * product is a bundle — `price` is the bundle's selling price and
   * implicit savings can be derived against the sum of child prices.
   */
  bundleItems: z.array(BundleItemSchema).default([]),
  /**
   * Optional session quota — when set, buying the product entitles the
   * patient to that many sessions of the service. Drives course
   * creation: the cashier can pick the product, and the resulting
   * Course inherits its name, price, and session count.
   */
  sessionsIncluded: z.number().int().positive().max(100).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().default(true),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductCreateSchema = ProductSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  bundleItems: true,
  active: true,
  description: true,
  sessionsIncluded: true,
});
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

export const ProductUpdateSchema = ProductCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;

export function isBundle(product: Pick<Product, 'bundleItems'>): boolean {
  return product.bundleItems.length > 0;
}

/**
 * A product is a "course package" when it carries a session quota.
 * Buying one drives creation of a Course with the matching session
 * count, name, and price.
 */
export function isCoursePackage(
  product: Pick<Product, 'sessionsIncluded'>,
): boolean {
  return typeof product.sessionsIncluded === 'number' && product.sessionsIncluded > 0;
}
