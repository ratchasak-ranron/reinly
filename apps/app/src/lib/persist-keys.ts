import { z } from 'zod';
import { IdSchema } from '@reinly/domain';

export const DEV_TOOLBAR_KEY = 'reinly:dev-toolbar';
export const DEV_TOOLBAR_VERSION = 2;

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
