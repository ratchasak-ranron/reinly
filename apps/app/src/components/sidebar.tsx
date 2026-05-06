import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NAV_ITEMS, ACCENT_CLASSES, type NavItem } from './nav-items';
import { useIsRouteActive } from './use-is-route-active';
import { cn } from '@/lib/utils';

/**
 * App sidebar — Dentalica-style: brand block (icon-square + wordmark) on
 * top, vertical icon-nav with section accents on the active row, collapse
 * toggle at the very bottom that switches between full (240px) and rail
 * (64px) widths. Collapsed mode hides labels and centres icons.
 *
 * Collapse state is local component state for now; a future iteration
 * could persist it next to the dev toolbar settings.
 */
export function Sidebar() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand block */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-5',
          collapsed ? 'justify-center px-2' : '',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card"
        >
          <span className="font-heading text-base font-bold">R</span>
        </span>
        {!collapsed ? (
          <span className="truncate font-heading text-lg font-semibold tracking-tight text-foreground">
            {t('app.name')}
          </span>
        ) : null}
      </div>

      {/* Nav list */}
      <nav
        className={cn('flex-1 space-y-0.5 pb-3', collapsed ? 'px-2' : 'px-3')}
        aria-label={t('nav.primary')}
      >
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        aria-pressed={collapsed}
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-12 cursor-pointer items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:bg-muted"
      >
        {collapsed ? (
          <ChevronRight className="size-4" aria-hidden="true" />
        ) : (
          <ChevronLeft className="size-4" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { t } = useTranslation();
  const active = useIsRouteActive(item);
  const Icon = item.icon;
  const accent = ACCENT_CLASSES[item.accent];
  const label = t(item.labelKey);
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group flex min-h-[40px] items-center gap-3 rounded-lg text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
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
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}
