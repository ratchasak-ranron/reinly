import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Layers,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  BundleItem,
  Product,
  ProductCategory,
  ProductCreateInput,
} from '@reinly/domain';
import { isBundle } from '@reinly/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useDebounce } from '@/lib/use-debounce';
import { useLocale } from '@/lib/use-locale';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useDevToolbar } from '@/store/dev-toolbar';
import { useProductStore, useProducts } from '@/store/product-store';

const CATEGORY_KEYS: ReadonlyArray<ProductCategory> = [
  'service',
  'consumable',
  'membership',
  'aesthetic',
  'dental',
];

export function ProductsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const tenantId = useDevToolbar((s) => s.tenantId);
  const products = useProducts();
  const remove = useProductStore((s) => s.remove);

  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const debounced = useDebounce(query, 200);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return products
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, debounced]);

  const pagination = usePagination(filtered, 10);
  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.products')}
          accent="indigo"
          title={t('product.title')}
          actions={
            <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t('product.newProduct')}
            </Button>
          }
        />

        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('product.searchPlaceholder')}
            aria-label={t('product.searchPlaceholder')}
            className="h-11 w-full rounded-input border border-input bg-card pl-9 pr-3 text-sm shadow-card placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={
              products.length === 0 ? t('product.empty.list') : t('product.empty.filter')
            }
          />
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">{t('product.col.sku')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('product.col.name')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('product.col.category')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('product.col.price')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('product.col.bundle')}</th>
                      <th className="px-5 py-2.5 font-medium text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagination.pageItems.map((p) => (
                      <ProductRow
                        key={p.id}
                        product={p}
                        locale={locale}
                        t={t}
                        productsById={productsById}
                        onEdit={() => setEditing(p)}
                        onDelete={() => setDeletingId(p.id)}
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
              <DialogTitle>{t('product.newProduct')}</DialogTitle>
              <DialogDescription>{t('product.newProductDescription')}</DialogDescription>
            </DialogHeader>
            <ProductForm
              products={products}
              onCancel={() => setCreateOpen(false)}
              onDone={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('product.editProduct')}</DialogTitle>
              <DialogDescription>{editing?.name ?? ''}</DialogDescription>
            </DialogHeader>
            {editing ? (
              <ProductForm
                products={products}
                initial={editing}
                onCancel={() => setEditing(null)}
                onDone={() => setEditing(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deletingId}
          onOpenChange={(o) => !o && setDeletingId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('product.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('product.deleteDescription')}
              </AlertDialogDescription>
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

        {!tenantId ? null : null}
      </div>
    </TenantGate>
  );
}

/* -------------------------------------------------------------------------- */
/*  Row                                                                       */
/* -------------------------------------------------------------------------- */

function ProductRow({
  product,
  locale,
  t,
  productsById,
  onEdit,
  onDelete,
}: {
  product: Product;
  locale: 'en' | 'th';
  t: TFunction;
  productsById: Map<string, Product>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const bundle = isBundle(product);
  const childSum = bundle
    ? product.bundleItems.reduce((sum, item) => {
        const child = productsById.get(item.productId);
        return sum + (child ? child.price * item.quantity : 0);
      }, 0)
    : 0;
  const savings = bundle ? Math.max(0, childSum - product.price) : 0;
  return (
    <tr>
      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{product.sku}</td>
      <td className="px-5 py-3">
        <div className="text-sm font-medium text-foreground">{product.name}</div>
        {product.description ? (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {product.description}
          </div>
        ) : null}
      </td>
      <td className="px-5 py-3 text-xs uppercase tracking-wide text-muted-foreground">
        {t(`product.category.${product.category}`)}
      </td>
      <td className="px-5 py-3 font-mono text-sm font-semibold tabular-nums">
        {formatCurrency(product.price, locale)}
      </td>
      <td className="px-5 py-3">
        {bundle ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-0.5 text-[11px] font-medium text-indigo-ink">
              <Layers className="size-3" aria-hidden="true" />
              {t('product.bundleCount', { count: product.bundleItems.length })}
            </span>
            {savings > 0 ? (
              <span className="text-[11px] tabular-nums text-emerald-ink">
                -{formatCurrency(savings, locale)}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
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

interface ProductFormProps {
  products: Product[];
  initial?: Product;
  onCancel: () => void;
  onDone: () => void;
}

function ProductForm({ products, initial, onCancel, onDone }: ProductFormProps) {
  const { t } = useTranslation();
  const tenantId = useDevToolbar((s) => s.tenantId);
  const create = useProductStore((s) => s.create);
  const update = useProductStore((s) => s.update);

  const [sku, setSku] = useState(initial?.sku ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? 'service');
  const [price, setPrice] = useState<number>(initial?.price ?? 0);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [bundleItems, setBundleItems] = useState<BundleItem[]>(initial?.bundleItems ?? []);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(
    () => products.filter((p) => p.id !== initial?.id && p.bundleItems.length === 0),
    [products, initial?.id],
  );

  function addItem() {
    const first = candidates.find((p) => !bundleItems.some((b) => b.productId === p.id));
    if (!first) return;
    setBundleItems([...bundleItems, { productId: first.id, quantity: 1 }]);
  }

  function updateItem(idx: number, patch: Partial<BundleItem>) {
    setBundleItems(
      bundleItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }

  function removeItem(idx: number) {
    setBundleItems(bundleItems.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!tenantId) {
      setError(t('product.errors.tenantRequired'));
      return;
    }
    if (!sku.trim() || !name.trim()) {
      setError(t('product.errors.required'));
      return;
    }
    if (price < 0) {
      setError(t('product.errors.priceInvalid'));
      return;
    }

    const payload: ProductCreateInput = {
      sku: sku.trim(),
      name: name.trim(),
      category,
      price,
      description: description.trim() || undefined,
      bundleItems,
      active: initial?.active ?? true,
    };

    if (initial) {
      update(initial.id, payload);
    } else {
      create(payload, tenantId);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="product-sku">{t('product.col.sku')}</Label>
          <Input
            id="product-sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product-category">{t('product.col.category')}</Label>
          <Select
            id="product-category"
            options={CATEGORY_KEYS.map((c) => ({
              value: c,
              label: t(`product.category.${c}`),
            }))}
            value={category}
            onValueChange={(v) => setCategory(v as ProductCategory)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-name">{t('product.col.name')}</Label>
        <Input
          id="product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-price">{t('product.col.price')}</Label>
        <Input
          id="product-price"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value) || 0)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-desc">{t('product.description')}</Label>
        <Textarea
          id="product-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2 rounded-card border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              {t('product.bundle.title')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('product.bundle.description')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={candidates.length === bundleItems.length}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('product.bundle.addItem')}
          </Button>
        </div>

        {bundleItems.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">{t('product.bundle.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {bundleItems.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <Select
                  options={candidates.map((p) => ({ value: p.id, label: p.name }))}
                  value={item.productId}
                  onValueChange={(v) => updateItem(idx, { productId: v })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-20"
                />
                <button
                  type="button"
                  aria-label={t('common.delete')}
                  onClick={() => removeItem(idx)}
                  className={cn(
                    'inline-flex size-9 cursor-pointer items-center justify-center rounded-md',
                    'text-rose-ink transition-colors hover:bg-rose-soft focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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

/** Loading skeleton — exposed for route-level Suspense. */
export function ProductsPageSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-72" />
    </div>
  );
}
