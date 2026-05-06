import { z } from 'zod';
import { IdSchema, IsoDateSchema } from './common';

export const PromotionTypeSchema = z.enum(['percent', 'amount']);
export type PromotionType = z.infer<typeof PromotionTypeSchema>;

export const PromotionScopeSchema = z.enum(['all_products', 'specific']);
export type PromotionScope = z.infer<typeof PromotionScopeSchema>;

export const PromotionSchema = z
  .object({
    id: IdSchema,
    tenantId: IdSchema,
    code: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, digits, _ or -'),
    name: z.string().min(1).max(120),
    type: PromotionTypeSchema,
    /** Percent: 0-100 (e.g. 15 = 15% off). Amount: THB off. */
    value: z.number().nonnegative(),
    scope: PromotionScopeSchema,
    /** When scope = 'specific', the product ids the promo applies to. */
    productIds: z.array(IdSchema).default([]),
    startsAt: IsoDateSchema.optional(),
    endsAt: IsoDateSchema.optional(),
    active: z.boolean().default(true),
    createdAt: IsoDateSchema,
    updatedAt: IsoDateSchema,
  })
  .refine(
    (p) =>
      p.type === 'amount' || p.value <= 100,
    { message: 'Percent value cannot exceed 100', path: ['value'] },
  )
  .refine(
    (p) =>
      !p.startsAt || !p.endsAt || new Date(p.endsAt).getTime() >= new Date(p.startsAt).getTime(),
    { message: 'endsAt must be after startsAt', path: ['endsAt'] },
  );
export type Promotion = z.infer<typeof PromotionSchema>;

export const PromotionCreateSchema = z
  .object({
    code: z.string().min(2).max(40),
    name: z.string().min(1).max(120),
    type: PromotionTypeSchema,
    value: z.number().nonnegative(),
    scope: PromotionScopeSchema,
    productIds: z.array(IdSchema).default([]),
    startsAt: IsoDateSchema.optional(),
    endsAt: IsoDateSchema.optional(),
    active: z.boolean().default(true),
  })
  .refine((p) => p.type === 'amount' || p.value <= 100, {
    message: 'Percent value cannot exceed 100',
    path: ['value'],
  });
export type PromotionCreateInput = z.infer<typeof PromotionCreateSchema>;

export const PromotionUpdateSchema = PromotionCreateSchema.innerType().partial();
export type PromotionUpdateInput = z.infer<typeof PromotionUpdateSchema>;

/** Compute the discount applied by a promo to a given price. */
export function applyPromotion(price: number, promo: Pick<Promotion, 'type' | 'value'>): number {
  if (promo.type === 'percent') {
    const discount = (price * Math.min(100, Math.max(0, promo.value))) / 100;
    return Math.max(0, Math.round(discount * 100) / 100);
  }
  return Math.max(0, Math.min(price, promo.value));
}

export function isPromotionActive(
  promo: Pick<Promotion, 'active' | 'startsAt' | 'endsAt'>,
  at: Date = new Date(),
): boolean {
  if (!promo.active) return false;
  const ts = at.getTime();
  if (promo.startsAt && new Date(promo.startsAt).getTime() > ts) return false;
  if (promo.endsAt && new Date(promo.endsAt).getTime() < ts) return false;
  return true;
}
