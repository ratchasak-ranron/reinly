import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, HelpCircle, Settings } from 'lucide-react';
import { ACCENT_CLASSES, NAV_GROUPS, NAV_ITEMS, type NavItem } from './nav-items';
import { useIsRouteActive } from './use-is-route-active';
import { BrandMark } from './brand-mark';
import { SIDEBAR_EXPANDED_KEY } from '@/lib/persist-keys';
import { cn } from '@/lib/utils';

/**
 * App sidebar — Dentalica-style rail. Renders a 240px expanded rail by
 * default (full labels) with a brand block on top, grouped primary
 * nav, and Help + Settings affordances at the bottom. The chevron
 * toggles a 64px icon-only rail. The toggle state persists per
 * browser via localStorage so a user's preferred density survives
 * reloads.
 */
function readPersistedExpanded(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function Sidebar() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<boolean>(readPersistedExpanded);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(expanded));
    } catch {
      // localStorage may be disabled (private mode quotas, browser flags).
      // Failing silently keeps the toggle working in-session.
    }
  }, [expanded]);

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
        <BrandMark size="md" />
        {expanded ? (
          <span className="truncate font-heading text-2xl font-semibold tracking-tight text-foreground">
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

      {/* Primary nav — items are bucketed into groups so the rail stays
          scannable as the catalog grows. Group headings render only in
          the expanded state; the collapsed rail uses a thin divider
          between groups instead. */}
      <nav
        className={cn('flex-1 overflow-y-auto', expanded ? 'px-3' : 'px-2')}
        aria-label={t('nav.primary')}
      >
        {NAV_GROUPS.map(({ group, labelKey }, idx) => {
          const items = NAV_ITEMS.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div
              key={group}
              className={cn(idx > 0 && (expanded ? 'mt-4' : 'mt-3 border-t border-border pt-3'))}
            >
              {expanded ? (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t(labelKey)}
                </p>
              ) : null}
              <ul role="list" className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <SidebarItem item={item} expanded={expanded} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
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
