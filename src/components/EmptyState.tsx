import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card } from './Card';
import { GradientIconBadge } from './GradientIconBadge';
import { useTheme } from '../theme/useTheme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string, ...string[]];
  title: string;
  /** One line. If it needs two, the feature needs a simpler empty state. */
  detail: string;
}

/**
 * The card a Fortress screen shows before it has anything to show.
 *
 * Goal forecasting, the records vault, private groups and advanced analytics
 * each rebuilt this by hand -- gradient badge, bold line, muted line -- with
 * slightly different spacing and gaps in each. Four copies of a pattern is
 * where drift starts, and the drift had already begun.
 *
 * The copy stays with the caller: the badge and the layout are shared, the
 * sentence is not. "No goals yet" and "No records yet" are the same shape
 * and different promises, and a generic "Nothing here" would be worse than
 * either.
 */
export function EmptyState({ icon, colors: gradient, title, detail }: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <GradientIconBadge icon={icon} colors={gradient} size={44} />
        <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
            {title}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{detail}</Text>
        </View>
      </View>
    </Card>
  );
}
