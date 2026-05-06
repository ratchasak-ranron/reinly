import { cn } from '@/lib/utils';

type BrandMarkSize = 'sm' | 'md' | 'lg';

interface BrandMarkProps {
  size?: BrandMarkSize;
  className?: string;
}

const SIZE_CLASS: Record<BrandMarkSize, string> = {
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-14',
};

/**
 * Reinly brand mark — mirrors the favicon at apps/app/public/favicon.svg
 * exactly so the in-app emblem and the browser tab read as the same
 * mark: a dark slate rounded tile (#1F2328) with a lowercase serif `r`
 * in cream (#F5F2EC). Used by the sidebar, mobile nav, and login
 * screen.
 *
 * The favicon is the source of truth — re-export the same viewBox
 * here so a future favicon refresh propagates by tweaking the SVG
 * path rather than two separate places.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 shadow-card',
        // eslint-disable-next-line security/detect-object-injection -- size is a constant union literal
        SIZE_CLASS[size],
        className,
      )}
    >
      <rect width="32" height="32" rx="6" fill="#1F2328" />
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
