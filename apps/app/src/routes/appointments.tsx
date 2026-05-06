/* eslint-disable security/detect-object-injection -- map keys are constant union literals (Appointment status / accent enum) */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from '@tanstack/react-router';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  CircleSlash,
  Clock,
  Plus,
} from 'lucide-react';
import type { Appointment, Patient } from '@reinly/domain';
import { useDevToolbar } from '@/store/dev-toolbar';
import { useAppointments } from '@/features/appointment';
import { usePatients } from '@/features/patient';
import { PageHeader } from '@/components/page-header';
import { TenantGate } from '@/components/tenant-gate';
import { DateNav } from '@/components/date-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { dayjs } from '@/lib/dates';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';

type StatusFilter = Appointment['status'] | 'all';

export function AppointmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = useLocale();
  const branchId = useDevToolbar((s) => s.branchId);
  const [date, setDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [filter, setFilter] = useState<StatusFilter>('all');

  const { data, isLoading } = useAppointments({
    branchId: branchId ?? undefined,
    date,
  });
  const patients = usePatients('');
  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    (patients.data ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [patients.data]);

  const appts = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    return {
      booked: appts.length,
      confirmed: appts.filter((a) => a.status === 'confirmed').length,
      completed: appts.filter((a) => a.status === 'completed').length,
      noShow: appts.filter((a) => a.status === 'no_show' || a.status === 'cancelled').length,
    };
  }, [appts]);

  const filtered = useMemo(() => {
    if (filter === 'all') return appts;
    if (filter === 'no_show')
      return appts.filter((a) => a.status === 'no_show' || a.status === 'cancelled');
    return appts.filter((a) => a.status === filter);
  }, [appts, filter]);

  const byHour = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    filtered.forEach((a) => {
      const h = new Date(a.startAt).getHours();
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(a);
    });
    map.forEach((arr) => arr.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    return map;
  }, [filtered]);

  const hourRange = useMemo(() => {
    let lo = 8;
    let hi = 19;
    filtered.forEach((a) => {
      const h = new Date(a.startAt).getHours();
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    });
    const out: number[] = [];
    for (let h = lo; h <= hi; h++) out.push(h);
    return out;
  }, [filtered]);

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.appointments')}
          accent="emerald"
          title={t('appointment.title')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DateNav value={date} onChange={setDate} />
              <Button className="cursor-pointer">
                <Plus className="size-4" aria-hidden="true" />
                {t('appointment.newAppointment')}
              </Button>
            </div>
          }
        />

        <section
          aria-label={t('appointment.title')}
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          <StatTile
            label={t('appointment.stats.booked')}
            value={stats.booked}
            icon={CalendarIcon}
            accent="emerald"
          />
          <StatTile
            label={t('appointment.stats.confirmed')}
            value={stats.confirmed}
            icon={Clock}
            accent="indigo"
          />
          <StatTile
            label={t('appointment.stats.completed')}
            value={stats.completed}
            icon={CheckCircle2}
            accent="violet"
          />
          <StatTile
            label={t('appointment.stats.noShow')}
            value={stats.noShow}
            icon={CircleSlash}
            accent="rose"
          />
        </section>

        <FilterPills filter={filter} setFilter={setFilter} t={t} />

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CalendarIcon} title={t('appointment.empty.day')} />
        ) : (
          <Card className="overflow-hidden p-0">
            <ul role="list" className="divide-y divide-border">
              {hourRange.map((h) => {
                const slots = byHour.get(h) ?? [];
                const hourLabel = `${String(h).padStart(2, '0')}:00`;
                return (
                  <li key={h} className="flex gap-4 px-5 py-4">
                    <div className="w-16 shrink-0 pt-2 font-mono text-xs font-semibold tabular-nums uppercase text-muted-foreground">
                      {hourLabel}
                    </div>
                    {slots.length === 0 ? (
                      <div className="flex-1 self-center text-xs text-muted-foreground/40">
                        —
                      </div>
                    ) : (
                      <div className="flex flex-1 flex-col gap-2">
                        {slots.map((a) => (
                          <ApptCard
                            key={a.id}
                            appt={a}
                            patient={patientsById.get(a.patientId)}
                            locale={locale}
                            onSelect={() =>
                              void navigate({
                                to: '/patients/$id',
                                params: { id: a.patientId },
                              })
                            }
                          />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </TenantGate>
  );
}

/* -------------------------------------------------------------------------- */
/*  StatTile                                                                  */
/* -------------------------------------------------------------------------- */

type Accent = 'emerald' | 'indigo' | 'violet' | 'rose';

const STAT_BG: Record<Accent, string> = {
  emerald: 'bg-emerald-soft text-emerald-ink',
  indigo: 'bg-indigo-soft text-indigo-ink',
  violet: 'bg-violet-soft text-violet-ink',
  rose: 'bg-rose-soft text-rose-ink',
};

const STAT_DOT: Record<Accent, string> = {
  emerald: 'bg-emerald',
  indigo: 'bg-indigo',
  violet: 'bg-violet',
  rose: 'bg-rose',
};

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof CalendarIcon;
  accent: Accent;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-4 shadow-card">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', STAT_DOT[accent])} />
        <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </span>
        <span
          aria-hidden="true"
          className={cn('flex size-9 items-center justify-center rounded-lg', STAT_BG[accent])}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FilterPills — status filter (chip-toggle)                                 */
/* -------------------------------------------------------------------------- */

const FILTER_KEYS: Array<{ key: StatusFilter; labelKey: string }> = [
  { key: 'all', labelKey: 'appointment.filter.all' },
  { key: 'scheduled', labelKey: 'appointment.status.scheduled' },
  { key: 'confirmed', labelKey: 'appointment.status.confirmed' },
  { key: 'checked_in', labelKey: 'appointment.status.checked_in' },
  { key: 'in_progress', labelKey: 'appointment.status.in_progress' },
  { key: 'completed', labelKey: 'appointment.status.completed' },
  { key: 'no_show', labelKey: 'appointment.status.no_show' },
];

function FilterPills({
  filter,
  setFilter,
  t,
}: {
  filter: StatusFilter;
  setFilter: (f: StatusFilter) => void;
  t: TFunction;
}) {
  return (
    <SegmentedTabs<StatusFilter>
      ariaLabel="status filter"
      accent="emerald"
      value={filter}
      onChange={setFilter}
      options={FILTER_KEYS.map((f) => ({ value: f.key, label: t(f.labelKey) }))}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  ApptCard — single appointment row, status-colored left bar                */
/* -------------------------------------------------------------------------- */

const STATUS_BAR: Record<Appointment['status'], string> = {
  scheduled: 'bg-muted-foreground/40',
  confirmed: 'bg-indigo',
  checked_in: 'bg-amber',
  in_progress: 'bg-emerald',
  completed: 'bg-violet',
  no_show: 'bg-rose',
  cancelled: 'bg-rose',
};

const STATUS_PILL: Record<Appointment['status'], string> = {
  scheduled: 'bg-muted text-foreground',
  confirmed: 'bg-indigo-soft text-indigo-ink',
  checked_in: 'bg-amber-soft text-amber-ink',
  in_progress: 'bg-emerald-soft text-emerald-ink',
  completed: 'bg-violet-soft text-violet-ink',
  no_show: 'bg-rose-soft text-rose-ink',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

function ApptCard({
  appt,
  patient,
  locale,
  onSelect,
}: {
  appt: Appointment;
  patient: Patient | undefined;
  locale: 'en' | 'th';
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const start = formatTime(appt.startAt, locale);
  const end = formatTime(appt.endAt, locale);
  const name = patient?.fullName ?? '—';
  return (
    <button
      type="button"
      aria-label={`${start}, ${name}, ${appt.serviceName}, ${t(`appointment.status.${appt.status}`)}`}
      onClick={onSelect}
      className="group flex cursor-pointer items-stretch overflow-hidden rounded-lg border border-border bg-card text-left shadow-card transition-shadow hover:shadow-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span aria-hidden="true" className={cn('w-1 shrink-0', STATUS_BAR[appt.status])} />
      <div className="flex flex-1 flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4">
        <div className="flex shrink-0 flex-col font-mono text-sm tabular-nums">
          <span className="font-semibold text-foreground">{start}</span>
          <span className="text-xs text-muted-foreground">{end}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{appt.serviceName}</div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            STATUS_PILL[appt.status],
          )}
        >
          {t(`appointment.status.${appt.status}`)}
        </span>
      </div>
    </button>
  );
}
