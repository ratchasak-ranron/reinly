/* eslint-disable security/detect-object-injection -- status/accent are constant union literals */
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';

type Status = 'default' | 'warning' | 'destructive';
type Accent = 'indigo' | 'sky' | 'emerald' | 'violet' | 'amber' | 'rose' | 'zinc';

export interface KpiDelta {
  /** Numeric delta. Positive = up, negative = down. */
  value: number;
  /** Suffix label (e.g. "เดือนนี้", "vs last week"). */
  label: string;
  /** Whether positive movement is good. Defaults to true. */
  positiveIsGood?: boolean;
}

interface KpiTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: ReadonlyArray<number>;
  status?: Status;
  /** Section accent for the icon chip + dot. Status overrides accent. */
  accent?: Accent;
  /** Optional period-over-period delta indicator (Dentalica-style). */
  delta?: KpiDelta;
}

const STATUS_CHIP: Record<Status, string> = {
  default: 'bg-muted text-foreground',
  warning: 'bg-amber-soft text-amber-ink',
  destructive: 'bg-rose-soft text-rose-ink',
};

const STATUS_DOT: Record<Status, string> = {
  default: 'bg-foreground',
  warning: 'bg-amber',
  destructive: 'bg-rose',
};

const ACCENT_CHIP: Record<Accent, string> = {
  indigo: 'bg-indigo-soft text-indigo-ink',
  sky: 'bg-sky-soft text-sky-ink',
  emerald: 'bg-emerald-soft text-emerald-ink',
  violet: 'bg-violet-soft text-violet-ink',
  amber: 'bg-amber-soft text-amber-ink',
  rose: 'bg-rose-soft text-rose-ink',
  zinc: 'bg-muted text-foreground',
};

const ACCENT_DOT: Record<Accent, string> = {
  indigo: 'bg-indigo',
  sky: 'bg-sky',
  emerald: 'bg-emerald',
  violet: 'bg-violet',
  amber: 'bg-amber',
  rose: 'bg-rose',
  zinc: 'bg-foreground',
};

export function KpiTile({
  label,
  value,
  icon: Icon,
  description,
  trend,
  status = 'default',
  accent,
  delta,
}: KpiTileProps) {
  const { t } = useTranslation();
  const useAccent = status === 'default' && accent !== undefined;
  const chipClass = useAccent ? ACCENT_CHIP[accent] : STATUS_CHIP[status];
  const dotClass = useAccent ? ACCENT_DOT[accent] : STATUS_DOT[status];
  return (
    <Card className="relative overflow-hidden p-5 transition-shadow hover:shadow-hover">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-0 pb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', dotClass)} />
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </CardTitle>
        </div>
        <span
          aria-hidden="true"
          className={cn('flex size-9 items-center justify-center rounded-lg', chipClass)}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      </CardHeader>
      <CardContent className="space-y-2 p-0">
        <p className="font-heading text-3xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
        {/* Status is conveyed visually via dot + chip color. Surface the
            same signal to AT users so the badge is not colour-only. */}
        {status !== 'default' ? (
          <span className="sr-only">{t(`kpi.status.${status}`)}</span>
        ) : null}
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
        {delta ? <DeltaIndicator delta={delta} /> : null}
        {trend && trend.length >= 2 ? (
          <Sparkline data={trend} ariaLabel={`${label} trend`} variant={status} />
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Period-over-period delta line — "↑ +4 เดือนนี้" in emerald-ink when good,
 * rose-ink when bad. Matches the `+N In this Month` / `+16` indicators on
 * the Dentalica reference.
 */
export function DeltaIndicator({ delta }: { delta: KpiDelta }) {
  const positiveIsGood = delta.positiveIsGood ?? true;
  const positive = delta.value > 0;
  const negative = delta.value < 0;
  // "Good" colour when value moves in the right direction.
  const isGood = positive ? positiveIsGood : negative ? !positiveIsGood : false;
  const tone = delta.value === 0
    ? 'text-muted-foreground'
    : isGood
      ? 'text-emerald-ink'
      : 'text-rose-ink';
  const Arrow = positive ? TrendingUp : negative ? TrendingDown : null;
  const formatted = delta.value > 0
    ? `+${delta.value}`
    : delta.value < 0
      ? String(delta.value)
      : '0';
  return (
    <p className={cn('inline-flex items-center gap-1 text-[11px] font-medium', tone)}>
      {Arrow ? <Arrow className="size-3" aria-hidden="true" /> : null}
      <span className="tabular-nums">{formatted}</span>
      <span className="text-muted-foreground">· {delta.label}</span>
    </p>
  );
}
