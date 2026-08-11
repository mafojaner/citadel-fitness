import { useWindowDimensions } from 'react-native';
import { layout } from '../theme/tokens';

/**
 * Below this the app keeps its phone shape: bottom tab bar, one column of
 * cards. At or above it there's room for a sidebar plus content laid out in
 * columns, so the layout switches rather than just growing wider.
 *
 * 1024 rather than the ~768 tablet breakpoint on purpose: a portrait tablet
 * has the width for a sidebar but not enough left over for the multi-column
 * content beside it, so it stays on the phone layout and only landscape and
 * real desktop windows cross over.
 */
export const DESKTOP_BREAKPOINT = 1024;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT;
}

/** Cap for a screen's content column, matched by headers so they stay aligned with it. */
export function useContentMaxWidth(): number {
  return useIsDesktop() ? layout.desktopContentMaxWidth : layout.contentMaxWidth;
}

/** Columns for the exercise-category tile grid. */
export function useCategoryColumns(): number {
  return useIsDesktop() ? 4 : 2;
}
