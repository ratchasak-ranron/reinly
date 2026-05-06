import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Building2,
  Building,
  Languages,
  LogOut,
  Search,
} from 'lucide-react';
import { getBranches, getTenants, getUsers } from '@reinly/mock-server';
import type { Id } from '@reinly/domain';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDevToolbar } from '@/store/dev-toolbar';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './breadcrumbs';
import { MobileNav } from './mobile-nav';
import { TopbarSearch } from './topbar-search';

interface TopBarProps {
  /** Kept for API compatibility but no longer rendered — the breadcrumb
   *  trail replaces the static title. */
  title?: string;
}

/**
 * Top bar — Dentalica-inspired clinic theme. Renders a global search input
 * (placeholder for command-K), a notification bell with an unread dot, a
 * language toggle, and a user-profile chip showing the impersonated user
 * from the dev toolbar.
 *
 * Search is a passive placeholder for now (no command palette wired up).
 * Bell is decorative; the unread indicator is a static red dot until the
 * notification feature lands.
 */
export function TopBar(_props: TopBarProps) {
  const { i18n, t } = useTranslation();
  const isThai = i18n.language === 'th';
  const nextLabel = isThai ? 'English' : 'ภาษาไทย';

  const userId = useDevToolbar((s) => s.userId);
  const user = useMemo(() => {
    if (!userId) return null;
    return getUsers().find((u) => u.id === userId) ?? null;
  }, [userId]);

  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

  function toggleLanguage(): void {
    void i18n.changeLanguage(isThai ? 'en' : 'th');
  }

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-3 md:px-6">
      {/* Left: mobile nav + breadcrumb chain. Breadcrumb truncates instead
          of pushing the search/profile cluster off-screen. */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MobileNav />
        <Breadcrumbs />
      </div>

      {/* Search — debounced patient lookup. Collapses to icon-only below
          lg so the breadcrumb keeps room. The icon opens a sheet hosting
          the same search component for mobile. */}
      <div className="hidden max-w-sm flex-1 lg:block">
        <TopbarSearch variant="inline" />
      </div>
      <button
        type="button"
        aria-label={t('common.search')}
        onClick={() => setSearchSheetOpen(true)}
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
      >
        <Search className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      <Sheet open={searchSheetOpen} onOpenChange={setSearchSheetOpen}>
        <SheetContent side="top" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('topbar.searchPlaceholder')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('topbar.searchResults')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <TopbarSearch
              variant="panel"
              autoFocus
              onAfterSelect={() => setSearchSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Notification bell — static red dot until the feature ships. */}
        <button
          type="button"
          aria-label={t('common.notifications')}
          className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bell className="size-5" strokeWidth={1.75} aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-destructive ring-2 ring-card"
          />
        </button>

        {/* Language toggle. Action-style button per a11y guidance. */}
        <Button
          variant="ghost"
          onClick={toggleLanguage}
          aria-label={t('topbar.switchTo', { lang: nextLabel })}
          className="touch-target hidden md:inline-flex"
        >
          <Languages className="size-4" aria-hidden="true" />
          <span className="text-xs font-medium">{nextLabel}</span>
        </Button>

        {/* Divider */}
        <span aria-hidden="true" className="hidden h-8 w-px bg-border md:block" />

        {/* User-profile chip */}
        <UserChip name={user?.name ?? '—'} role={user?.role ?? null} t={t} />
      </div>
    </header>
  );
}

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '—') return '·';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function UserChip({
  name,
  role,
  t,
}: {
  name: string;
  role: string | null;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const [open, setOpen] = useState(false);
  const tenantId = useDevToolbar((s) => s.tenantId);
  const branchId = useDevToolbar((s) => s.branchId);
  const setTenant = useDevToolbar((s) => s.setTenant);
  const setBranch = useDevToolbar((s) => s.setBranch);
  const signOut = useDevToolbar((s) => s.signOut);
  const roleLabel = role ? t(`role.${role}`, { defaultValue: role }) : null;

  const tenants = useMemo(() => getTenants(), []);
  const allBranches = useMemo(() => getBranches(), []);
  const branchesForTenant = useMemo(
    () => allBranches.filter((b) => b.tenantId === tenantId),
    [allBranches, tenantId],
  );
  const currentTenant = tenants.find((c) => c.id === tenantId) ?? null;
  const currentBranch = allBranches.find((b) => b.id === branchId) ?? null;

  function handleTenantChange(nextTenantId: Id) {
    setTenant(nextTenantId);
    const firstBranch = allBranches.find((b) => b.tenantId === nextTenantId);
    if (firstBranch) setBranch(firstBranch.id);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => {
          // Close when focus leaves the chip + its menu.
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        className={cn(
          'inline-flex cursor-pointer items-center gap-2.5 rounded-full pl-1 pr-3 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
        >
          {initialsOf(name)}
        </span>
        <span className="hidden flex-col text-left leading-tight md:flex">
          <span className="truncate text-xs font-medium text-foreground">{name}</span>
          {currentTenant && currentBranch ? (
            <span className="truncate text-[10px] text-muted-foreground">
              {currentTenant.name} · {currentBranch.name}
            </span>
          ) : roleLabel ? (
            <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {roleLabel}
            </span>
          ) : null}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={name}
          className="absolute right-0 top-[calc(100%+0.25rem)] z-40 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-popover"
        >
          <div className="border-b border-border px-3 py-3">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            {roleLabel ? (
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {roleLabel}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 px-3 py-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Building className="size-3" aria-hidden="true" />
                {t('topbar.tenant')}
              </span>
              <select
                value={tenantId ?? ''}
                onChange={(e) => handleTenantChange(e.target.value as Id)}
                className="h-9 w-full cursor-pointer rounded-md border border-input bg-card px-2 text-sm shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={t('topbar.tenant')}
              >
                {tenants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Building2 className="size-3" aria-hidden="true" />
                {t('topbar.branch')}
              </span>
              <select
                value={branchId ?? ''}
                onChange={(e) => setBranch(e.target.value as Id)}
                disabled={branchesForTenant.length === 0}
                className="h-9 w-full cursor-pointer rounded-md border border-input bg-card px-2 text-sm shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t('topbar.branch')}
              >
                {branchesForTenant.length === 0 ? (
                  <option value="">{t('topbar.noBranches')}</option>
                ) : (
                  branchesForTenant.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.city ? ` · ${b.city}` : ''}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <div className="border-t border-border">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="size-4 text-muted-foreground" aria-hidden="true" />
              {t('login.signOut')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
