import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getUsers } from '@reinly/mock-server';
import type {
  Doctor,
  DoctorCreateInput,
  DoctorUpdateInput,
  Id,
} from '@reinly/domain';
import { DOCTOR_STORE_KEY, DOCTOR_STORE_VERSION } from '@/lib/persist-keys';
import { useDevToolbar } from './dev-toolbar';

interface DoctorState {
  doctors: Doctor[];
  create: (input: DoctorCreateInput, tenantId: Id) => Doctor;
  update: (id: Id, patch: DoctorUpdateInput) => Doctor | null;
  remove: (id: Id) => void;
  toggleActive: (id: Id) => void;
}

const SEEDED_TENANTS = new Set<string>();

export const useDoctorStore = create<DoctorState>()(
  persist(
    (set, get) => ({
      doctors: [],
      create: (input, tenantId) => {
        const now = new Date().toISOString();
        const doctor: Doctor = {
          id: crypto.randomUUID(),
          tenantId,
          name: input.name,
          licenseNumber: input.licenseNumber,
          specialty: input.specialty,
          commissionRate: input.commissionRate,
          phoneDigits: input.phoneDigits,
          email: input.email,
          active: input.active ?? true,
          createdAt: now,
          updatedAt: now,
        };
        set({ doctors: [...get().doctors, doctor] });
        return doctor;
      },
      update: (id, patch) => {
        const now = new Date().toISOString();
        let updated: Doctor | null = null;
        set({
          doctors: get().doctors.map((d) => {
            if (d.id !== id) return d;
            updated = { ...d, ...patch, updatedAt: now };
            return updated;
          }),
        });
        return updated;
      },
      remove: (id) => set({ doctors: get().doctors.filter((d) => d.id !== id) }),
      toggleActive: (id) => {
        const now = new Date().toISOString();
        set({
          doctors: get().doctors.map((d) =>
            d.id === id ? { ...d, active: !d.active, updatedAt: now } : d,
          ),
        });
      },
    }),
    {
      name: DOCTOR_STORE_KEY,
      version: DOCTOR_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Seed a tenant's roster from the mock-server's `getUsers()` doctors so
 * the page is never empty when first opened in mocking mode.
 */
export function useDoctors(): Doctor[] {
  const tenantId = useDevToolbar((s) => s.tenantId);
  const doctors = useDoctorStore((s) => s.doctors);
  const create = useDoctorStore((s) => s.create);

  if (tenantId && !SEEDED_TENANTS.has(tenantId) && doctors.filter((d) => d.tenantId === tenantId).length === 0) {
    SEEDED_TENANTS.add(tenantId);
    const docs = getUsers().filter((u) => u.role === 'doctor' && u.tenantId === tenantId);
    queueMicrotask(() => {
      docs.forEach((u) => {
        create(
          {
            name: u.name,
            commissionRate: 0.1,
            specialty: undefined,
          },
          tenantId,
        );
      });
    });
  }

  return doctors.filter((d) => d.tenantId === tenantId);
}
