/* eslint-disable security/detect-object-injection -- map keys are constant union literals (ExpenseCategory / Recurrence) */
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Banknote,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Wallet,
} from 'lucide-react';
import type {
  Expense,
  ExpenseCategory,
  ExpenseCreateInput,
  ExpenseRecurrence,
} from '@reinly/domain';
import { expensesInRange, summarizeExpenses } from '@reinly/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { monthsForLocale } from '@/lib/locale-months';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { useDevToolbar } from '@/store/dev-toolbar';
import { useExpenseStore, useExpenses } from '@/store/expense-store';

const CATEGORY_KEYS: ReadonlyArray<ExpenseCategory> = [
  'rent',
  'doctor_fee',
  'salary',
  'utilities',
  'supplies',
  'marketing',
  'equipment',
  'tax',
  'other',
];

const RECURRENCE_KEYS: ReadonlyArray<ExpenseRecurrence> = [
  'none',
  'weekly',
  'monthly',
  'yearly',
];

const CATEGORY_ACCENT: Record<ExpenseCategory, { bg: string; text: string; dot: string }> = {
  rent: { bg: 'bg-indigo-soft', text: 'text-indigo-ink', dot: 'bg-indigo' },
  doctor_fee: { bg: 'bg-sky-soft', text: 'text-sky-ink', dot: 'bg-sky' },
  salary: { bg: 'bg-emerald-soft', text: 'text-emerald-ink', dot: 'bg-emerald' },
  utilities: { bg: 'bg-violet-soft', text: 'text-violet-ink', dot: 'bg-violet' },
  supplies: { bg: 'bg-rose-soft', text: 'text-rose-ink', dot: 'bg-rose' },
  marketing: { bg: 'bg-amber-soft', text: 'text-amber-ink', dot: 'bg-amber' },
  equipment: { bg: 'bg-indigo-soft', text: 'text-indigo-ink', dot: 'bg-indigo' },
  tax: { bg: 'bg-rose-soft', text: 'text-rose-ink', dot: 'bg-rose' },
  other: { bg: 'bg-muted', text: 'text-foreground', dot: 'bg-foreground' },
};

export function ExpensesPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const expenses = useExpenses();
  const remove = useExpenseStore((s) => s.remove);

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [filter, setFilter] = useState<ExpenseCategory | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const monthOptions = useMemo(
    () => monthsForLocale(locale).map((m, idx) => ({ value: String(idx + 1), label: m })),
    [locale],
  );
  const yearOptions = useMemo(
    () => [year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) })),
    [year],
  );

  const monthly = useMemo(() => {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();
    return expensesInRange(expenses, start, end);
  }, [expenses, year, month]);

  const summary = useMemo(() => summarizeExpenses(monthly), [monthly]);

  const filtered = useMemo(() => {
    return monthly
      .filter((e) => (filter === 'all' ? true : e.category === filter))
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }, [monthly, filter]);

  const pagination = usePagination(filtered, 10);

  const topCategories = useMemo(() => {
    const entries = (Object.entries(summary.byCategory) as Array<
      [ExpenseCategory, number]
    >)
      .filter(([, total]) => total > 0)
      .sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 3);
  }, [summary]);

  return (
    <TenantGate>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.expenses')}
          accent="amber"
          title={t('expense.title')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
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
              <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                {t('expense.newExpense')}
              </Button>
            </div>
          }
        />

        <section
          aria-label={t('expense.title')}
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          <KpiTile
            label={t('expense.kpi.total')}
            value={formatCurrency(summary.total, locale)}
            icon={Wallet}
            accent="amber"
          />
          <KpiTile
            label={t('expense.kpi.recurring')}
            value={t('expense.kpi.recurringValue', { count: summary.recurringCount })}
            icon={Repeat}
            accent="indigo"
          />
          {topCategories.slice(0, 2).map(([cat, total]) => (
            <KpiTile
              key={cat}
              label={t(`expense.category.${cat}`)}
              value={formatCurrency(total, locale)}
              icon={Banknote}
              accent={cat === 'rent' ? 'indigo' : 'sky'}
            />
          ))}
          {topCategories.length < 2
            ? Array.from({ length: 2 - topCategories.length }).map((_, idx) => (
                <KpiTile
                  key={`empty-${idx}`}
                  label={t('expense.kpi.empty')}
                  value="—"
                  icon={Banknote}
                  accent="zinc"
                />
              ))
            : null}
        </section>

        <FilterPills filter={filter} setFilter={setFilter} t={t} />

        {filtered.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={
              monthly.length === 0
                ? t('expense.empty.list')
                : t('expense.empty.filter')
            }
          />
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">{t('expense.col.date')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('expense.col.category')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('expense.col.payee')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('expense.col.amount')}</th>
                      <th className="px-5 py-2.5 font-medium">{t('expense.col.recurrence')}</th>
                      <th className="px-5 py-2.5 font-medium text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagination.pageItems.map((e) => (
                      <ExpenseRow
                        key={e.id}
                        expense={e}
                        locale={locale}
                        t={t}
                        onEdit={() => setEditing(e)}
                        onDelete={() => setDeletingId(e.id)}
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
              <DialogTitle>{t('expense.newExpense')}</DialogTitle>
              <DialogDescription>{t('expense.newExpenseDescription')}</DialogDescription>
            </DialogHeader>
            <ExpenseForm
              onCancel={() => setCreateOpen(false)}
              onDone={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('expense.editExpense')}</DialogTitle>
              <DialogDescription>{editing?.payee ?? ''}</DialogDescription>
            </DialogHeader>
            {editing ? (
              <ExpenseForm
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
              <AlertDialogTitle>{t('expense.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('expense.deleteDescription')}
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
      </div>
    </TenantGate>
  );
}

/* -------------------------------------------------------------------------- */
/*  KPI tile + filter pills                                                   */
/* -------------------------------------------------------------------------- */

type KpiAccent = 'indigo' | 'sky' | 'amber' | 'zinc';

const KPI_BG: Record<KpiAccent, string> = {
  indigo: 'bg-indigo-soft text-indigo-ink',
  sky: 'bg-sky-soft text-sky-ink',
  amber: 'bg-amber-soft text-amber-ink',
  zinc: 'bg-muted text-foreground',
};

const KPI_DOT: Record<KpiAccent, string> = {
  indigo: 'bg-indigo',
  sky: 'bg-sky',
  amber: 'bg-amber',
  zinc: 'bg-foreground',
};

function KpiTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  accent: KpiAccent;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-4 shadow-card">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', KPI_DOT[accent])} />
        <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="truncate font-heading text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
          {value}
        </span>
        <span
          aria-hidden="true"
          className={cn('flex size-9 items-center justify-center rounded-lg', KPI_BG[accent])}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}

function FilterPills({
  filter,
  setFilter,
  t,
}: {
  filter: ExpenseCategory | 'all';
  setFilter: (f: ExpenseCategory | 'all') => void;
  t: TFunction;
}) {
  const items: Array<{ key: ExpenseCategory | 'all'; label: string }> = [
    { key: 'all', label: t('expense.filter.all') },
    ...CATEGORY_KEYS.map((c) => ({ key: c, label: t(`expense.category.${c}`) })),
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = filter === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border-amber bg-amber-soft text-amber-ink'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Row                                                                       */
/* -------------------------------------------------------------------------- */

function ExpenseRow({
  expense,
  locale,
  t,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  locale: 'en' | 'th';
  t: TFunction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const accent = CATEGORY_ACCENT[expense.category];
  return (
    <tr>
      <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
        {formatDate(expense.paidAt, locale)}
      </td>
      <td className="px-5 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            accent.bg,
            accent.text,
          )}
        >
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', accent.dot)} />
          {t(`expense.category.${expense.category}`)}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="text-sm font-medium text-foreground">{expense.payee}</div>
        {expense.description ? (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {expense.description}
          </div>
        ) : null}
      </td>
      <td className="px-5 py-3 font-mono text-sm font-semibold tabular-nums text-foreground">
        {formatCurrency(expense.amount, locale)}
      </td>
      <td className="px-5 py-3">
        {expense.recurrence === 'none' ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-0.5 text-[11px] font-medium text-indigo-ink">
            <Repeat className="size-3" aria-hidden="true" />
            {t(`expense.recurrence.${expense.recurrence}`)}
          </span>
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

interface ExpenseFormProps {
  initial?: Expense;
  onCancel: () => void;
  onDone: () => void;
}

function ExpenseForm({ initial, onCancel, onDone }: ExpenseFormProps) {
  const { t } = useTranslation();
  const tenantId = useDevToolbar((s) => s.tenantId);
  const branchId = useDevToolbar((s) => s.branchId);
  const create = useExpenseStore((s) => s.create);
  const update = useExpenseStore((s) => s.update);

  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? 'rent');
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  const [payee, setPayee] = useState(initial?.payee ?? '');
  const [paidAt, setPaidAt] = useState(toLocalDate(initial?.paidAt));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [recurrence, setRecurrence] = useState<ExpenseRecurrence>(
    initial?.recurrence ?? 'none',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!tenantId) {
      setError(t('expense.errors.tenantRequired'));
      return;
    }
    if (!payee.trim()) {
      setError(t('expense.errors.payeeRequired'));
      return;
    }
    if (amount <= 0) {
      setError(t('expense.errors.amountInvalid'));
      return;
    }
    if (!paidAt) {
      setError(t('expense.errors.dateRequired'));
      return;
    }

    const payload: ExpenseCreateInput = {
      branchId: initial?.branchId ?? branchId ?? null,
      category,
      amount,
      payee: payee.trim(),
      paidAt: `${paidAt}T00:00:00.000Z`,
      description: description.trim() || undefined,
      recurrence,
      notes: notes.trim() || undefined,
    };

    if (initial) update(initial.id, payload);
    else create(payload, tenantId);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="expense-category">{t('expense.col.category')}</Label>
          <Select
            id="expense-category"
            options={CATEGORY_KEYS.map((c) => ({
              value: c,
              label: t(`expense.category.${c}`),
            }))}
            value={category}
            onValueChange={(v) => setCategory(v as ExpenseCategory)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-amount">{t('expense.col.amount')}</Label>
          <Input
            id="expense-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-payee">{t('expense.col.payee')}</Label>
        <Input
          id="expense-payee"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="expense-date">{t('expense.col.date')}</Label>
          <Input
            id="expense-date"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-recurrence">{t('expense.col.recurrence')}</Label>
          <Select
            id="expense-recurrence"
            options={RECURRENCE_KEYS.map((r) => ({
              value: r,
              label: t(`expense.recurrence.${r}`),
            }))}
            value={recurrence}
            onValueChange={(v) => setRecurrence(v as ExpenseRecurrence)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-description">{t('expense.description')}</Label>
        <Input
          id="expense-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-notes">{t('expense.notes')}</Label>
        <Textarea
          id="expense-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
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

/** Slice the YYYY-MM-DD prefix from an ISO timestamp without tz drift. */
function toLocalDate(iso: string | undefined): string {
  if (!iso) return '';
  const match = /^\d{4}-\d{2}-\d{2}/.exec(iso);
  return match ? match[0] : '';
}
