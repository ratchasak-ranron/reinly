/* eslint-disable security/detect-object-injection -- map keys are constant union literals (status / accent / dimension enum) */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Activity,
  AlertTriangle,
  Coins,
  Lightbulb,
  Package,
  PiggyBank,
  Receipt as ReceiptIcon,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import type { ReportDimension } from '@reinly/api-client';
import type {
  CommissionStatus,
  DoctorCommissionSummary,
  Expense,
  ExpenseCategory,
  InventoryItem,
} from '@reinly/domain';
import { expensesInRange, summarizeExpenses } from '@reinly/domain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { FormError, FormStatus } from '@/components/ui/form-feedback';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { useDevToolbar } from '@/store/dev-toolbar';
import { useExpenses } from '@/store/expense-store';
import {
  monthRangeToDates,
  useDimensionReport,
  useMonthlyReport,
} from '@/features/report';
import { formatCurrency, formatNumber } from '@/lib/format';
import { monthsForLocale } from '@/lib/locale-months';
import { useLocale } from '@/lib/use-locale';
import { PageHeader } from '@/components/page-header';
import { TenantGate } from '@/components/tenant-gate';
import { cn } from '@/lib/utils';

type ReportTab = 'overview' | 'revenue-structure';

export function ReportsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const branchId = useDevToolbar((s) => s.branchId);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dimension, setDimension] = useState<ReportDimension>('doctor');
  const [tab, setTab] = useState<ReportTab>('overview');

  const range = useMemo(() => {
    const dates = monthRangeToDates(year, month);
    return { ...dates, branchId };
  }, [year, month, branchId]);

  const report = useMonthlyReport(range);
  const dimensionReport = useDimensionReport(dimension, range);
  const expenses = useExpenses();

  const monthExpenses = useMemo(() => {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();
    return expensesInRange(expenses, start, end);
  }, [expenses, year, month]);

  const monthOptions = useMemo(
    () => monthsForLocale(locale).map((m, idx) => ({ value: String(idx + 1), label: m })),
    [locale],
  );
  const yearOptions = useMemo(
    () => [year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) })),
    [year],
  );

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.reports')}
          accent="zinc"
          title={t('report.title')}
          actions={
            <div className="flex items-center gap-2">
              <Select
                options={monthOptions}
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                aria-label={t('report.month')}
              />
              <Select
                options={yearOptions}
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
                aria-label={t('report.year')}
              />
            </div>
          }
        />

        <SegmentedTabs<ReportTab>
          ariaLabel={t('report.tabs.label')}
          variant="underline"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: t('report.tabs.overview') },
            { value: 'revenue-structure', label: t('report.tabs.revenueStructure') },
          ]}
        />

        {report.isError ? (
          <FormError className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            {`${t('common.error')}: ${report.error.message}`}
          </FormError>
        ) : null}

        {report.data?.partialFailures.length ? (
          <FormStatus className="rounded-md border border-amber/40 bg-amber-soft px-3 py-2 text-xs text-amber-ink">
            {`${t('report.partialFailures')}: ${report.data.partialFailures.join('; ')}`}
          </FormStatus>
        ) : null}

        {tab === 'revenue-structure' ? (
          <RevenueStructureTab
            revenue={report.data?.totalRevenue ?? 0}
            visitCount={report.data?.visitCount ?? 0}
            commissionTotal={
              report.data?.commissionSummary.reduce((sum, c) => sum + c.totalAmount, 0) ?? 0
            }
            expenses={monthExpenses}
            isLoading={report.isLoading}
            locale={locale}
            t={t}
          />
        ) : null}

        {/* KPI strip — 4 tiles for the selected month */}
        {tab === 'overview' && report.isLoading ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : tab === 'overview' && report.data ? (
          <section
            aria-label={t('report.title')}
            className="grid grid-cols-2 gap-2 lg:grid-cols-4"
          >
            <KpiCard
              label={t('report.revenue')}
              value={formatCurrency(report.data.totalRevenue, locale)}
              hint={`${formatNumber(report.data.visitCount, locale)} ${t('report.receipts')}`}
              icon={TrendingUp}
              accent="indigo"
            />
            <KpiCard
              label={t('report.visits')}
              value={formatNumber(report.data.visitCount, locale)}
              icon={Users}
              accent="sky"
            />
            <KpiCard
              label={t('report.loyaltyOutstanding')}
              value={formatNumber(report.data.loyaltyTotalOutstanding, locale)}
              hint={`${formatNumber(report.data.loyaltyAccountCount, locale)} ${t('report.activeMembers')}`}
              icon={Coins}
              accent="violet"
            />
            <KpiCard
              label={t('report.lowStockAlerts')}
              value={formatNumber(report.data.lowStockItems.length, locale)}
              icon={AlertTriangle}
              accent={report.data.lowStockItems.length > 0 ? 'amber' : 'zinc'}
            />
          </section>
        ) : null}

        {/* Breakdown — full-width with dimension pill toggle and bar list */}
        {tab === 'overview' && report.data ? (
          <Card className="overflow-hidden p-0">
            <CardHeader className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('report.breakdown')}
              </CardTitle>
              <DimensionPills dimension={dimension} setDimension={setDimension} t={t} />
            </CardHeader>
            <CardContent className="p-0">
              {dimensionReport.isLoading ? (
                <div className="space-y-1 p-5">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : dimensionReport.isError ? (
                <div className="p-5">
                  <FormError>{t('common.error')}</FormError>
                </div>
              ) : !dimensionReport.data || dimensionReport.data.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {t('report.noBreakdown')}
                </p>
              ) : (
                <BreakdownList rows={dimensionReport.data} locale={locale} t={t} />
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Two-col supporting cards: commissions + low stock */}
        {tab === 'overview' && report.data ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border p-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Stethoscope className="size-4" aria-hidden="true" />
                  {t('report.commissionByDoctor')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {report.data.commissionSummary.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {t('report.noCommission')}
                  </p>
                ) : (
                  <CommissionList rows={report.data.commissionSummary} locale={locale} t={t} />
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden p-0">
              <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border p-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Package className="size-4" aria-hidden="true" />
                  {t('report.lowStockAlerts')}
                </CardTitle>
                {report.data.lowStockItems.length > 0 ? (
                  <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-[11px] font-medium text-amber-ink tabular-nums">
                    {report.data.lowStockItems.length}
                  </span>
                ) : null}
              </CardHeader>
              <CardContent className="p-0">
                {report.data.lowStockItems.length === 0 ? (
                  <p className="flex items-center gap-2 px-5 py-12 text-center text-sm text-muted-foreground">
                    <Activity className="size-4 text-emerald-ink" aria-hidden="true" />
                    {t('report.lowStockAlerts')}: 0
                  </p>
                ) : (
                  <LowStockList items={report.data.lowStockItems} />
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </TenantGate>
  );
}

/* -------------------------------------------------------------------------- */
/*  KpiCard                                                                   */
/* -------------------------------------------------------------------------- */

type Accent = 'indigo' | 'sky' | 'violet' | 'amber' | 'zinc';

const KPI_BG: Record<Accent, string> = {
  indigo: 'bg-indigo-soft text-indigo-ink',
  sky: 'bg-sky-soft text-sky-ink',
  violet: 'bg-violet-soft text-violet-ink',
  amber: 'bg-amber-soft text-amber-ink',
  zinc: 'bg-muted text-foreground',
};

const KPI_DOT: Record<Accent, string> = {
  indigo: 'bg-indigo',
  sky: 'bg-sky',
  violet: 'bg-violet',
  amber: 'bg-amber',
  zinc: 'bg-foreground',
};

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof TrendingUp;
  accent: Accent;
}) {
  return (
    <Card className="p-5 transition-shadow hover:shadow-hover">
      <div className="flex items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', KPI_DOT[accent])} />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        <span
          aria-hidden="true"
          className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', KPI_BG[accent])}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      </div>
      <p className="font-heading text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  DimensionPills                                                            */
/* -------------------------------------------------------------------------- */

function DimensionPills({
  dimension,
  setDimension,
  t,
}: {
  dimension: ReportDimension;
  setDimension: (d: ReportDimension) => void;
  t: TFunction;
}) {
  const items: Array<{ key: ReportDimension; labelKey: string }> = [
    { key: 'doctor', labelKey: 'report.dimension.doctor' },
    { key: 'service', labelKey: 'report.dimension.service' },
    { key: 'branch', labelKey: 'report.dimension.branch' },
  ];
  return (
    <div className="inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label={t('report.dimension.label')}>
      {items.map((it) => {
        const active = dimension === it.key;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setDimension(it.key)}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(it.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  BreakdownList — bar chart by row                                          */
/* -------------------------------------------------------------------------- */

interface BreakdownRow {
  key: string;
  label: string;
  revenue: number;
  visitCount: number;
}

function BreakdownList({
  rows,
  locale,
  t,
}: {
  rows: BreakdownRow[];
  locale: 'en' | 'th';
  t: TFunction;
}) {
  const sorted = useMemo(() => [...rows].sort((a, b) => b.revenue - a.revenue), [rows]);
  const top = sorted[0]?.revenue ?? 0;
  const pagination = usePagination(sorted, 10);
  return (
    <div>
      <ul className="divide-y divide-border" role="list">
        {pagination.pageItems.map((r) => {
          const percent = top > 0
            ? Math.max(2, Math.min(100, Math.round((r.revenue / top) * 100)))
            : 0;
          return (
            <li key={r.key} className="px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium text-foreground">{r.label}</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(r.revenue, locale)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={r.label}
                >
                  <span
                    aria-hidden="true"
                    className="block h-full bg-foreground/85 transition-[width] duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {formatNumber(r.visitCount, locale)} {t('report.receipts')}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {pagination.totalPages > 1 ? (
        <div className="border-t border-border px-5 py-3">
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
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status pill colour map                                                    */
/* -------------------------------------------------------------------------- */

// CommissionSummary status extends CommissionStatus with a "mixed" rollup
// for doctors with both paid + accrued entries.
type CommissionSummaryStatus = CommissionStatus | 'mixed';

const COMMISSION_PILL: Record<CommissionSummaryStatus, string> = {
  accrued: 'bg-muted text-muted-foreground',
  paid: 'bg-emerald-soft text-emerald-ink',
  voided: 'bg-rose-soft text-rose-ink',
  mixed: 'bg-amber-soft text-amber-ink',
};

/* -------------------------------------------------------------------------- */
/*  CommissionList — paginated doctor commission rows                         */
/* -------------------------------------------------------------------------- */

function CommissionList({
  rows,
  locale,
  t,
}: {
  rows: DoctorCommissionSummary[];
  locale: 'en' | 'th';
  t: TFunction;
}) {
  const pagination = usePagination(rows, 10);
  return (
    <div>
      <ul className="divide-y divide-border" role="list">
        {pagination.pageItems.map((s) => (
          <li
            key={s.doctorId}
            className="flex items-center justify-between gap-3 px-5 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">
                {s.doctorName}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {formatNumber(s.visitCount, locale)} {t('report.receipts')}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                  COMMISSION_PILL[s.status],
                )}
              >
                {t(`commission.status.${s.status}`)}
              </span>
              <span className="font-mono text-base font-semibold tabular-nums">
                {formatCurrency(s.totalAmount, locale)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {pagination.totalPages > 1 ? (
        <div className="border-t border-border px-5 py-3">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
          />
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  LowStockList — paginated low-stock rows                                   */
/* -------------------------------------------------------------------------- */

function LowStockList({ items }: { items: InventoryItem[] }) {
  const pagination = usePagination(items, 10);
  return (
    <div>
      <ul className="divide-y divide-border" role="list">
        {pagination.pageItems.map((it) => (
          <li
            key={it.id}
            className="flex items-center justify-between gap-3 px-5 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{it.name}</div>
              <div className="text-xs text-muted-foreground">{it.sku}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-semibold tabular-nums text-amber-ink">
                {it.currentStock}
                <span className="text-muted-foreground"> / {it.minStock}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {pagination.totalPages > 1 ? (
        <div className="border-t border-border px-5 py-3">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
          />
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Revenue Structure tab                                                     */
/* -------------------------------------------------------------------------- */

const COST_ACCENT: Record<ExpenseCategory, { bg: string; bar: string; ink: string }> = {
  rent: { bg: 'bg-indigo-soft', bar: 'bg-indigo', ink: 'text-indigo-ink' },
  doctor_fee: { bg: 'bg-sky-soft', bar: 'bg-sky', ink: 'text-sky-ink' },
  salary: { bg: 'bg-emerald-soft', bar: 'bg-emerald', ink: 'text-emerald-ink' },
  utilities: { bg: 'bg-violet-soft', bar: 'bg-violet', ink: 'text-violet-ink' },
  supplies: { bg: 'bg-rose-soft', bar: 'bg-rose', ink: 'text-rose-ink' },
  marketing: { bg: 'bg-amber-soft', bar: 'bg-amber', ink: 'text-amber-ink' },
  equipment: { bg: 'bg-indigo-soft', bar: 'bg-indigo', ink: 'text-indigo-ink' },
  tax: { bg: 'bg-rose-soft', bar: 'bg-rose', ink: 'text-rose-ink' },
  other: { bg: 'bg-muted', bar: 'bg-foreground', ink: 'text-foreground' },
};

const RENT_BENCHMARK = 0.3;
const DOCTOR_BENCHMARK = 0.4;
const HEALTHY_MARGIN = 0.2;

interface RevenueStructureTabProps {
  revenue: number;
  visitCount: number;
  commissionTotal: number;
  expenses: ReadonlyArray<Expense>;
  isLoading: boolean;
  locale: 'en' | 'th';
  t: TFunction;
}

function RevenueStructureTab({
  revenue,
  visitCount,
  commissionTotal,
  expenses,
  isLoading,
  locale,
  t,
}: RevenueStructureTabProps) {
  const summary = useMemo(() => summarizeExpenses(expenses), [expenses]);
  const totalExpenses = summary.total;
  const grossProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? grossProfit / revenue : 0;
  const avgTicket = visitCount > 0 ? revenue / visitCount : 0;

  const costMix = useMemo(() => {
    return (Object.entries(summary.byCategory) as Array<[ExpenseCategory, number]>)
      .filter(([, total]) => total > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [summary]);
  const topCost = costMix[0]?.[0];
  const topCostShare = revenue > 0 && costMix[0] ? costMix[0][1] / revenue : 0;

  const rentTotal = summary.byCategory.rent;
  const rentShare = revenue > 0 ? rentTotal / revenue : 0;
  const doctorShare = revenue > 0 ? commissionTotal / revenue : 0;

  const insights = useMemo(() => {
    const items: Array<{ tone: 'good' | 'warn' | 'bad'; title: string; body: string }> = [];

    if (revenue === 0) {
      items.push({
        tone: 'warn',
        title: t('report.revenueStructure.insights.noRevenueTitle'),
        body: t('report.revenueStructure.insights.noRevenueBody'),
      });
    }
    if (revenue > 0) {
      if (margin < 0) {
        items.push({
          tone: 'bad',
          title: t('report.revenueStructure.insights.negativeMarginTitle'),
          body: t('report.revenueStructure.insights.negativeMarginBody', {
            value: formatPercent(margin, locale),
          }),
        });
      } else if (margin < HEALTHY_MARGIN) {
        items.push({
          tone: 'warn',
          title: t('report.revenueStructure.insights.thinMarginTitle'),
          body: t('report.revenueStructure.insights.thinMarginBody', {
            value: formatPercent(margin, locale),
            target: formatPercent(HEALTHY_MARGIN, locale),
          }),
        });
      } else {
        items.push({
          tone: 'good',
          title: t('report.revenueStructure.insights.healthyMarginTitle'),
          body: t('report.revenueStructure.insights.healthyMarginBody', {
            value: formatPercent(margin, locale),
          }),
        });
      }
    }

    if (rentShare > RENT_BENCHMARK) {
      items.push({
        tone: 'warn',
        title: t('report.revenueStructure.insights.rentHighTitle'),
        body: t('report.revenueStructure.insights.rentHighBody', {
          value: formatPercent(rentShare, locale),
          benchmark: formatPercent(RENT_BENCHMARK, locale),
        }),
      });
    }

    if (doctorShare > DOCTOR_BENCHMARK) {
      items.push({
        tone: 'warn',
        title: t('report.revenueStructure.insights.doctorHighTitle'),
        body: t('report.revenueStructure.insights.doctorHighBody', {
          value: formatPercent(doctorShare, locale),
          benchmark: formatPercent(DOCTOR_BENCHMARK, locale),
        }),
      });
    }

    if (topCost && topCostShare > 0) {
      items.push({
        tone: 'good',
        title: t('report.revenueStructure.insights.topCostTitle', {
          category: t(`expense.category.${topCost}`),
        }),
        body: t('report.revenueStructure.insights.topCostBody', {
          value: formatPercent(topCostShare, locale),
        }),
      });
    }

    if (avgTicket > 0) {
      items.push({
        tone: 'good',
        title: t('report.revenueStructure.insights.avgTicketTitle'),
        body: t('report.revenueStructure.insights.avgTicketBody', {
          value: formatCurrency(avgTicket, locale),
          count: visitCount,
        }),
      });
    }

    return items;
  }, [
    revenue,
    margin,
    rentShare,
    doctorShare,
    topCost,
    topCostShare,
    avgTicket,
    visitCount,
    locale,
    t,
  ]);

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        aria-label={t('report.revenueStructure.title')}
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      >
        <KpiCard
          label={t('report.revenueStructure.kpi.revenue')}
          value={formatCurrency(revenue, locale)}
          hint={`${formatNumber(visitCount, locale)} ${t('report.receipts')}`}
          icon={TrendingUp}
          accent="indigo"
        />
        <KpiCard
          label={t('report.revenueStructure.kpi.expenses')}
          value={formatCurrency(totalExpenses, locale)}
          hint={t('report.revenueStructure.kpi.expensesHint', {
            count: expenses.length,
          })}
          icon={Wallet}
          accent="amber"
        />
        <KpiCard
          label={t('report.revenueStructure.kpi.netProfit')}
          value={formatCurrency(grossProfit, locale)}
          hint={
            grossProfit >= 0
              ? t('report.revenueStructure.kpi.profitHint')
              : t('report.revenueStructure.kpi.lossHint')
          }
          icon={grossProfit >= 0 ? PiggyBank : TrendingDown}
          accent={grossProfit >= 0 ? 'violet' : 'amber'}
        />
        <KpiCard
          label={t('report.revenueStructure.kpi.margin')}
          value={formatPercent(margin, locale)}
          hint={t('report.revenueStructure.kpi.marginHint', {
            target: formatPercent(HEALTHY_MARGIN, locale),
          })}
          icon={ReceiptIcon}
          accent={margin >= HEALTHY_MARGIN ? 'sky' : margin >= 0 ? 'amber' : 'zinc'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CostMixCard
          rows={costMix}
          totalExpenses={totalExpenses}
          revenue={revenue}
          locale={locale}
          t={t}
        />
        <PnlCard
          revenue={revenue}
          totalExpenses={totalExpenses}
          grossProfit={grossProfit}
          rentShare={rentShare}
          doctorShare={doctorShare}
          locale={locale}
          t={t}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border p-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Lightbulb className="size-4" aria-hidden="true" />
            {t('report.revenueStructure.insights.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {insights.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              {t('report.revenueStructure.insights.empty')}
            </p>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex gap-3 px-5 py-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      insight.tone === 'good'
                        ? 'bg-emerald-soft text-emerald-ink'
                        : insight.tone === 'warn'
                          ? 'bg-amber-soft text-amber-ink'
                          : 'bg-rose-soft text-rose-ink',
                    )}
                  >
                    {insight.tone === 'good' ? '↑' : insight.tone === 'warn' ? '!' : '↓'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {insight.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CostMixCard({
  rows,
  totalExpenses,
  revenue,
  locale,
  t,
}: {
  rows: Array<[ExpenseCategory, number]>;
  totalExpenses: number;
  revenue: number;
  locale: 'en' | 'th';
  t: TFunction;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border p-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Wallet className="size-4" aria-hidden="true" />
          {t('report.revenueStructure.costMix.title')}
        </CardTitle>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCurrency(totalExpenses, locale)}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            {t('report.revenueStructure.costMix.empty')}
          </p>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {rows.map(([category, amount]) => {
              const accent = COST_ACCENT[category];
              const sharePct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              const revenuePct = revenue > 0 ? (amount / revenue) * 100 : 0;
              return (
                <li key={category} className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={cn('text-sm font-medium', accent.ink)}>
                      {t(`expense.category.${category}`)}
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(amount, locale)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(sharePct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t(`expense.category.${category}`)}
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'block h-full transition-[width] duration-200',
                          accent.bar,
                        )}
                        style={{ width: `${Math.max(2, Math.min(100, sharePct))}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      {sharePct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t('report.revenueStructure.costMix.shareOfRevenue', {
                      value: formatPercent(revenuePct / 100, locale),
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PnlCard({
  revenue,
  totalExpenses,
  grossProfit,
  rentShare,
  doctorShare,
  locale,
  t,
}: {
  revenue: number;
  totalExpenses: number;
  grossProfit: number;
  rentShare: number;
  doctorShare: number;
  locale: 'en' | 'th';
  t: TFunction;
}) {
  const max = Math.max(revenue, totalExpenses, 1);
  const revenueWidth = (revenue / max) * 100;
  const expensesWidth = (totalExpenses / max) * 100;
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="border-b border-border p-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <PiggyBank className="size-4" aria-hidden="true" />
          {t('report.revenueStructure.pnl.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <PnlRow
          label={t('report.revenueStructure.pnl.revenue')}
          value={formatCurrency(revenue, locale)}
          width={revenueWidth}
          tone="positive"
        />
        <PnlRow
          label={t('report.revenueStructure.pnl.expenses')}
          value={formatCurrency(totalExpenses, locale)}
          width={expensesWidth}
          tone="negative"
        />
        <div
          className={cn(
            'flex items-baseline justify-between rounded-lg border border-border p-3',
            grossProfit >= 0 ? 'bg-emerald-soft/50' : 'bg-rose-soft/50',
          )}
        >
          <span className="text-sm font-semibold text-foreground">
            {t('report.revenueStructure.pnl.netProfit')}
          </span>
          <span
            className={cn(
              'font-mono text-lg font-semibold tabular-nums',
              grossProfit >= 0 ? 'text-emerald-ink' : 'text-rose-ink',
            )}
          >
            {formatCurrency(grossProfit, locale)}
          </span>
        </div>
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('report.revenueStructure.pnl.benchmarks')}
          </p>
          <BenchmarkRow
            label={t('report.revenueStructure.pnl.rentShare')}
            actual={rentShare}
            target={RENT_BENCHMARK}
            locale={locale}
          />
          <BenchmarkRow
            label={t('report.revenueStructure.pnl.doctorShare')}
            actual={doctorShare}
            target={DOCTOR_BENCHMARK}
            locale={locale}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PnlRow({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: string;
  width: number;
  tone: 'positive' | 'negative';
}) {
  const fill = tone === 'positive' ? 'bg-emerald' : 'bg-rose';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <span
          aria-hidden="true"
          className={cn('block h-full transition-[width] duration-200', fill)}
          style={{ width: `${Math.max(2, Math.min(100, width))}%` }}
        />
      </div>
    </div>
  );
}

function BenchmarkRow({
  label,
  actual,
  target,
  locale,
}: {
  label: string;
  actual: number;
  target: number;
  locale: 'en' | 'th';
}) {
  const overTarget = actual > target;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 tabular-nums">
        <span
          className={cn(
            'font-mono font-semibold',
            overTarget ? 'text-amber-ink' : 'text-emerald-ink',
          )}
        >
          {formatPercent(actual, locale)}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{formatPercent(target, locale)}</span>
      </div>
    </div>
  );
}

function formatPercent(ratio: number, locale: 'en' | 'th'): string {
  const pct = Math.round(ratio * 1000) / 10;
  return `${formatNumber(pct, locale)}%`;
}
