import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface StatChipProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
}

export function StatChip({ icon, value }: StatChipProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.background,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
      }}
    >
      {/* textSecondary, not primary. Orange in this app now means "paid",
          and a dumbbell beside an exercise count is neither paid nor worth
          the loudest colour on the card. */}
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{value}</Text>
    </View>
  );
}
