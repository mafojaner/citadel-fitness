import type { ReactNode } from 'react';
import { FadeInView } from '../FadeInView';

/**
 * Cards arrive in sequence rather than at once.
 *
 * A dense screen appearing in a single frame is a wall; 70ms apart it reads
 * top to bottom, which is the order the sections are meant to be read in
 * anyway. Capped so the last card on a long page is not still arriving
 * after half a second.
 *
 * Written inline on the analytics screen and lifted here the moment the
 * records page was rebuilt in the same language -- the two are meant to
 * read as the same product, and a second copy is how one of them quietly
 * grows a different interval.
 */
const STAGGER_MS = 70;
const MAX_STAGGER_MS = 420;

export function Section({ index, children }: { index: number; children: ReactNode }) {
  return (
    <FadeInView slideDistance={12} duration={Math.min(index * STAGGER_MS, MAX_STAGGER_MS) + 260}>
      {children}
    </FadeInView>
  );
}
