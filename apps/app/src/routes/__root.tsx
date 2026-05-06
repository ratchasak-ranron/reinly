import { Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/page-shell';
import { LoginPage } from '@/components/login-page';
import { useDevToolbar } from '@/store/dev-toolbar';

export function RootLayout() {
  const { t } = useTranslation();
  // Auth gate — render the LoginPage in place of the shell when there's
  // no `authedAt` timestamp. Avoids touching the router tree (no
  // redirect loops, no /login route plumbing) and keeps the shell out
  // of the bundle on the unauthenticated path.
  const authedAt = useDevToolbar((s) => s.authedAt);
  if (!authedAt) return <LoginPage />;

  return (
    <PageShell title={t('app.name')}>
      <Outlet />
    </PageShell>
  );
}
