import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, HelpCircle, Settings } from 'lucide-react';
import { NAV_ITEMS, ACCENT_CLASSES, type NavItem } from './nav-items';
import { useIsRouteActive } from './use-is-route-active';
import { cn } from '@/lib/utils';

/**
 * App sidebar — Dentalica-style rail. Defaults to a 64px icon-only rail
 * (matches the reference's left rail) with a brand square on top, primary
 * nav icons in the middle, and Help + Settings affordances at the bottom.
 *
 * The chevron at the very bottom toggles to a 240px expanded mode that
 * shows labels. Toggle state is local — wire to the dev-toolbar store
 * later if persistence becomes useful.
 */
export function Sidebar() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
        expanded ? 'w-60' : 'w-16',
      )}
    >
      {/* Brand block */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-5',
          expanded ? 'px-4' : 'justify-center',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card"
        >
          <span className="font-heading text-base font-bold">R</span>
        </span>
        {expanded ? (
          <span className="truncate font-heading text-lg font-semibold tracking-tight text-foreground">
            {t('app.name')}
          </span>
        ) : null}
      </div>

      {/* Expand chevron — directly under the brand to mirror the reference. */}
      <div className={cn('px-3 pb-2', expanded ? 'flex justify-end' : 'flex justify-center')}>
        <button
          type="button"
          aria-label={expanded ? t('nav.collapse') : t('nav.expand')}
          aria-pressed={expanded}
          onClick={() => setExpanded((c) => !c)}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {expanded ? (
            <ChevronLeft className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Primary nav */}
      <nav
        className={cn('flex-1 space-y-0.5 overflow-y-auto', expanded ? 'px-3' : 'px-2')}
        aria-label={t('nav.primary')}
      >
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.to} item={item} expanded={expanded} />
        ))}
      </nav>

      {/* Bottom actions — Help + Settings, both inert until those features land. */}
      <div className={cn('space-y-0.5 pb-4 pt-2', expanded ? 'px-3' : 'px-2')}>
        <SidebarFooterAction
          icon={HelpCircle}
          label={t('nav.help')}
          expanded={expanded}
        />
        <SidebarFooterAction
          icon={Settings}
          label={t('nav.settings')}
          expanded={expanded}
        />
      </div>
    </aside>
  );
}

function SidebarItem({ item, expanded }: { item: NavItem; expanded: boolean }) {
  const { t } = useTranslation();
  const active = useIsRouteActive(item);
  const Icon = item.icon;
  const accent = ACCENT_CLASSES[item.accent];
  const label = t(item.labelKey);
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      title={!expanded ? label : undefined}
      className={cn(
        'group flex min-h-[40px] items-center rounded-lg text-sm font-medium transition-colors',
        expanded ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2',
        active
          ? cn(accent.activeBg, accent.activeText)
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-colors',
          active ? accent.text : 'text-muted-foreground group-hover:text-foreground',
        )}
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden="true"
      />
      {expanded ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

function SidebarFooterAction({
  icon: Icon,
  label,
  expanded,
}: {
  icon: typeof HelpCircle;
  label: string;
  expanded: boolean;
}) {
  return (
    <button
      type="button"
      title={!expanded ? label : undefined}
      className={cn(
        'group flex min-h-[40px] w-full cursor-pointer items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        expanded ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2',
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {expanded ? <span className="truncate">{label}</span> : null}
    </button>
  );
}
