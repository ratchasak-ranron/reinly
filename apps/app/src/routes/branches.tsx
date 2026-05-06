import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronRight,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import type { BranchSummary } from '@reinly/api-client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { useBranchesSummary } from '@/features/branch';
import { monthRangeToDates } from '@/features/report';
import { PageHeader } from '@/components/page-header';
import { TenantGate } from '@/components/tenant-gate';
import { FormError } from '@/components/ui/form-feedback';
import { formatCurrency, formatNumber } from '@/lib/format';
import { monthsForLocale } from '@/lib/locale-months';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';

export function BranchesPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const range = useMemo(() => monthRangeToDates(year, month), [year, month]);
  const { data, isLoading, isError, error } = useBranchesSummary(range);
  const monthOptions = useMemo(
    () => monthsForLocale(locale).map((m, idx) => ({ value: String(idx + 1), label: m })),
    [locale],
  );
  const yearOptions = useMemo(
    () => [year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) })),
    [year],
  );

  const items = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, b) => ({
        active: acc.active + 1,
        revenue: acc.revenue + b.revenue,
        visits: acc.visits + b.visitCount,
        lowStock: acc.lowStock + b.lowStockCount,
      }),
      { active: 0, revenue: 0, visits: 0, lowStock: 0 },
    );
  }, [items]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.revenue - a.revenue),
    [items],
  );
  const topRevenue = sorted[0]?.revenue ?? 0;
  const pagination = usePagination(sorted, 10);

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.branches')}
          accent="emerald"
          title={t('branch.title')}
          actions={
            <div className="flex items-center gap-2">
              <Select
                options={monthOptions}
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                aria-label={t('report.month')}
                className="w-auto min-w-[7rem]"
              />
              <Select
                options={yearOptions}
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
                aria-label={t('report.year')}
                className="w-auto min-w-[5.5rem]"
              />
            </div>
          }
        />

        <section
          aria-label={t('branch.title')}
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          <StatTile
            label={t('branch.stats.active')}
            value={formatNumber(stats.active, locale)}
            icon={Building2}
            accent="emerald"
          />
          <StatTile
            label={t('branch.stats.revenue')}
            value={formatCurrency(stats.revenue, locale)}
            icon={TrendingUp}
            accent="indigo"
          />
          <StatTile
            label={t('branch.stats.visits')}
            value={formatNumber(stats.visits, locale)}
            icon={Activity}
            accent="violet"
          />
          <StatTile
            label={t('branch.stats.lowStock')}
            value={formatNumber(stats.lowStock, locale)}
            icon={AlertTriangle}
            accent={stats.lowStock > 0 ? 'amber' : 'zinc'}
          />
        </section>

        {isError ? (
          <FormError className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            {`${t('common.error')}: ${error.message}`}
          </FormError>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Building2} title={t('branch.copy.noData')} />
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <ul role="list" className="divide-y divide-border">
                {pagination.pageItems.map((b, idx) => (
                  <li key={b.branchId}>
                    <BranchRow
                      summary={b}
                      rank={(pagination.page - 1) * pagination.pageSize + idx + 1}
                      topRevenue={topRevenue}
                      locale={locale}
                      onSelect={() =>
                        void navigate({ to: '/reports', search: { branchId: b.branchId } as never })
                      }
                    />
                  </li>
                ))}
              </ul>
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
      </div>
    </TenantGate>
  );
}

/* -------------------------------------------------------------------------- */
/*  StatTile                                                                  */
/* -------------------------------------------------------------------------- */

type Accent = 'emerald' | 'indigo' | 'violet' | 'amber' | 'zinc';

const STAT_BG: Record<Accent, string> = {
  emerald: 'bg-emerald-soft text-emerald-ink',
  indigo: 'bg-indigo-soft text-indigo-ink',
  violet: 'bg-violet-soft text-violet-ink',
  amber: 'bg-amber-soft text-amber-ink',
  zinc: 'bg-muted text-foreground',
};

const STAT_DOT: Record<Accent, string> = {
  emerald: 'bg-emerald',
  indigo: 'bg-indigo',
  violet: 'bg-violet',
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
  value: string;
  icon: typeof Building2;
  accent: Accent;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-4 shadow-card">
      <div className="flex min-w-0 items-center gap-2">
        {/* eslint-disable-next-line security/detect-object-injection -- accent is a constant union literal */}
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', STAT_DOT[accent])} />
        <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="truncate text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
          {value}
        </span>
        <span
          aria-hidden="true"
          /* eslint-disable-next-line security/detect-object-injection -- accent is a constant union literal */
          className={cn('flex size-9 items-center justify-center rounded-lg', STAT_BG[accent])}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  BranchRow                                                                 */
/* -------------------------------------------------------------------------- */

function BranchRow({
  summary,
  rank,
  topRevenue,
  locale,
  onSelect,
}: {
  summary: BranchSummary;
  rank: number;
  topRevenue: number;
  locale: 'en' | 'th';
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const isTop = rank === 1 && summary.revenue > 0;
  const percent = topRevenue > 0
    ? Math.max(2, Math.min(100, Math.round((summary.revenue / topRevenue) * 100)))
    : 0;
  const ariaLabel = `${summary.branchName}, ${formatCurrency(summary.revenue, locale)}, ${formatNumber(summary.visitCount, locale)} visits`;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          isTop ? 'bg-emerald-soft text-emerald-ink' : 'bg-muted text-foreground',
        )}
      >
        <Building2 className="size-[18px]" strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {summary.branchName}
          </span>
          {summary.city ? (
            <span className="truncate text-xs text-muted-foreground">· {summary.city}</span>
          ) : null}
          {isTop ? (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-ink">
              <TrendingUp className="size-3" aria-hidden="true" />
              {t('branch.copy.top')}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={summary.branchName}
          >
            <span
              aria-hidden="true"
              className="block h-full bg-emerald transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(summary.revenue, locale)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Activity className="size-3" aria-hidden="true" />
            {t('report.visits')} {formatNumber(summary.visitCount, locale)}
          </span>
          {summary.topDoctorAmount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Stethoscope className="size-3" aria-hidden="true" />
              {t('branch.topDoctor')} {formatCurrency(summary.topDoctorAmount, locale)}
            </span>
          ) : null}
          {summary.lowStockCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-amber-ink">
              <AlertTriangle className="size-3" aria-hidden="true" />
              {t('branch.lowStockCount', { count: summary.lowStockCount })}
            </span>
          ) : null}
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
