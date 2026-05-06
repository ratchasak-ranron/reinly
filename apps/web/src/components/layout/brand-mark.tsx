import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
}

/**
 * Marketing-site brand mark — favicon-aligned shape (rounded tile +
 * lowercase serif `r`) on the brand indigo→violet gradient. Mirrors
 * `apps/app/src/components/brand-mark.tsx` and the favicon at
 * `apps/web/public/favicon.svg`.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="reinly-web-brand-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="60%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="6" fill="url(#reinly-web-brand-grad)" />
      <text
        x="50%"
        y="60%"
        textAnchor="middle"
        fill="#F5F2EC"
        fontSize="22"
        fontFamily='Georgia, "Playfair Display", serif'
        fontWeight="700"
      >
        r
      </text>
    </svg>
  );
}
