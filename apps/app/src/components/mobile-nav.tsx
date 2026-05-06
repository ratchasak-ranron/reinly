import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ACCENT_CLASSES, NAV_GROUPS, NAV_ITEMS, type NavItem } from './nav-items';
import { useIsRouteActive } from './use-is-route-active';
import { BrandMark } from './brand-mark';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="touch-target md:hidden"
          aria-label={t('nav.menu')}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight text-foreground">
            <BrandMark size="sm" />
            {t('app.name')}
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col p-3" aria-label={t('nav.primary')}>
          {NAV_GROUPS.map(({ group, labelKey }, idx) => {
            const items = NAV_ITEMS.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className={cn(idx > 0 && 'mt-4')}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t(labelKey)}
                </p>
                <ul role="list" className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <li key={item.to}>
                      <MobileNavItem item={item} onNavigate={() => setOpen(false)} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileNavItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { t } = useTranslation();
  const active = useIsRouteActive(item);
  const Icon = item.icon;
  const accent = ACCENT_CLASSES[item.accent];
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'group flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? cn(accent.activeBg, accent.activeText)
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'size-[18px] shrink-0',
          active ? accent.text : 'text-muted-foreground group-hover:text-foreground',
        )}
        strokeWidth={active ? 2.25 : 1.75}
        aria-hidden="true"
      />
      <span className="truncate">{t(item.labelKey)}</span>
    </Link>
  );
}
