import { useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/router';
import { queryClient } from '@/lib/query-client';
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <HtmlLangSync />
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>
  );
}
