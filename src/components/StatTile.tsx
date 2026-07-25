import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { GradientIconBadge } from './GradientIconBadge';

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: readonly [string, string, ...string[]];
  value: string;
  label: string;
}

export function StatTile({ icon, gradientColors, value, label }: StatTileProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
        shadowColor: gradientColors[1],
        shadowOpacity: 0.28,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <GradientIconBadge icon={icon} colors={gradientColors} size={40} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.2 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
