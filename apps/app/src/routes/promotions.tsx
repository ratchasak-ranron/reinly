import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import type {
  Promotion,
  PromotionCreateInput,
  PromotionScope,
  PromotionType,
} from '@reinly/domain';
import { isPromotionActive } from '@reinly/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
import { formatCurrency, formatDate } from '@/lib/format';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { useDevToolbar } from '@/store/dev-toolbar';
import { usePromotionStore, usePromotions } from '@/store/promotion-store';
import { useProducts } from '@/store/product-store';

export function PromotionsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const promotions = usePromotions();
  const products = useProducts();
  const remove = usePromotionStore((s) => s.remove);
  const toggleActive = usePromotionStore((s) => s.toggleActive);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...promotions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [promotions],
  );
  const pagination = usePagination(sorted, 10);

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.promotions')}
          accent="amber"
          title={t('promotion.title')}
          actions={
            <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t('promotion.newPromotion')}
            </Button>
          }
        />

        {sorted.length === 0 ? (
          <EmptyState icon={Tag} title={t('promotion.empty')} />
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">{t('promotion.col.code')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('promotion.col.name')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('promotion.col.discount')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('promotion.col.scope')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('promotion.col.window')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('promotion.col.status')}</th>
                      <th className="px-5 py-2.5 font-medium text-right">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagination.pageItems.map((p) => (
                      <PromotionRow
                        key={p.id}
                        promo={p}
                        productCount={products.length}
                        locale={locale}
                        t={t}
                        onEdit={() => setEditing(p)}
                        onDelete={() => setDeletingId(p.id)}
                        onToggle={() => toggleActive(p.id)}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('promotion.newPromotion')}</DialogTitle>
              <DialogDescription>{t('promotion.newPromotionDescription')}</DialogDescription>
            </DialogHeader>
            <PromotionForm
              onCancel={() => setCreateOpen(false)}
              onDone={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('promotion.editPromotion')}</DialogTitle>
              <DialogDescription>{editing?.name ?? ''}</DialogDescription>
            </DialogHeader>
            {editing ? (
              <PromotionForm
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
              <AlertDialogTitle>{t('promotion.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('promotion.deleteDescription')}</AlertDialogDescription>
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

function PromotionRow({
  promo,
  productCount,
  locale,
  t,
  onEdit,
  onDelete,
  onToggle,
}: {
  promo: Promotion;
  productCount: number;
  locale: 'en' | 'th';
  t: TFunction;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const active = isPromotionActive(promo);
  const discountLabel =
    promo.type === 'percent'
      ? `${promo.value}%`
      : formatCurrency(promo.value, locale);
  const scopeLabel =
    promo.scope === 'all_products'
      ? t('promotion.scope.allProducts', { count: productCount })
      : t('promotion.scope.specific', { count: promo.productIds.length });
  const windowLabel = (() => {
    const parts: string[] = [];
    if (promo.startsAt) parts.push(formatDate(promo.startsAt, locale));
    if (promo.endsAt) parts.push(formatDate(promo.endsAt, locale));
    return parts.length === 0 ? t('promotion.alwaysOn') : parts.join(' → ');
  })();
  return (
    <tr>
      <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{promo.code}</td>
      <td className="px-5 py-3 text-sm font-medium text-foreground">{promo.name}</td>
      <td className="px-5 py-3 font-mono text-sm tabular-nums text-foreground">
        {discountLabel}
      </td>
      <td className="px-5 py-3 text-xs text-muted-foreground">{scopeLabel}</td>
      <td className="px-5 py-3 text-xs text-muted-foreground tabular-nums">{windowLabel}</td>
      <td className="px-5 py-3">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
            active
              ? 'bg-emerald-soft text-emerald-ink hover:bg-emerald-soft/80'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {active ? t('promotion.statusActive') : t('promotion.statusInactive')}
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

interface PromotionFormProps {
  initial?: Promotion;
  onCancel: () => void;
  onDone: () => void;
}

function PromotionForm({ initial, onCancel, onDone }: PromotionFormProps) {
  const { t } = useTranslation();
  const tenantId = useDevToolbar((s) => s.tenantId);
  const products = useProducts();
  const create = usePromotionStore((s) => s.create);
  const update = usePromotionStore((s) => s.update);

  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<PromotionType>(initial?.type ?? 'percent');
  const [value, setValue] = useState<number>(initial?.value ?? 10);
  const [scope, setScope] = useState<PromotionScope>(initial?.scope ?? 'all_products');
  const [productIds, setProductIds] = useState<string[]>(initial?.productIds ?? []);
  const [startsAt, setStartsAt] = useState<string>(toLocalDate(initial?.startsAt));
  const [endsAt, setEndsAt] = useState<string>(toLocalDate(initial?.endsAt));
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function toggleProduct(id: string) {
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!tenantId) {
      setError(t('promotion.errors.tenantRequired'));
      return;
    }
    if (!code.trim() || !name.trim()) {
      setError(t('promotion.errors.required'));
      return;
    }
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(code.trim())) {
      setError(t('promotion.errors.codeFormat'));
      return;
    }
    if (value < 0 || (type === 'percent' && value > 100)) {
      setError(t('promotion.errors.valueInvalid'));
      return;
    }
    if (scope === 'specific' && productIds.length === 0) {
      setError(t('promotion.errors.specificEmpty'));
      return;
    }

    const payload: PromotionCreateInput = {
      code: code.trim(),
      name: name.trim(),
      type,
      value,
      scope,
      productIds: scope === 'specific' ? productIds : [],
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      active,
    };

    if (initial) update(initial.id, payload);
    else create(payload, tenantId);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="promo-code">{t('promotion.col.code')}</Label>
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER10"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-name">{t('promotion.col.name')}</Label>
          <Input
            id="promo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="promo-type">{t('promotion.col.type')}</Label>
          <Select
            id="promo-type"
            value={type}
            onValueChange={(v) => setType(v as PromotionType)}
            options={[
              { value: 'percent', label: t('promotion.type.percent') },
              { value: 'amount', label: t('promotion.type.amount') },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-value">{t('promotion.col.discount')}</Label>
          <Input
            id="promo-value"
            type="number"
            inputMode="decimal"
            min={0}
            max={type === 'percent' ? 100 : undefined}
            step={type === 'percent' ? '1' : '0.01'}
            value={value}
            onChange={(e) => setValue(Number(e.target.value) || 0)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="promo-scope">{t('promotion.col.scope')}</Label>
        <Select
          id="promo-scope"
          value={scope}
          onValueChange={(v) => setScope(v as PromotionScope)}
          options={[
            { value: 'all_products', label: t('promotion.scope.allProductsLabel') },
            { value: 'specific', label: t('promotion.scope.specificLabel') },
          ]}
        />
      </div>

      {scope === 'specific' ? (
        <div className="space-y-2 rounded-card border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{t('promotion.specificHelp')}</p>
          {products.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('product.empty.list')}</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {products.map((p) => {
                const selected = productIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted',
                        selected ? 'bg-indigo-soft' : '',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleProduct(p.id)}
                      />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="promo-starts">{t('promotion.col.startsAt')}</Label>
          <Input
            id="promo-starts"
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-ends">{t('promotion.col.endsAt')}</Label>
          <Input
            id="promo-ends"
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span>{t('promotion.activeLabel')}</span>
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

function toLocalDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
