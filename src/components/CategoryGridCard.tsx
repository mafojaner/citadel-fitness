import type { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
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
}

/** The "Browse by category" tile shared by Home and the Exercise Catalogue. */
export function CategoryGridCard({ icon, gradientColors, label, count, onPress }: CategoryGridCardProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.96} style={{ width: '47%' }}>
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
