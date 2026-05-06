import {
  BarChart3,
  Building2,
  Calendar,
  GraduationCap,
  Home,
  Package,
  PackageSearch,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';

// Per-section accent token. Maps to color tokens defined in
// packages/ui-tokens/src/css/tokens.css. Used for left-border,
// dot indicator, active-state tint, and KPI-strip color so each section
// has a memorable signature color while body content stays neutral.
export type SectionAccent =
  | 'indigo'
  | 'sky'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'zinc';

export interface NavItem {
  to:
    | '/'
    | '/patients'
    | '/appointments'
    | '/courses'
    | '/inventory'
    | '/products'
    | '/promotions'
    | '/doctors'
    | '/branches'
    | '/reports'
    | '/audit'
    | '/consent';
  icon: LucideIcon;
  labelKey:
    | 'nav.today'
    | 'nav.patients'
    | 'nav.appointments'
    | 'nav.courses'
    | 'nav.inventory'
    | 'nav.products'
    | 'nav.promotions'
    | 'nav.doctors'
    | 'nav.branches'
    | 'nav.reports'
    | 'nav.audit'
    | 'nav.consent';
  exact: boolean;
  primary: boolean; // shown in `<sm` bottom-tab dock
  accent: SectionAccent;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { to: '/', icon: Home, labelKey: 'nav.today', exact: true, primary: true, accent: 'indigo' },
  {
    to: '/patients',
    icon: Users,
    labelKey: 'nav.patients',
    exact: false,
    primary: true,
    accent: 'sky',
  },
  {
    to: '/appointments',
    icon: Calendar,
    labelKey: 'nav.appointments',
    exact: false,
    primary: true,
    accent: 'emerald',
  },
  {
    to: '/courses',
    icon: GraduationCap,
    labelKey: 'nav.courses',
    exact: false,
    primary: false,
    accent: 'violet',
  },
  {
    to: '/inventory',
    icon: Package,
    labelKey: 'nav.inventory',
    exact: false,
    primary: false,
    accent: 'rose',
  },
  {
    to: '/products',
    icon: PackageSearch,
    labelKey: 'nav.products',
    exact: false,
    primary: false,
    accent: 'indigo',
  },
  {
    to: '/promotions',
    icon: Tag,
    labelKey: 'nav.promotions',
    exact: false,
    primary: false,
    accent: 'amber',
  },
  {
    to: '/doctors',
    icon: Stethoscope,
    labelKey: 'nav.doctors',
    exact: false,
    primary: false,
    accent: 'sky',
  },
  {
    to: '/branches',
    icon: Building2,
    labelKey: 'nav.branches',
    exact: false,
    primary: false,
    accent: 'emerald',
  },
  {
    to: '/reports',
    icon: BarChart3,
    labelKey: 'nav.reports',
    exact: false,
    primary: true,
    accent: 'zinc',
  },
  {
    to: '/audit',
    icon: ScrollText,
    labelKey: 'nav.audit',
    exact: false,
    primary: false,
    accent: 'zinc',
  },
  {
    to: '/consent',
    icon: ShieldCheck,
    labelKey: 'nav.consent',
    exact: false,
    primary: false,
    accent: 'zinc',
  },
];

// Tailwind class lookup per accent. Each accent provides a dot color
// (filled bg), text-safe (-ink), and a soft wash for active-tab bg.
// Strings are full literals so Tailwind's JIT picks them up at build.
export const ACCENT_CLASSES: Record<
  SectionAccent,
  {
    /** Solid surface fill — dots, indicator pills */
    bg: string;
    /** Text-safe variant for icon/label color */
    text: string;
    /** Left-border for KPI tile or banner */
    border: string;
    /** Wash background for active nav, KPI strip, badge */
    softBg: string;
    /** Active nav-item background */
    activeBg: string;
    /** Active nav-item text/icon color */
    activeText: string;
  }
> = {
  indigo: {
    bg: 'bg-indigo',
    text: 'text-indigo-ink',
    border: 'border-l-indigo',
    softBg: 'bg-indigo-soft',
    activeBg: 'bg-indigo-soft',
    activeText: 'text-indigo-ink',
  },
  sky: {
    bg: 'bg-sky',
    text: 'text-sky-ink',
    border: 'border-l-sky',
    softBg: 'bg-sky-soft',
    activeBg: 'bg-sky-soft',
    activeText: 'text-sky-ink',
  },
  emerald: {
    bg: 'bg-emerald',
    text: 'text-emerald-ink',
    border: 'border-l-emerald',
    softBg: 'bg-emerald-soft',
    activeBg: 'bg-emerald-soft',
    activeText: 'text-emerald-ink',
  },
  violet: {
    bg: 'bg-violet',
    text: 'text-violet-ink',
    border: 'border-l-violet',
    softBg: 'bg-violet-soft',
    activeBg: 'bg-violet-soft',
    activeText: 'text-violet-ink',
  },
  amber: {
    bg: 'bg-amber',
    text: 'text-amber-ink',
    border: 'border-l-amber',
    softBg: 'bg-amber-soft',
    activeBg: 'bg-amber-soft',
    activeText: 'text-amber-ink',
  },
  rose: {
    bg: 'bg-rose',
    text: 'text-rose-ink',
    border: 'border-l-rose',
    softBg: 'bg-rose-soft',
    activeBg: 'bg-rose-soft',
    activeText: 'text-rose-ink',
  },
  zinc: {
    bg: 'bg-foreground',
    text: 'text-foreground',
    border: 'border-l-foreground',
    softBg: 'bg-muted',
    activeBg: 'bg-muted',
    activeText: 'text-foreground',
  },
};
