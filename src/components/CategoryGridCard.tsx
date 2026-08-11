import type { Ionicons } from '@expo/vector-icons';
import { Text, View, type DimensionValue } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { GradientIconBadge } from './GradientIconBadge';
import { useTheme } from '../theme/useTheme';

interface CategoryGridCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: readonly [string, string, ...string[]];
  label: string;
  count: number;
  onPress: () => void;
  /** How many tiles share a row; the grid is a wrapping flex row, so this becomes a width. */
  columns?: number;
}

/** The "Browse by category" tile shared by Home and the Exercise Catalogue. */
export function CategoryGridCard({
  icon,
  gradientColors,
  label,
  count,
  onPress,
  columns = 2,
}: CategoryGridCardProps) {
  const { colors, spacing, typography } = useTheme();
  // Basis decides how many fit per row, grow makes them share out whatever's
  // left so the row still reaches the edge. Sizing tiles with `width` alone
  // can't do both: percentages resolve against the container without the gap
  // taken out first, so a width big enough to fill the row is also big enough
  // to push the last tile onto the next one — which is exactly what happened
  // at 48%/2-up on a phone. The margin below the even split absorbs the gap.
  const basis: DimensionValue = `${100 / columns - 3}%`;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.96}
      style={{ flexBasis: basis, flexGrow: 1, minWidth: 0 }}
    >
      <Card>
        <View style={{ alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm }}>
          <GradientIconBadge icon={icon} colors={gradientColors} size={40} />
          <Text style={[typography.heading, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {count} exercise{count === 1 ? '' : 's'}
          </Text>
        </View>
      </Card>
    </AnimatedPressable>
  );
}
