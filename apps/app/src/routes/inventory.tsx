/* eslint-disable security/detect-object-injection -- map keys are constant union literals (status / accent enum) */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  AlertTriangle,
  Boxes,
  Package,
  PackageX,
  Plus,
  Search,
} from 'lucide-react';
import { isLowStock, type InventoryItem } from '@reinly/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormError } from '@/components/ui/form-feedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useDevToolbar } from '@/store/dev-toolbar';
import { MovementForm, useInventoryItems } from '@/features/inventory';
import { PageHeader } from '@/components/page-header';
import { TenantGate } from '@/components/tenant-gate';
import { useDebounce } from '@/lib/use-debounce';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'low' | 'out' | 'ok';
type StockStatus = 'ok' | 'low' | 'out';

function statusOf(item: InventoryItem): StockStatus {
  if (item.currentStock <= 0) return 'out';
  if (isLowStock(item)) return 'low';
  return 'ok';
}

export function InventoryPage() {
  const { t } = useTranslation();
  const branchId = useDevToolbar((s) => s.branchId);
  const { data, isLoading, isError, error } = useInventoryItems(branchId);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const debounced = useDebounce(query, 200);

  const items = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    const lowCount = items.filter((i) => statusOf(i) === 'low').length;
    const outCount = items.filter((i) => statusOf(i) === 'out').length;
    const totalUnits = items.reduce((sum, i) => sum + i.currentStock, 0);
    return {
      total: items.length,
      low: lowCount,
      out: outCount,
      units: totalUnits,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return items
      .filter((i) => {
        if (filter === 'all') return true;
        return statusOf(i) === filter;
      })
      .filter((i) => {
        if (!q) return true;
        return i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        // Out > Low > OK so attention items surface to the top.
        const r = STATUS_RANK[statusOf(a)] - STATUS_RANK[statusOf(b)];
        if (r !== 0) return r;
        return a.name.localeCompare(b.name);
      });
  }, [items, debounced, filter]);

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.inventory')}
          accent="rose"
          title={t('inventory.title')}
          actions={
            <Button className="cursor-pointer">
              <Plus className="size-4" aria-hidden="true" />
              {t('inventory.newItem')}
            </Button>
          }
        />

        <section
          aria-label={t('inventory.title')}
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          <StatTile
            label={t('inventory.stats.totalItems')}
            value={stats.total}
            icon={Boxes}
            accent="rose"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <StatTile
            label={t('inventory.stats.lowStock')}
            value={stats.low}
            icon={AlertTriangle}
            accent="amber"
            active={filter === 'low'}
            onClick={() => setFilter('low')}
          />
          <StatTile
            label={t('inventory.stats.outOfStock')}
            value={stats.out}
            icon={PackageX}
            accent="rose-strong"
            active={filter === 'out'}
            onClick={() => setFilter('out')}
          />
          <StatTile
            label={t('inventory.stats.units')}
            value={stats.units}
            icon={Package}
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
              placeholder={t('inventory.searchPlaceholder')}
              aria-label={t('inventory.searchPlaceholder')}
              className="h-11 w-full rounded-input border border-input bg-card pl-9 pr-3 text-sm shadow-card placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <FilterPills filter={filter} setFilter={setFilter} t={t} />

        {isError ? (
          <FormError className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            {`${t('common.error')}: ${error.message}`}
          </FormError>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t(items.length === 0 ? 'inventory.empty.list' : 'inventory.empty.filter')}
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <ul role="list" className="divide-y divide-border">
              {filtered.map((it) => (
                <li key={it.id}>
                  <ItemRow
                    item={it}
                    onSelect={() => setSelectedItem(it)}
                    t={t}
                  />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Dialog
          open={!!selectedItem}
          onOpenChange={(open) => {
            if (!open) setSelectedItem(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('inventory.newMovement')}</DialogTitle>
              <DialogDescription>{selectedItem ? selectedItem.name : ''}</DialogDescription>
            </DialogHeader>
            {selectedItem ? (
              <MovementForm
                item={selectedItem}
                onCancel={() => setSelectedItem(null)}
                onDone={() => setSelectedItem(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </TenantGate>
  );
}

const STATUS_RANK: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 };

/* -------------------------------------------------------------------------- */
/*  StatTile                                                                  */
/* -------------------------------------------------------------------------- */

type Accent = 'rose' | 'amber' | 'rose-strong' | 'zinc';

const STAT_BG: Record<Accent, string> = {
  rose: 'bg-rose-soft text-rose-ink',
  amber: 'bg-amber-soft text-amber-ink',
  'rose-strong': 'bg-destructive/10 text-destructive',
  zinc: 'bg-muted text-foreground',
};

const STAT_DOT: Record<Accent, string> = {
  rose: 'bg-rose',
  amber: 'bg-amber',
  'rose-strong': 'bg-destructive',
  zinc: 'bg-foreground',
};

const STAT_RING: Record<Accent, string> = {
  rose: 'ring-rose',
  amber: 'ring-amber',
  'rose-strong': 'ring-destructive',
  zinc: 'ring-foreground',
};

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Package;
  accent: Accent;
  active?: boolean;
  onClick?: () => void;
}) {
  const interactive = onClick !== undefined;
  const Comp = interactive ? 'button' : 'div';
  return (
    <Comp
      type={interactive ? 'button' : undefined}
      aria-pressed={interactive ? active : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-3 rounded-card border bg-card p-4 text-left shadow-card transition-all',
        interactive
          ? 'cursor-pointer hover:shadow-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          : '',
        active ? cn('ring-2 ring-offset-1', STAT_RING[accent]) : 'border-border',
      )}
    >
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
    </Comp>
  );
}

/* -------------------------------------------------------------------------- */
/*  FilterPills                                                               */
/* -------------------------------------------------------------------------- */

const FILTER_KEYS: Array<{ key: StatusFilter; labelKey: string }> = [
  { key: 'all', labelKey: 'inventory.filter.all' },
  { key: 'out', labelKey: 'inventory.filter.out' },
  { key: 'low', labelKey: 'inventory.filter.low' },
  { key: 'ok', labelKey: 'inventory.filter.ok' },
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
      accent="rose"
      value={filter}
      onChange={setFilter}
      options={FILTER_KEYS.map((f) => ({ value: f.key, label: t(f.labelKey) }))}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  ItemRow                                                                   */
/* -------------------------------------------------------------------------- */

const STATUS_PILL: Record<StockStatus, string> = {
  ok: 'bg-emerald-soft text-emerald-ink',
  low: 'bg-amber-soft text-amber-ink',
  out: 'bg-destructive/10 text-destructive',
};

const STOCK_BAR_FILL: Record<StockStatus, string> = {
  ok: 'bg-emerald',
  low: 'bg-amber',
  out: 'bg-destructive',
};

const STOCK_CHIP_BG: Record<StockStatus, string> = {
  ok: 'bg-emerald-soft text-emerald-ink',
  low: 'bg-amber-soft text-amber-ink',
  out: 'bg-destructive/10 text-destructive',
};

function ItemRow({
  item,
  onSelect,
  t,
}: {
  item: InventoryItem;
  onSelect: () => void;
  t: TFunction;
}) {
  const status = statusOf(item);
  // Visual scale: cap at 2× minStock so a healthy stock doesn't squash the
  // bar. Items with no minStock fall back to a reasonable max of 100.
  const denom = Math.max(item.minStock * 2, 1);
  const percent = Math.min(100, Math.max(0, Math.round((item.currentStock / denom) * 100)));
  const ariaLabel = `${item.name}, ${item.currentStock} ${item.unit}, ${t(`inventory.status.${status}`)}`;
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
          STOCK_CHIP_BG[status],
        )}
      >
        <Package className="size-[18px]" strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            · {item.sku}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={item.name}
          >
            <span
              aria-hidden="true"
              className={cn(
                'block h-full transition-[width] duration-200',
                STOCK_BAR_FILL[status],
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {item.currentStock}
            <span className="text-muted-foreground"> / {item.minStock}</span>
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
          <span>{item.unit}</span>
          <span className="hidden sm:inline">· {item.sku}</span>
        </div>
      </div>

      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
          STATUS_PILL[status],
        )}
      >
        {t(`inventory.status.${status}`)}
      </span>
    </button>
  );
}
