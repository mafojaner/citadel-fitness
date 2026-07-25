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
      <Ionicons name={icon} size={13} color={colors.primary} />
      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{value}</Text>
    </View>
  );
}
