import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import { useIsDesktop } from '../../hooks/useResponsiveLayout';
import { useTheme } from '../../theme/useTheme';

interface StatGridProps {
  children: ReactNode;
}

/**
 * Four figures as an even grid on a phone, one row on desktop.
 *
 * The headline card laid its four out as a wrapping row of flexible cells,
 * which fits three across on a phone and leaves the fourth alone on a line
 * of its own, stretched to the full width. Three tight columns and one wide
 * one is not a grid, and it read as the odd block on a page whose other
 * cards all line their numbers up.
 *
 * Half-width cells rather than a column gap, because a gap plus two 50%
 * children overflows the row and drops the second one -- the padding lives
 * inside each cell instead, which is also what keeps the left edges of the
 * two rows aligned.
 *
 * Deliberately only used by the four-figure card. The three-figure cards
 * already fit one balanced row, and forcing them into halves would
 * reintroduce exactly the orphan this exists to remove.
 */
export function StatGrid({ children }: StatGridProps) {
  const { spacing } = useTheme();
  const isDesktop = useIsDesktop();
  const cells = Children.toArray(children);

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: spacing.md,
      }}
    >
      {cells.map((cell, index) => (
        <View
          key={index}
          style={{
            width: isDesktop ? undefined : '50%',
            flex: isDesktop ? 1 : undefined,
            // Only the left column carries the divide, so the right column
            // sits flush to the card's own padding rather than being inset
            // twice.
            paddingRight: !isDesktop && index % 2 === 0 ? spacing.md : 0,
          }}
        >
          {cell}
        </View>
      ))}
    </View>
  );
}
