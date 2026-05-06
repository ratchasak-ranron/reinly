/* eslint-disable security/detect-object-injection -- map keys are constant union literals (Appointment status / accent enum) */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Package,
  Plus,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Appointment, Patient, WalkIn } from '@reinly/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from '@/components/ui/sparkline';
import { DeltaIndicator, type KpiDelta } from '@/components/ui/kpi-tile';
import { TenantGate } from '@/components/tenant-gate';
import { useDevToolbar } from '@/store/dev-toolbar';
import { usePatients } from '@/features/patient';
import { CheckInFlow } from '@/features/walk-in';
import { useInventoryItems } from '@/features/inventory';
import { useTodayDashboard } from '@/features/_shared/use-today-kpis';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';

function HomePage() {
  const { t } = useTranslation();
  const branchId = useDevToolbar((s) => s.branchId);
  const locale = useLocale();
  const [walkInOpen, setWalkInOpen] = useState(false);

  const dashboard = useTodayDashboard(branchId);
  const lowStock = useInventoryItems(branchId, true);
  const patients = usePatients('');

  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    (patients.data ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [patients.data]);

  return (
    <TenantGate>
      <div className="space-y-6">
        <GreetingHeader onNewWalkIn={() => setWalkInOpen(true)} />

        <RightNowCard
          appointments={dashboard.appointments}
          walkIns={dashboard.walkIns}
          patientsById={patientsById}
          locale={locale}
        />

        {/* KPI bento — Today-only visual treatment: oversized rounded
            cards with display-scale numbers, mock 7-day trend
            sparkline, and per-section accent colour. */}
        <section
          aria-label={t('home.kpi.sectionLabel')}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <BentoKpi
            label={t('home.kpi.queue')}
            value={dashboard.kpis.queueDepth}
            icon={Users}
            hint={t('home.kpi.queueHint')}
            accent="sky"
            trend={mockTrend(dashboard.kpis.queueDepth, 1)}
            delta={{ value: mockDelta(dashboard.kpis.queueDepth, 1), label: t('home.delta.thisWeek') }}
          />
          <BentoKpi
            label={t('home.kpi.booked')}
            value={dashboard.kpis.appointmentsBooked}
            icon={CalendarIcon}
            hint={t('home.kpi.bookedHint')}
            accent="emerald"
            trend={mockTrend(dashboard.kpis.appointmentsBooked, 2)}
            delta={{ value: mockDelta(dashboard.kpis.appointmentsBooked, 2), label: t('home.delta.thisWeek') }}
          />
          <BentoKpi
            label={t('home.kpi.done')}
            value={dashboard.kpis.walkInsCompleted}
            icon={CheckCircle2}
            hint={t('home.kpi.doneHint')}
            accent="violet"
            trend={mockTrend(dashboard.kpis.walkInsCompleted, 3)}
            delta={{ value: mockDelta(dashboard.kpis.walkInsCompleted, 3), label: t('home.delta.thisWeek') }}
          />
          <BentoKpi
            label={t('home.kpi.alerts')}
            value={dashboard.kpis.lowStockAlerts}
            icon={AlertTriangle}
            hint={t('home.kpi.alertsHint')}
            accent={dashboard.kpis.lowStockAlerts > 0 ? 'amber' : 'rose'}
            trend={mockTrend(dashboard.kpis.lowStockAlerts, 4)}
            delta={{
              value: mockDelta(dashboard.kpis.lowStockAlerts, 4),
              label: t('home.delta.thisWeek'),
              positiveIsGood: false,
            }}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <TodayTimeline
            appointments={dashboard.appointments}
            walkIns={dashboard.walkIns}
            patientsById={patientsById}
            locale={locale}
          />
          <div className="space-y-6">
            <QuickActions onNewWalkIn={() => setWalkInOpen(true)} />
            <AlertsBand
              lowStock={dashboard.kpis.lowStockAlerts}
              lowStockNames={(lowStock.data ?? []).slice(0, 3).map((i) => i.name)}
            />
          </div>
        </div>

        <CheckInFlow open={walkInOpen} onOpenChange={setWalkInOpen} />
      </div>
    </TenantGate>
  );
}

/* -------------------------------------------------------------------------- */
/*  Greeting header — time-of-day greeting + date + primary CTA               */
/* -------------------------------------------------------------------------- */

function GreetingHeader({ onNewWalkIn }: { onNewWalkIn: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const dateLabel = new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
          {t(`home.greetingTime.${partOfDay}` as const)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
      </div>
      <Button onClick={onNewWalkIn} className="cursor-pointer touch-target shadow-card">
        <Plus className="size-4" aria-hidden="true" />
        {t('walkIn.newWalkIn')}
      </Button>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  RightNowCard — single answer to "what should I be doing right now?"       */
/* -------------------------------------------------------------------------- */

interface NowCardProps {
  appointments: Appointment[] | undefined;
  walkIns: WalkIn[] | undefined;
  patientsById: Map<string, Patient>;
  locale: string;
}

function RightNowCard({ appointments, walkIns, patientsById, locale }: NowCardProps) {
  const { t } = useTranslation();
  const now = Date.now();

  const inProgress = (appointments ?? []).find((a) => a.status === 'in_progress');
  const upcoming = (appointments ?? [])
    .filter(
      (a) =>
        new Date(a.startAt).getTime() > now &&
        (a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'checked_in'),
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

  const activeWalkIn = (walkIns ?? []).find((w) => w.status === 'in_progress');

  // Pick the most relevant event in this priority: in-progress walk-in →
  // in-progress appointment → next upcoming appointment → empty.
  let mode: 'inProgress' | 'next' | 'empty' = 'empty';
  let title = '';
  let subtitle = '';
  let chip = '';
  let accent: 'emerald' | 'indigo' | 'zinc' = 'zinc';

  if (activeWalkIn) {
    const patient = patientsById.get(activeWalkIn.patientId);
    const minsAgo = Math.max(
      0,
      Math.round((now - new Date(activeWalkIn.arrivedAt).getTime()) / 60_000),
    );
    mode = 'inProgress';
    title = patient?.fullName ?? '—';
    subtitle = t('walkIn.title');
    chip = t('home.now.minutesAgo', { n: minsAgo });
    accent = 'emerald';
  } else if (inProgress) {
    const patient = patientsById.get(inProgress.patientId);
    const minsAgo = Math.max(
      0,
      Math.round((now - new Date(inProgress.startAt).getTime()) / 60_000),
    );
    mode = 'inProgress';
    title = patient?.fullName ?? '—';
    subtitle = inProgress.serviceName;
    chip = t('home.now.minutesAgo', { n: minsAgo });
    accent = 'emerald';
  } else if (upcoming) {
    const patient = patientsById.get(upcoming.patientId);
    const minsTo = Math.max(
      0,
      Math.round((new Date(upcoming.startAt).getTime() - now) / 60_000),
    );
    mode = 'next';
    title = patient?.fullName ?? '—';
    subtitle = upcoming.serviceName;
    chip = t('home.now.inMinutes', { n: minsTo });
    accent = 'indigo';
  }

  const accentBorder =
    accent === 'emerald'
      ? 'border-emerald'
      : accent === 'indigo'
        ? 'border-indigo'
        : 'border-border';
  const accentText =
    accent === 'emerald'
      ? 'text-emerald-ink'
      : accent === 'indigo'
        ? 'text-indigo-ink'
        : 'text-muted-foreground';
  const accentBg =
    accent === 'emerald'
      ? 'bg-emerald-soft'
      : accent === 'indigo'
        ? 'bg-indigo-soft'
        : 'bg-muted';

  // Empty state renders as a compact one-row card so it doesn't hog
  // vertical real estate when there's nothing to act on.
  if (mode === 'empty') {
    return (
      <Card className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-muted/40 px-5 py-3 shadow-none">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-foreground/30" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t('home.now.title')}
          </span>
          <span className="truncate text-sm text-foreground">{t('home.now.empty')}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden rounded-3xl border-2 p-0', accentBorder)}>
      <div className={cn('flex items-center gap-2 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]', accentBg, accentText)}>
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', accent === 'emerald' ? 'bg-emerald' : 'bg-indigo')} />
        {mode === 'inProgress' ? t('home.now.title') : t('home.now.next')}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="truncate font-heading text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
            {title}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums', accentBg, accentText)}>
            {chip}
          </span>
          {mode === 'next' && upcoming ? (
            <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {formatTime(upcoming.startAt, locale)}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  TodayTimeline — vertical hour rows with appointment chips inline          */
/* -------------------------------------------------------------------------- */
/*  BentoKpi — Today-only oversized KPI tile with sparkline                   */
/*                                                                            */
/*  Visual identity for the dashboard: 24px corners, display-scale tabular    */
/*  number, soft section-tinted icon chip, mock 7-day trend underneath.       */
/*  Other pages keep the global <KpiTile/> for density.                       */
/* -------------------------------------------------------------------------- */

type BentoAccent = 'sky' | 'emerald' | 'violet' | 'amber' | 'rose';

const BENTO_BG: Record<BentoAccent, string> = {
  sky: 'bg-sky-soft text-sky-ink',
  emerald: 'bg-emerald-soft text-emerald-ink',
  violet: 'bg-violet-soft text-violet-ink',
  amber: 'bg-amber-soft text-amber-ink',
  rose: 'bg-rose-soft text-rose-ink',
};

const BENTO_DOT: Record<BentoAccent, string> = {
  sky: 'bg-sky',
  emerald: 'bg-emerald',
  violet: 'bg-violet',
  amber: 'bg-amber',
  rose: 'bg-rose',
};

const BENTO_SPARK: Record<BentoAccent, 'success' | 'warning' | 'destructive' | 'default'> = {
  sky: 'default',
  emerald: 'success',
  violet: 'default',
  amber: 'warning',
  rose: 'destructive',
};

function BentoKpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  trend,
  delta,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
  accent: BentoAccent;
  trend: number[];
  delta?: KpiDelta;
}) {
  const chipClass = BENTO_BG[accent];
  const dotClass = BENTO_DOT[accent];
  const sparkVariant = BENTO_SPARK[accent];
  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', dotClass)} />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </span>
        </div>
        <span
          aria-hidden="true"
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', chipClass)}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-4 font-heading text-5xl font-semibold tabular-nums leading-none tracking-[-0.04em] text-foreground">
        {value}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      {delta ? <div className="mt-1.5"><DeltaIndicator delta={delta} /></div> : null}
      <div className="mt-3 -mb-1 -ml-1 -mr-1 opacity-80">
        <Sparkline
          data={trend}
          ariaLabel={`${label} trend`}
          variant={sparkVariant}
          className="h-10"
        />
      </div>
    </div>
  );
}

/**
 * Deterministic 7-day mock series anchored on the current value, so the
 * sparkline reads as movement rather than noise. Replace with a real
 * `trend7` field on the dashboard hook once the server tracks daily
 * snapshots.
 */
/**
 * Deterministic period-over-period delta. Anchored on the live value and
 * the seed so each KPI reads as either +N up or -N down without flicker
 * across renders. Replace with `(current - previous)` once the dashboard
 * hook tracks day-7 snapshots.
 */
function mockDelta(value: number, seed: number): number {
  const base = Math.max(1, value);
  const sign = (seed % 2 === 0 ? 1 : -1);
  const magnitude = Math.max(1, Math.round(base * 0.18 + (seed % 3)));
  return sign * magnitude;
}

function mockTrend(value: number, seed: number): number[] {
  const out: number[] = [];
  const base = Math.max(1, value);
  for (let i = 0; i < 7; i++) {
    // Sine-ish wave + slight up-trend so the spark line tilts forward
    // even when value is 0.
    const w = Math.sin((i + seed) * 0.9) * 0.3;
    const drift = (i / 6) * 0.2;
    const v = base * (0.7 + w + drift);
    out.push(Math.max(0, Math.round(v)));
  }
  return out;
}

/* -------------------------------------------------------------------------- */

interface TimelineProps {
  appointments: Appointment[] | undefined;
  walkIns: WalkIn[] | undefined;
  patientsById: Map<string, Patient>;
  locale: string;
}

const STATUS_CHIP_CLASS: Record<Appointment['status'], string> = {
  scheduled: 'bg-muted text-foreground border-border',
  confirmed: 'bg-indigo-soft text-indigo-ink border-indigo/30',
  checked_in: 'bg-amber-soft text-amber-ink border-amber/30',
  in_progress: 'bg-emerald-soft text-emerald-ink border-emerald/30',
  completed: 'bg-card text-muted-foreground border-border line-through',
  no_show: 'bg-rose-soft text-rose-ink border-rose/30',
  cancelled: 'bg-card text-muted-foreground border-border line-through',
};

function TodayTimeline({ appointments, walkIns, patientsById, locale }: TimelineProps) {
  const { t } = useTranslation();
  const items = useMemo(() => appointments ?? [], [appointments]);

  const byHour = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    items.forEach((a) => {
      const h = new Date(a.startAt).getHours();
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(a);
    });
    map.forEach((arr) => arr.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    return map;
  }, [items]);

  // Hour range: 8am to 8pm by default, expanded to cover any actual events.
  const range = useMemo(() => {
    let lo = 8;
    let hi = 19;
    items.forEach((a) => {
      const h = new Date(a.startAt).getHours();
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    });
    const out: number[] = [];
    for (let h = lo; h <= hi; h++) out.push(h);
    return out;
  }, [items]);

  const activeWalkIns = (walkIns ?? []).filter(
    (w) => w.status === 'waiting' || w.status === 'in_progress',
  );

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border p-5">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('home.timeline.title')}
        </CardTitle>
        {activeWalkIns.length > 0 ? (
          <span className="rounded-full bg-sky-soft px-2.5 py-0.5 text-xs font-medium text-sky-ink">
            {activeWalkIns.length} {t('walkIn.queue')}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            {t('home.timeline.empty')}
          </p>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {range.map((h) => {
              const slots = byHour.get(h) ?? [];
              const hourLabel = `${String(h).padStart(2, '0')}:00`;
              return (
                <li key={h} className="flex gap-4 px-5 py-3">
                  <div className="w-14 shrink-0 pt-0.5 font-mono text-xs font-medium tabular-nums text-muted-foreground">
                    {hourLabel}
                  </div>
                  {slots.length === 0 ? (
                    <div className="flex-1 text-xs text-muted-foreground/50">—</div>
                  ) : (
                    <div className="flex flex-1 flex-wrap gap-2">
                      {slots.map((a) => {
                        const patient = patientsById.get(a.patientId);
                        const time = formatTime(a.startAt, locale);
                        return (
                          <span
                            key={a.id}
                            className={cn(
                              'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                              STATUS_CHIP_CLASS[a.status],
                            )}
                          >
                            <span className="font-mono font-semibold tabular-nums">{time}</span>
                            <span className="truncate font-medium">
                              {patient?.fullName ?? '—'}
                            </span>
                            <span className="hidden truncate opacity-70 sm:inline">
                              · {a.serviceName}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  QuickActions — 4 mini cards linking to common workflows                   */
/* -------------------------------------------------------------------------- */

function QuickActions({ onNewWalkIn }: { onNewWalkIn: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="rounded-3xl">
      <CardHeader className="border-b border-border p-5">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('home.actions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 p-3">
        <ActionLink to="/patients" icon={UserPlus} label={t('home.actions.newPatient')} accent="sky" />
        <ActionLink
          to="/appointments"
          icon={CalendarIcon}
          label={t('home.actions.newAppt')}
          accent="emerald"
        />
        <ActionButton
          onClick={onNewWalkIn}
          icon={Users}
          label={t('home.actions.newWalkIn')}
          accent="amber"
        />
        <ActionLink
          to="/reports"
          icon={CreditCard}
          label={t('home.actions.takePayment')}
          accent="violet"
        />
      </CardContent>
    </Card>
  );
}

interface ActionInner {
  icon: LucideIcon;
  label: string;
  accent: 'sky' | 'emerald' | 'amber' | 'violet';
}

const ACTION_BG: Record<ActionInner['accent'], string> = {
  sky: 'bg-sky-soft text-sky-ink',
  emerald: 'bg-emerald-soft text-emerald-ink',
  amber: 'bg-amber-soft text-amber-ink',
  violet: 'bg-violet-soft text-violet-ink',
};

function ActionInnerLayout({ icon: Icon, label, accent }: ActionInner) {
  return (
    <span className="flex flex-col items-start gap-2 p-3">
      <span
        aria-hidden="true"
        className={cn('flex size-9 items-center justify-center rounded-lg', ACTION_BG[accent])}
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="text-sm font-medium leading-tight text-foreground">{label}</span>
    </span>
  );
}

function ActionLink({
  to,
  icon,
  label,
  accent,
}: ActionInner & { to: '/patients' | '/appointments' | '/reports' }) {
  return (
    <Link
      to={to}
      className="cursor-pointer rounded-lg border border-border bg-card transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <ActionInnerLayout icon={icon} label={label} accent={accent} />
    </Link>
  );
}

function ActionButton({ onClick, icon, label, accent }: ActionInner & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-border bg-card text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <ActionInnerLayout icon={icon} label={label} accent={accent} />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  AlertsBand — conditional rollup (low-stock only; PDPA lives on its own    */
/*  /consent route and is intentionally not surfaced on the operator's main   */
/*  Today flow).                                                              */
/* -------------------------------------------------------------------------- */

interface AlertsProps {
  lowStock: number;
  lowStockNames: string[];
}

function AlertsBand({ lowStock, lowStockNames }: AlertsProps) {
  const { t } = useTranslation();
  if (lowStock === 0) return null;

  return (
    <Card className="rounded-3xl">
      <CardHeader className="border-b border-border p-5">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('home.alerts.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {lowStock > 0 ? (
          <Link
            to="/inventory"
            className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-muted"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-lg bg-rose-soft text-rose-ink"
            >
              <Package className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {t('home.alerts.lowStock')} · {lowStock}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {lowStockNames.join(' · ')}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { HomePage };
