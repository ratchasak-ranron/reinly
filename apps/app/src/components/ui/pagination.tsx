import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_PAGE_SIZE = 10;

export interface UsePaginationResult<T> {
  pageItems: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
}

/**
 * Client-side pagination over an in-memory array.
 *
 * Resets to page 1 whenever the input length or pageSize changes so the
 * caller never has to manage that edge case. The reset is performed
 * during render via the React-recommended "adjust state on prop change"
 * pattern, so callers never observe a stale `page` value (no double-
 * render flash).
 */
export function usePagination<T>(
  items: readonly T[] | undefined,
  initialPageSize: number = DEFAULT_PAGE_SIZE,
): UsePaginationResult<T> {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [page, setPage] = useState(1);
  const [prevTotal, setPrevTotal] = useState(total);
  const [prevPageSize, setPrevPageSize] = useState(pageSize);

  if (prevTotal !== total || prevPageSize !== pageSize) {
    setPrevTotal(total);
    setPrevPageSize(pageSize);
    setPage(1);
  }

  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    if (!items) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return {
    pageItems,
    page: safePage,
    pageSize,
    totalPages,
    total,
    from,
    to,
    setPage,
    setPageSize,
  };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Pagination controls — page numbers (with ellipsis), prev/next, and an
 * optional page-size selector. Designed to sit beneath a list/table.
 */
export function Pagination({
  page,
  totalPages,
  total,
  from,
  to,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
}: PaginationProps) {
  const { t } = useTranslation();

  if (total === 0) return null;

  const pages = pageRange(page, totalPages);

  return (
    <nav
      aria-label={t('pagination.label')}
      className={cn(
        'flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row',
        className,
      )}
    >
      <div className="text-xs text-muted-foreground tabular-nums">
        {t('pagination.showing', { from, to, total })}
      </div>

      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <label className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span>{t('pagination.perPage')}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 cursor-pointer rounded-input border border-input bg-card px-2 text-sm shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t('pagination.perPage')}
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <ul className="flex items-center gap-1">
          <li>
            <PageButton
              aria-label={t('pagination.previous')}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </PageButton>
          </li>
          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <li
                key={`e-${i}`}
                aria-hidden="true"
                className="px-1 text-xs text-muted-foreground"
              >
                …
              </li>
            ) : (
              <li key={p}>
                <PageButton
                  aria-label={t('pagination.goToPage', { page: p })}
                  aria-current={p === page ? 'page' : undefined}
                  active={p === page}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </PageButton>
              </li>
            ),
          )}
          <li>
            <PageButton
              aria-label={t('pagination.next')}
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </PageButton>
          </li>
        </ul>
      </div>
    </nav>
  );
}

interface PageButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

function PageButton({ active, className, children, disabled, ...rest }: PageButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 text-sm font-medium tabular-nums shadow-card transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-card',
        active && 'border-primary bg-primary text-primary-foreground hover:bg-primary',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Build the visible page sequence with ellipses.
 *
 * Always shows first + last page and the current page +/- 1 neighbor.
 * Where exactly one page would be hidden, render that page directly
 * instead of an ellipsis — an ellipsis must represent at least two
 * skipped pages.
 */
export function pageRange(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const result: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start === 3) {
    result.push(2);
  } else if (start > 3) {
    result.push('ellipsis');
  }

  for (let p = start; p <= end; p++) result.push(p);

  if (end === total - 2) {
    result.push(total - 1);
  } else if (end < total - 2) {
    result.push('ellipsis');
  }

  result.push(total);

  return result;
}
