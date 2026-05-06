import { useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { getBranches, getTenants, getUsers } from '@reinly/mock-server';
import { router } from '@/router';
import { queryClient } from '@/lib/query-client';
import { useDevToolbar } from '@/store/dev-toolbar';
import i18n from '@/lib/i18n';

// Co-located inside App.tsx: only consumer is App; lifting to its own module
// adds an import without a payoff. Move only when a second consumer appears.
function HtmlLangSync() {
  const { i18n: i18nInstance } = useTranslation();
  useEffect(() => {
    const lang = i18nInstance.language === 'th' ? 'th' : 'en';
    document.documentElement.lang = lang;
  }, [i18nInstance.language]);
  return null;
}

/**
 * Auto-select the first tenant / branch / user from the seeded mock data
 * if the dev toolbar has nothing chosen yet. Without this, the operator
 * lands on a TenantGate empty-state and can't see anything until they
 * pick three dropdowns.
 *
 * Runs once after MSW + seed are ready (App tree only mounts after that).
 * Safe to re-run on every render — `setTenant` etc. are no-ops when the
 * id is already set, and the effect's deps gate the work.
 */
function DefaultsBootstrap() {
  const tenantId = useDevToolbar((s) => s.tenantId);
  const branchId = useDevToolbar((s) => s.branchId);
  const userId = useDevToolbar((s) => s.userId);
  const setTenant = useDevToolbar((s) => s.setTenant);
  const setBranch = useDevToolbar((s) => s.setBranch);
  const setUser = useDevToolbar((s) => s.setUser);

  useEffect(() => {
    if (!tenantId) {
      const firstTenant = getTenants()[0];
      if (firstTenant) {
        setTenant(firstTenant.id);
        // setTenant resets branch — pick the first branch under that tenant
        // immediately so the user lands on a fully-scoped dashboard.
        const firstBranch = getBranches().find((b) => b.tenantId === firstTenant.id);
        if (firstBranch) setBranch(firstBranch.id);
        const firstUser = getUsers().find((u) => u.tenantId === firstTenant.id);
        if (firstUser) setUser(firstUser.id);
      }
      return;
    }
    if (!branchId) {
      const firstBranch = getBranches().find((b) => b.tenantId === tenantId);
      if (firstBranch) setBranch(firstBranch.id);
    }
    if (!userId) {
      const firstUser = getUsers().find((u) => u.tenantId === tenantId);
      if (firstUser) setUser(firstUser.id);
    }
  }, [tenantId, branchId, userId, setTenant, setBranch, setUser]);

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <HtmlLangSync />
        <DefaultsBootstrap />
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>
  );
}
