import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react';
import type { Doctor, DoctorCreateInput } from '@reinly/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { FormError } from '@/components/ui/form-feedback';
import { Pagination, usePagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/page-header';
import { TenantGate } from '@/components/tenant-gate';
import { displayPhone, formatNumber } from '@/lib/format';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { useDevToolbar } from '@/store/dev-toolbar';
import { useDoctorStore, useDoctors } from '@/store/doctor-store';

export function DoctorsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const doctors = useDoctors();
  const remove = useDoctorStore((s) => s.remove);
  const toggleActive = useDoctorStore((s) => s.toggleActive);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...doctors].sort((a, b) => a.name.localeCompare(b.name)),
    [doctors],
  );
  const pagination = usePagination(sorted, 10);

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.doctors')}
          accent="sky"
          title={t('doctor.title')}
          actions={
            <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t('doctor.newDoctor')}
            </Button>
          }
        />

        {sorted.length === 0 ? (
          <EmptyState icon={Stethoscope} title={t('doctor.empty')} />
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">{t('doctor.col.name')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('doctor.col.specialty')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('doctor.col.license')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('doctor.col.commission')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('doctor.col.contact')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('doctor.col.status')}</th>
                      <th className="px-5 py-2.5 font-medium text-right">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagination.pageItems.map((d) => (
                      <DoctorRow
                        key={d.id}
                        doctor={d}
                        locale={locale}
                        t={t}
                        onEdit={() => setEditing(d)}
                        onDelete={() => setDeletingId(d.id)}
                        onToggle={() => toggleActive(d.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              from={pagination.from}
              to={pagination.to}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('doctor.newDoctor')}</DialogTitle>
              <DialogDescription>{t('doctor.newDoctorDescription')}</DialogDescription>
            </DialogHeader>
            <DoctorForm
              onCancel={() => setCreateOpen(false)}
              onDone={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('doctor.editDoctor')}</DialogTitle>
              <DialogDescription>{editing?.name ?? ''}</DialogDescription>
            </DialogHeader>
            {editing ? (
              <DoctorForm
                initial={editing}
                onCancel={() => setEditing(null)}
                onDone={() => setEditing(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('doctor.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('doctor.deleteDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deletingId) remove(deletingId);
                  setDeletingId(null);
                }}
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TenantGate>
  );
}

/* -------------------------------------------------------------------------- */
/*  Row                                                                       */
/* -------------------------------------------------------------------------- */

function DoctorRow({
  doctor,
  locale,
  t,
  onEdit,
  onDelete,
  onToggle,
}: {
  doctor: Doctor;
  locale: 'en' | 'th';
  t: TFunction;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <tr>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              avatarAccentFor(doctor.id),
            )}
          >
            {initialsOf(doctor.name)}
          </span>
          <span className="text-sm font-medium text-foreground">{doctor.name}</span>
        </div>
      </td>
      <td className="px-5 py-3 text-sm text-muted-foreground">{doctor.specialty ?? '—'}</td>
      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
        {doctor.licenseNumber ?? '—'}
      </td>
      <td className="px-5 py-3 font-mono text-sm tabular-nums">
        {formatNumber(Math.round(doctor.commissionRate * 1000) / 10, locale)}%
      </td>
      <td className="px-5 py-3 text-xs text-muted-foreground">
        <div className="space-y-0.5">
          {doctor.phoneDigits ? (
            <div className="tabular-nums">{displayPhone(doctor.phoneDigits)}</div>
          ) : null}
          {doctor.email ? <div className="truncate">{doctor.email}</div> : null}
          {!doctor.phoneDigits && !doctor.email ? <span>—</span> : null}
        </div>
      </td>
      <td className="px-5 py-3">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
            doctor.active
              ? 'bg-emerald-soft text-emerald-ink hover:bg-emerald-soft/80'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {doctor.active ? t('doctor.statusActive') : t('doctor.statusInactive')}
        </button>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label={t('common.edit')}
            onClick={onEdit}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t('common.delete')}
            onClick={onDelete}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-rose-ink transition-colors hover:bg-rose-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form                                                                      */
/* -------------------------------------------------------------------------- */

interface DoctorFormProps {
  initial?: Doctor;
  onCancel: () => void;
  onDone: () => void;
}

function DoctorForm({ initial, onCancel, onDone }: DoctorFormProps) {
  const { t } = useTranslation();
  const tenantId = useDevToolbar((s) => s.tenantId);
  const create = useDoctorStore((s) => s.create);
  const update = useDoctorStore((s) => s.update);

  const [name, setName] = useState(initial?.name ?? '');
  const [specialty, setSpecialty] = useState(initial?.specialty ?? '');
  const [licenseNumber, setLicenseNumber] = useState(initial?.licenseNumber ?? '');
  const [commissionPercent, setCommissionPercent] = useState<number>(
    initial ? Math.round(initial.commissionRate * 1000) / 10 : 10,
  );
  const [phoneDigits, setPhoneDigits] = useState(initial?.phoneDigits ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!tenantId) {
      setError(t('doctor.errors.tenantRequired'));
      return;
    }
    if (!name.trim()) {
      setError(t('doctor.errors.nameRequired'));
      return;
    }
    if (commissionPercent < 0 || commissionPercent > 100) {
      setError(t('doctor.errors.commissionInvalid'));
      return;
    }
    const trimmedPhone = phoneDigits.replace(/\D/g, '');
    if (trimmedPhone && (trimmedPhone.length < 8 || trimmedPhone.length > 15)) {
      setError(t('doctor.errors.phoneInvalid'));
      return;
    }

    const payload: DoctorCreateInput = {
      name: name.trim(),
      specialty: specialty.trim() || undefined,
      licenseNumber: licenseNumber.trim() || undefined,
      commissionRate: commissionPercent / 100,
      phoneDigits: trimmedPhone || undefined,
      email: email.trim() || undefined,
      active,
    };

    if (initial) update(initial.id, payload);
    else create(payload, tenantId);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="doctor-name">{t('doctor.col.name')}</Label>
        <Input
          id="doctor-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="doctor-specialty">{t('doctor.col.specialty')}</Label>
          <Input
            id="doctor-specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doctor-license">{t('doctor.col.license')}</Label>
          <Input
            id="doctor-license"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="doctor-commission">{t('doctor.commissionLabel')}</Label>
        <Input
          id="doctor-commission"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.1"
          value={commissionPercent}
          onChange={(e) => setCommissionPercent(Number(e.target.value) || 0)}
        />
        <p className="text-xs text-muted-foreground">{t('doctor.commissionHelp')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="doctor-phone">{t('patient.phone')}</Label>
          <Input
            id="doctor-phone"
            type="tel"
            inputMode="tel"
            value={phoneDigits}
            onChange={(e) => setPhoneDigits(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doctor-email">{t('doctor.email')}</Label>
          <Input
            id="doctor-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span>{t('doctor.activeLabel')}</span>
      </label>

      <FormError>{error}</FormError>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  );
}

const AVATAR_ACCENTS = [
  'bg-sky-soft text-sky-ink',
  'bg-indigo-soft text-indigo-ink',
  'bg-emerald-soft text-emerald-ink',
  'bg-violet-soft text-violet-ink',
  'bg-amber-soft text-amber-ink',
  'bg-rose-soft text-rose-ink',
] as const;

function avatarAccentFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_ACCENTS[Math.abs(h) % AVATAR_ACCENTS.length] ?? AVATAR_ACCENTS[0];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}
