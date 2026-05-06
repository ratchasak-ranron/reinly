import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { usePatient } from '@/features/patient';

interface Crumb {
  /** Translated label rendered as the crumb text. */
  label: string;
  /** Target route. `null` = leaf crumb (rendered without link). */
  to: string | null;
}

/**
 * Breadcrumb chain derived from the current pathname. Mirrors the
 * Dentalica reference's "List Customer > Jerome Bellingham" pattern.
 *
 * The map is intentionally hard-coded — TanStack Router's matched-route
 * tree does not carry localised labels, and route-level metadata adds
 * indirection that does not pay off at this size. When a new top-level
 * route lands, add an entry to ROUTE_LABEL_KEYS below.
 *
 * Patient detail (`/patients/$id`) is the only nested case so far. The
 * leaf label resolves the patient by id and falls back to a generic
 * "Patient" label while the query loads or fails.
 */
export function Breadcrumbs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  // Special-case patient detail: /patients/$id
  const patientId = segments[0] === 'patients' && segments.length === 2 ? segments[1] : undefined;
  const patient = usePatient(patientId);

  const crumbs = useMemo<Crumb[]>(() => {
    if (segments.length === 0) {
      return [{ label: t('nav.today'), to: null }];
    }

    const top = segments[0]!;
    // eslint-disable-next-line security/detect-object-injection -- `top` is the first URL path segment, used as a lookup key in a closed allowlist of route slugs
    const topKey = ROUTE_LABEL_KEYS[top];
    if (!topKey) {
      return [{ label: top, to: null }];
    }

    if (top === 'patients' && segments.length === 2) {
      return [
        { label: t(topKey), to: '/patients' },
        {
          label: patient.data?.fullName ?? t('patient.title'),
          to: null,
        },
      ];
    }

    return [{ label: t(topKey), to: null }];
  }, [segments, t, patient.data?.fullName]);

  return (
    <nav aria-label="breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="inline-flex min-w-0 items-center gap-1">
              {i > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground/60"
                />
              ) : null}
              {c.to && !isLast ? (
                <Link
                  to={c.to}
                  className="truncate rounded px-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className="truncate font-medium text-foreground"
                >
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const ROUTE_LABEL_KEYS: Record<string, string> = {
  patients: 'nav.patients',
  appointments: 'nav.appointments',
  courses: 'nav.courses',
  inventory: 'nav.inventory',
  products: 'nav.products',
  promotions: 'nav.promotions',
  doctors: 'nav.doctors',
  branches: 'nav.branches',
  reports: 'nav.reports',
  audit: 'nav.audit',
  consent: 'nav.consent',
};
