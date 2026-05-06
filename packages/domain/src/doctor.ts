import { z } from 'zod';
import { IdSchema, IsoDateSchema } from './common';

/**
 * Doctor profile — extends the base User with clinical attributes the
 * scheduling, commission, and reporting flows care about. Stored in the
 * app-side store for now; will fold into the User schema once the
 * backend is wired.
 */
export const DoctorSchema = z.object({
  id: IdSchema,
  tenantId: IdSchema,
  /** Display name as shown on schedules and receipts. */
  name: z.string().min(1).max(120),
  /** Optional medical-license number. */
  licenseNumber: z.string().max(40).optional(),
  /** Free-form specialty label (e.g. Orthodontics, Dermatology). */
  specialty: z.string().max(120).optional(),
  /** Default commission rate applied when no per-receipt override exists. */
  commissionRate: z.number().min(0).max(1),
  phoneDigits: z.string().regex(/^\d{8,15}$/).optional(),
  email: z.string().email().max(120).optional(),
  active: z.boolean().default(true),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type Doctor = z.infer<typeof DoctorSchema>;

export const DoctorCreateSchema = DoctorSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).partial({ active: true, licenseNumber: true, specialty: true, phoneDigits: true, email: true });
export type DoctorCreateInput = z.infer<typeof DoctorCreateSchema>;

export const DoctorUpdateSchema = DoctorCreateSchema.partial();
export type DoctorUpdateInput = z.infer<typeof DoctorUpdateSchema>;
