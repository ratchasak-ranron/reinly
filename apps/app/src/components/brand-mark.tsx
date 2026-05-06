import { cn } from '@/lib/utils';

type BrandMarkSize = 'sm' | 'md' | 'lg';

interface BrandMarkProps {
  size?: BrandMarkSize;
  className?: string;
}

const SIZE_CLASS: Record<BrandMarkSize, string> = {
  sm: 'size-8 rounded-lg',
  md: 'size-9 rounded-xl',
  lg: 'size-14 rounded-2xl',
};

/**
 * Reinly brand mark — gradient indigo→violet rounded tile with a
 * geometric "R" monogram and a small accent pulse dot. Replaces the
 * plain `<span>R</span>` placeholder used in the sidebar, mobile nav,
 * and login screen so the brand reads with more personality.
 *
 * The mark renders a fixed 32×32 SVG and lets the outer container
 * scale it via Tailwind's `size-*` utilities, so a single SVG path
 * stays crisp at every call-site size.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        'bg-gradient-to-br from-indigo via-indigo to-violet text-primary-foreground',
        'shadow-card ring-1 ring-inset ring-white/15',
        // eslint-disable-next-line security/detect-object-injection -- size is a constant union literal
        SIZE_CLASS[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="size-[70%]"
      >
        {/* Stylized R glyph: vertical stem, rounded counter, sharp leg.
            Drawn as a single filled path so the gradient backdrop
            shows through the negative space inside the bowl. */}
        <path
          d="M9 6 H17.5 a6 6 0 0 1 0 12 H13 l5 8 H14 l-5 -8 V26 H9 Z M13 9 V15 H17 a3 3 0 0 0 0 -6 Z"
          fill="currentColor"
          fillRule="evenodd"
        />
        {/* Small accent dot — reads as a "pulse" marker, sits above the
            R like a notification dot to add recall. */}
        <circle cx="24" cy="9" r="2.25" fill="hsl(var(--amber))" />
      </svg>
    </span>
  );
}
