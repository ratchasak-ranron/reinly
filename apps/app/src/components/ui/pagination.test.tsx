import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/lib/i18n';
import { Pagination, pageRange, usePagination } from './pagination';
import { renderWithProviders } from '@/test/utils';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

/* -------------------------------------------------------------------------- */
/*  pageRange                                                                 */
/* -------------------------------------------------------------------------- */

describe('pageRange', () => {
  it('returns the full range when total <= 7', () => {
    expect(pageRange(1, 1)).toEqual([1]);
    expect(pageRange(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageRange(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('places ellipsis on the right when current is near the start', () => {
    expect(pageRange(1, 8)).toEqual([1, 2, 'ellipsis', 8]);
    expect(pageRange(2, 8)).toEqual([1, 2, 3, 'ellipsis', 8]);
  });

  it('places ellipsis on the left when current is near the end', () => {
    expect(pageRange(7, 8)).toEqual([1, 'ellipsis', 6, 7, 8]);
    expect(pageRange(8, 8)).toEqual([1, 'ellipsis', 7, 8]);
  });

  it('places ellipsis on both sides when current is in the middle', () => {
    expect(pageRange(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  });

  it('renders the missing page directly when only one page would be hidden', () => {
    // total=8, current=6 -> end=7, the gap between 7 and 8 is empty (no
    // ellipsis), and start=5 leaves exactly page 4 hidden between 1 and 5,
    // so page 4 should render directly instead of an ellipsis would.
    // Verify both edges with current=4 on a total of 9: start=3 means the
    // gap is exactly page 2 (one hidden page) so render 2 directly.
    expect(pageRange(4, 9)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 9]);
    // current=6 on total=9 -> end=7, gap between 7 and 9 is exactly page 8.
    expect(pageRange(6, 9)).toEqual([1, 'ellipsis', 5, 6, 7, 8, 9]);
  });
});

/* -------------------------------------------------------------------------- */
/*  usePagination                                                             */
/* -------------------------------------------------------------------------- */

describe('usePagination', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('slices the array into pages of size 10 by default', () => {
    const { result } = renderHook(() => usePagination(items));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.total).toBe(25);
    expect(result.current.from).toBe(1);
    expect(result.current.to).toBe(10);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('advances pageItems when setPage is called', () => {
    const { result } = renderHook(() => usePagination(items));
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);
    expect(result.current.from).toBe(11);
    expect(result.current.to).toBe(20);
    expect(result.current.pageItems).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('clamps the last page to a partial slice when total is not a multiple', () => {
    const { result } = renderHook(() => usePagination(items));
    act(() => result.current.setPage(3));
    expect(result.current.from).toBe(21);
    expect(result.current.to).toBe(25);
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25]);
  });

  it('returns an empty result and from=0 when items is empty', () => {
    const { result } = renderHook(() => usePagination([]));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.total).toBe(0);
    expect(result.current.from).toBe(0);
    expect(result.current.to).toBe(0);
    expect(result.current.pageItems).toEqual([]);
  });

  it('handles undefined input as zero items', () => {
    const { result } = renderHook(() => usePagination(undefined));
    expect(result.current.total).toBe(0);
    expect(result.current.pageItems).toEqual([]);
  });

  it('resets to page 1 synchronously when the data length changes', () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: number[] }) => usePagination(data),
      { initialProps: { data: items } },
    );
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    // Shrink the data set (e.g. user typed in a search filter). The hook
    // must report page 1 on the very next render — no double-render flash.
    rerender({ data: items.slice(0, 5) });
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5]);
  });

  it('resets to page 1 synchronously when pageSize changes', () => {
    const { result } = renderHook(() => usePagination(items));
    act(() => result.current.setPage(3));
    act(() => result.current.setPageSize(5));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(5);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5]);
  });

  it('clamps a requested page above totalPages to the last valid page', () => {
    const { result } = renderHook(() => usePagination(items));
    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(3);
    expect(result.current.to).toBe(25);
  });

  it('respects an initial pageSize override', () => {
    const { result } = renderHook(() => usePagination(items, 5));
    expect(result.current.pageSize).toBe(5);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.pageItems).toHaveLength(5);
  });
});

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                */
/* -------------------------------------------------------------------------- */

function defaultProps(overrides: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  return {
    page: 1,
    totalPages: 3,
    total: 25,
    from: 1,
    to: 10,
    pageSize: 10,
    onPageChange: vi.fn(),
    ...overrides,
  };
}

describe('Pagination', () => {
  it('renders nothing when total is 0', () => {
    const { container } = renderWithProviders(
      <Pagination {...defaultProps({ total: 0, totalPages: 1 })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the showing-of label and page buttons', () => {
    renderWithProviders(<Pagination {...defaultProps()} />);
    expect(screen.getByText(/Showing 1.*10.*of 25/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to page 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to page 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to page 3/i })).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    const { rerender } = renderWithProviders(<Pagination {...defaultProps({ page: 1 })} />);
    expect(screen.getByRole('button', { name: /Previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next page/i })).not.toBeDisabled();

    rerender(<Pagination {...defaultProps({ page: 3, from: 21, to: 25 })} />);
    expect(screen.getByRole('button', { name: /Previous page/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Next page/i })).toBeDisabled();
  });

  it('marks the active page with aria-current="page"', () => {
    renderWithProviders(<Pagination {...defaultProps({ page: 2, from: 11, to: 20 })} />);
    const active = screen.getByRole('button', { name: /Go to page 2/i });
    expect(active).toHaveAttribute('aria-current', 'page');
  });

  it('fires onPageChange when a page button is clicked', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Pagination {...defaultProps({ onPageChange })} />);
    await user.click(screen.getByRole('button', { name: /Go to page 2/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('fires onPageChange with page-1 when Previous is clicked', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Pagination {...defaultProps({ page: 2, from: 11, to: 20, onPageChange })} />);
    await user.click(screen.getByRole('button', { name: /Previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renders the page-size selector only when onPageSizeChange is provided', () => {
    const { rerender } = renderWithProviders(<Pagination {...defaultProps()} />);
    expect(screen.queryByLabelText(/Per page/i)).not.toBeInTheDocument();

    const onPageSizeChange = vi.fn();
    rerender(<Pagination {...defaultProps({ onPageSizeChange })} />);
    expect(screen.getByLabelText(/Per page/i)).toBeInTheDocument();
  });
});
