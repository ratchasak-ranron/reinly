import { z } from 'zod';
import { IdSchema } from '@reinly/domain';

export const DEV_TOOLBAR_KEY = 'reinly:dev-toolbar';
export const DEV_TOOLBAR_VERSION = 2;

export const PRODUCT_STORE_KEY = 'reinly:products';
export const PRODUCT_STORE_VERSION = 1;

export const PROMOTION_STORE_KEY = 'reinly:promotions';
export const PROMOTION_STORE_VERSION = 1;

export const DOCTOR_STORE_KEY = 'reinly:doctors';
export const DOCTOR_STORE_VERSION = 1;

/**
 * Shape persisted by Zustand `persist` middleware for the dev toolbar.
 * Read on the app side AND by the mock-server context reader.
 * Keep these aligned — bump `DEV_TOOLBAR_VERSION` when shape changes.
 */
export const PersistedDevToolbarSchema = z.object({
  state: z.object({
    tenantId: IdSchema.nullable(),
    branchId: IdSchema.nullable(),
    userId: IdSchema.nullable(),
    authedAt: z.string().nullable(),
  }),
  version: z.number(),
});

export type PersistedDevToolbar = z.infer<typeof PersistedDevToolbarSchema>;
