import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pins a tab's action buttons to the bottom of the popup so the primary CTA
 * stays visible when the content list overflows the popup's max height
 * (the popup body is a single scroll container, max-height 600px).
 *
 * Full-bleed via -mx-4/px-4, which cancels the `Tabs.Content` p-4 padding so
 * the top border spans the full popup width. All tab panels render inside a
 * `p-4` content area with a `space-y-*` root and no horizontal padding, so the
 * offset is consistent. Pass layout classes (e.g. `flex gap-2`, `space-y-2`)
 * via `className` to control how the wrapped buttons sit.
 */
export function StickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-3 bg-surface border-t border-border/60',
        className,
      )}
    >
      {children}
    </div>
  );
}
