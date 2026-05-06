import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, LogIn } from 'lucide-react';
import { getBranches, getTenants, getUsers } from '@reinly/mock-server';
import type { Id } from '@reinly/domain';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDevToolbar } from '@/store/dev-toolbar';
import { cn } from '@/lib/utils';

const MOCKING_ENABLED = import.meta.env.VITE_ENABLE_MOCKS === 'true';

/**
 * Mocking-mode login. Operator picks clinic + branch + user from the
 * seeded fixtures, hits sign-in, and the dev-toolbar store records the
 * scope plus an `authedAt` timestamp. The root layout uses that flag to
 * gate access to the rest of the app.
 *
 * When mocks are off this still renders, but the form is replaced by a
 * stub message that points at the real-auth path (to be wired up in a
 * later phase). The full-screen layout is shared either way so the
 * theming stays consistent.
 */
export function LoginPage() {
  const { t, i18n } = useTranslation();
  const isThai = i18n.language === 'th';

  // Pre-fill from last-known dev-toolbar selection if any. Lets a returning
  // user sign back in with a single click.
  const lastTenant = useDevToolbar((s) => s.tenantId);
  const lastBranch = useDevToolbar((s) => s.branchId);
  const lastUser = useDevToolbar((s) => s.userId);
  const signIn = useDevToolbar((s) => s.signIn);

  const tenants = useMemo(() => getTenants(), []);
  const [tenantId, setTenantId] = useState<Id | ''>(() => lastTenant ?? tenants[0]?.id ?? '');

  const branches = useMemo(
    () => getBranches().filter((b) => b.tenantId === tenantId),
    [tenantId],
  );
  const users = useMemo(
    () => getUsers().filter((u) => u.tenantId === tenantId),
    [tenantId],
  );
  const [branchId, setBranchId] = useState<Id | ''>(() =>
    lastBranch && lastTenant === tenantId ? lastBranch : (branches[0]?.id ?? ''),
  );
  const [userId, setUserId] = useState<Id | ''>(() =>
    lastUser && lastTenant === tenantId ? lastUser : (users[0]?.id ?? ''),
  );

  // When tenant changes, snap branch + user to the first child of the new
  // scope so the form never shows a stale "—" state.
  useEffect(() => {
    if (!tenantId) return;
    const firstBranch = getBranches().find((b) => b.tenantId === tenantId);
    const firstUser = getUsers().find((u) => u.tenantId === tenantId);
    if (firstBranch && !branches.some((b) => b.id === branchId)) {
      setBranchId(firstBranch.id);
    }
    if (firstUser && !users.some((u) => u.id === userId)) {
      setUserId(firstUser.id);
    }
  }, [tenantId, branches, users, branchId, userId]);

  const tenantOptions: SelectOption[] = tenants.map((tn) => ({
    value: tn.id,
    label: tn.name,
  }));
  const branchOptions: SelectOption[] = branches.map((b) => ({
    value: b.id,
    label: b.city ? `${b.name} · ${b.city}` : b.name,
  }));
  const userOptions: SelectOption[] = users.map((u) => ({
    value: u.id,
    label: `${u.name} · ${t(`role.${u.role}`, { defaultValue: u.role })}`,
  }));

  const canSubmit = MOCKING_ENABLED && !!tenantId && !!branchId && !!userId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    signIn({
      tenantId: tenantId as Id,
      branchId: branchId as Id,
      userId: userId as Id,
    });
  }

  function toggleLanguage(): void {
    void i18n.changeLanguage(isThai ? 'en' : 'th');
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      {/* Subtle radial glow behind the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.10)_0%,transparent_70%)]"
      />

      {/* Lang toggle top-right */}
      <button
        type="button"
        onClick={toggleLanguage}
        aria-label={t('topbar.switchTo', { lang: isThai ? 'English' : 'ภาษาไทย' })}
        className="absolute right-6 top-6 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground shadow-card transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Languages className="size-4" aria-hidden="true" />
        {isThai ? 'English' : 'ภาษาไทย'}
      </button>

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 pb-8 text-center">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card"
          >
            <span className="font-heading text-2xl font-bold">R</span>
          </span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            {t('app.name')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-border bg-card p-6 shadow-card"
        >
          {MOCKING_ENABLED ? (
            <>
              {/* Mocking-mode banner */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-amber-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-ink">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-amber" />
                {t('login.mockingMode')}
              </div>

              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t('login.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('login.subtitle')}</p>

              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-tenant">{t('devToolbar.tenant')}</Label>
                  <Select
                    id="login-tenant"
                    options={tenantOptions}
                    value={tenantId}
                    onValueChange={(v) => setTenantId(v as Id)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-branch">{t('devToolbar.branch')}</Label>
                  <Select
                    id="login-branch"
                    options={branchOptions}
                    value={branchId}
                    onValueChange={(v) => setBranchId(v as Id)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-user">{t('devToolbar.user')}</Label>
                  <Select
                    id="login-user"
                    options={userOptions}
                    value={userId}
                    onValueChange={(v) => setUserId(v as Id)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit}
                className={cn('mt-6 w-full cursor-pointer shadow-card')}
              >
                <LogIn className="size-4" aria-hidden="true" />
                {t('login.signIn')}
              </Button>
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t('login.title')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{t('login.realAuthHint')}</p>
            </div>
          )}
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t('login.footerNote')}
        </p>
      </div>
    </div>
  );
}
