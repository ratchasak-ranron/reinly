import { cn } from '@/lib/utils';

export interface SegmentedTabOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface SegmentedTabsProps<TValue extends string> {
  /** Visible options. Order is preserved. */
  options: ReadonlyArray<SegmentedTabOption<TValue>>;
  /** Currently-selected value. */
  value: TValue;
  /** Fired when the user clicks a tab. */
  onChange: (next: TValue) => void;
  /** Accessible name for the tablist (e.g. "Status filter"). */
  ariaLabel: string;
  /** Optional className applied to the outer container. */
  className?: string;
  /** Visual variant — `pill` (rounded outer, filled active) or `underline`. */
  variant?: 'pill' | 'underline';
  /** When `pill`, tint the active tab in this section accent. Default 'primary'. */
  accent?: 'primary' | 'emerald' | 'violet' | 'rose' | 'amber' | 'sky';
}

const PILL_ACTIVE: Record<NonNullable<SegmentedTabsProps<string>['accent']>, string> = {
  primary: 'bg-primary text-primary-foreground',
  emerald: 'bg-emerald text-primary-foreground',
  violet: 'bg-violet text-primary-foreground',
  rose: 'bg-rose text-primary-foreground',
  amber: 'bg-amber text-primary-foreground',
  sky: 'bg-sky text-primary-foreground',
};

/**
 * Segmented tab strip — Dentalica-style toggle. Two variants:
 *   - `pill`    — rounded container, active tab filled in section accent.
 *                  Use for status filter rows + breakdown dimension toggles.
 *   - `underline` — hairline rule, active tab gets foreground rule + colour.
 *                   Use for tabs (Accepted / In Queue / Urgent / Archive).
 *
 * Generic over the value type so callers retain their union literals
 * without runtime narrowing.
 */
export function SegmentedTabs<TValue extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  variant = 'pill',
  accent = 'primary',
}: SegmentedTabsProps<TValue>) {
  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn('flex gap-6 border-b border-border', className)}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                '-mb-px cursor-pointer border-b-2 pb-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  /* pill variant */
  /* eslint-disable security/detect-object-injection -- accent is a constant union literal */
  const activeFill = PILL_ACTIVE[accent];
  /* eslint-enable security/detect-object-injection */
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap gap-1 rounded-full border border-border bg-card p-1 shadow-card',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? activeFill
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
