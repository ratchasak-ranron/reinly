/* eslint-disable security/detect-object-injection -- locale is a constant union */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useResolvedLocale } from '@/lib/use-locale';
import { localeSwitchHref } from '@/lib/locale-utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { siteConfig, type Locale } from '@/lib/site-config';
import { BrandMark } from './brand-mark';

interface SiteHeaderProps {
  locale: Locale;
}

const NEXT_LANG: Record<Locale, Locale> = { en: 'th', th: 'en' };
const NEXT_LABEL: Record<Locale, string> = { en: 'ภาษาไทย', th: 'English' };

const NAV_KEYS = ['home', 'pricing', 'features', 'about'] as const;
type NavKey = (typeof NAV_KEYS)[number];

function pathFor(locale: Locale, key: NavKey): string {
  return key === 'home' ? `/${locale}` : `/${locale}/${key}`;
}

function isActive(pathname: string, href: string, key: NavKey): boolean {
  if (key === 'home') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const { t } = useResolvedLocale();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const next = NEXT_LANG[locale];
  const nextLabel = NEXT_LABEL[locale];
  const switchHref = localeSwitchHref(pathname, locale, next);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <a
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <BrandMark className="size-7" />
          {siteConfig.name}
        </a>

        <nav
          aria-label={t('nav.primary')}
          className="hidden flex-1 items-center justify-center gap-6 md:flex"
        >
          {NAV_KEYS.map((key) => {
            const href = pathFor(locale, key);
            const active = isActive(pathname, href, key);
            return (
              <a
                key={key}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'text-sm font-medium text-primary'
                    : 'text-sm font-medium text-foreground transition-colors hover:text-primary'
                }
              >
                {t(`nav.${key}`)}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <a
            href={switchHref}
            className="touch-target inline-flex items-center rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t('nav.switchTo', { lang: nextLabel })}
          >
            {nextLabel}
          </a>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
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
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-6 py-5">
                <SheetTitle className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                  <BrandMark className="size-7" />
                  {siteConfig.name}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3" aria-label={t('nav.primaryMobile')}>
                {NAV_KEYS.map((key) => {
                  const href = pathFor(locale, key);
                  const active = isActive(pathname, href, key);
                  return (
                    <a
                      key={key}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={
                        active
                          ? 'flex min-h-[44px] items-center rounded-md bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary'
                          : 'flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted'
                      }
                    >
                      {t(`nav.${key}`)}
                    </a>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
