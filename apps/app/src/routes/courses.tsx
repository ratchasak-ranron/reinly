/* eslint-disable security/detect-object-injection -- map keys are constant union literals (CourseStatus / accent enum) */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from '@tanstack/react-router';
import {
  Activity,
  CalendarClock,
  ChevronRight,
  GraduationCap,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react';
import type { Course, CourseStatus, Patient } from '@reinly/domain';
import { sessionsRemaining } from '@reinly/domain';
import { useCourses } from '@/features/course';
import { usePatients } from '@/features/patient';
import { PageHeader } from '@/components/page-header';
import { TenantGate } from '@/components/tenant-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useDebounce } from '@/lib/use-debounce';
import { useLocale } from '@/lib/use-locale';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type StatusFilter = CourseStatus | 'all';

export function CoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('active');
  const debounced = useDebounce(query, 200);

  const { data, isLoading } = useCourses();
  const patients = usePatients('');

  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    (patients.data ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [patients.data]);

  const courses = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    const active = courses.filter((c) => c.status === 'active');
    const sessionsLeft = active.reduce((sum, c) => sum + sessionsRemaining(c), 0);
    const expiring = active.filter((c) => sessionsRemaining(c) <= 1).length;
    const closed = courses.filter(
      (c) => c.status === 'completed' || c.status === 'expired' || c.status === 'refunded',
    ).length;
    return { active: active.length, sessionsLeft, expiring, closed };
  }, [courses]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return courses
      .filter((c) => (filter === 'all' ? true : c.status === filter))
      .filter((c) => {
        if (!q) return true;
        const patientName = patientsById.get(c.patientId)?.fullName?.toLowerCase() ?? '';
        return c.serviceName.toLowerCase().includes(q) || patientName.includes(q);
      })
      .sort((a, b) => {
        // Lowest remaining first within active so attention-grabbing items
        // surface to the top. Other statuses fall back to most-recent.
        if (a.status === 'active' && b.status === 'active') {
          return sessionsRemaining(a) - sessionsRemaining(b);
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [courses, filter, debounced, patientsById]);

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.courses')}
          accent="violet"
          title={t('course.title')}
          actions={
            <Button className="cursor-pointer">
              <Plus className="size-4" aria-hidden="true" />
              {t('course.newCourse')}
            </Button>
          }
        />

        <section
          aria-label={t('course.title')}
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          <StatTile
            label={t('course.stats.active')}
            value={stats.active}
            icon={GraduationCap}
            accent="violet"
          />
          <StatTile
            label={t('course.stats.sessionsLeft')}
            value={stats.sessionsLeft}
            icon={Activity}
            accent="indigo"
          />
          <StatTile
            label={t('course.stats.expiring')}
            value={stats.expiring}
            icon={CalendarClock}
            accent="amber"
          />
          <StatTile
            label={t('course.stats.closed')}
            value={stats.closed}
            icon={TrendingUp}
            accent="zinc"
          />
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('course.searchPlaceholder')}
              aria-label={t('course.searchPlaceholder')}
              className="h-11 w-full rounded-input border border-input bg-card pl-9 pr-3 text-sm shadow-card placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <FilterPills filter={filter} setFilter={setFilter} t={t} />

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={t(courses.length === 0 ? 'course.empty.list' : 'course.empty.filter')}
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <ul role="list" className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id}>
                  <CourseRow
                    course={c}
                    patient={patientsById.get(c.patientId)}
                    onSelect={() =>
                      void navigate({
                        to: '/patients/$id',
                        params: { id: c.patientId },
                      })
                    }
                    locale={locale}
                    t={t}
                  />
                </li>
              ))}
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

type Accent = 'violet' | 'indigo' | 'amber' | 'zinc';

const STAT_BG: Record<Accent, string> = {
  violet: 'bg-violet-soft text-violet-ink',
  indigo: 'bg-indigo-soft text-indigo-ink',
  amber: 'bg-amber-soft text-amber-ink',
  zinc: 'bg-muted text-foreground',
};

const STAT_DOT: Record<Accent, string> = {
  violet: 'bg-violet',
  indigo: 'bg-indigo',
  amber: 'bg-amber',
  zinc: 'bg-foreground',
};

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof GraduationCap;
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
/*  FilterPills                                                               */
/* -------------------------------------------------------------------------- */

const FILTER_KEYS: Array<{ key: StatusFilter; labelKey: string }> = [
  { key: 'all', labelKey: 'course.filter.all' },
  { key: 'active', labelKey: 'course.status.active' },
  { key: 'completed', labelKey: 'course.status.completed' },
  { key: 'expired', labelKey: 'course.status.expired' },
  { key: 'refunded', labelKey: 'course.status.refunded' },
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
      accent="violet"
      value={filter}
      onChange={setFilter}
      options={FILTER_KEYS.map((f) => ({ value: f.key, label: t(f.labelKey) }))}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  CourseRow — patient + service + progress + status                         */
/* -------------------------------------------------------------------------- */

const STATUS_PILL: Record<CourseStatus, string> = {
  active: 'bg-violet-soft text-violet-ink',
  completed: 'bg-emerald-soft text-emerald-ink',
  expired: 'bg-rose-soft text-rose-ink',
  refunded: 'bg-muted text-muted-foreground',
};

const PROGRESS_FILL: Record<'normal' | 'warn' | 'danger' | 'done', string> = {
  normal: 'bg-violet',
  warn: 'bg-amber',
  danger: 'bg-rose',
  done: 'bg-emerald',
};

function progressTone(course: Course): keyof typeof PROGRESS_FILL {
  if (course.status === 'completed') return 'done';
  const remaining = sessionsRemaining(course);
  if (remaining === 0) return 'danger';
  if (remaining <= 1) return 'warn';
  return 'normal';
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
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

function CourseRow({
  course,
  patient,
  onSelect,
  locale,
  t,
}: {
  course: Course;
  patient: Patient | undefined;
  onSelect: () => void;
  locale: 'en' | 'th';
  t: TFunction;
}) {
  const remaining = sessionsRemaining(course);
  const percent = course.sessionsTotal === 0
    ? 0
    : Math.min(100, Math.round((course.sessionsUsed / course.sessionsTotal) * 100));
  const tone = progressTone(course);
  const patientName = patient?.fullName ?? '—';
  return (
    <button
      type="button"
      aria-label={`${patientName}, ${course.serviceName}, ${course.sessionsUsed}/${course.sessionsTotal}, ${t(`course.status.${course.status}`)}`}
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
    >
      {/* Patient avatar */}
      <span
        aria-hidden="true"
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          avatarAccentFor(course.patientId),
        )}
      >
        {initialsOf(patientName)}
      </span>

      {/* Patient + service + progress */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-foreground">{patientName}</span>
          <span className="truncate text-xs text-muted-foreground">· {course.serviceName}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('course.progressLabel', { service: course.serviceName })}
          >
            <span
              aria-hidden="true"
              className={cn('block h-full transition-[width] duration-200', PROGRESS_FILL[tone])}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {course.sessionsUsed}/{course.sessionsTotal}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground tabular-nums">
          <span>{formatCurrency(course.pricePaid, locale)}</span>
          {course.expiresAt ? (
            <span>· {t('course.expiresAt')} {formatDate(course.expiresAt, locale)}</span>
          ) : null}
          {remaining > 0 ? (
            <span>· {t('course.sessionsRemaining', { count: remaining })}</span>
          ) : null}
        </div>
      </div>

      {/* Status pill + chevron */}
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
          STATUS_PILL[course.status],
        )}
      >
        {t(`course.status.${course.status}`)}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
