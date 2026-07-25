import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text } from 'react-native';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface GradientPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  colors?: readonly [string, string, ...string[]];
  flex?: boolean;
}

export function GradientPill({ label, active, onPress, colors: gradientColors = gradients.action, flex }: GradientPillProps) {
  const { colors, spacing, radius, typography } = useTheme();

  if (!active) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          flex: flex ? 1 : undefined,
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        }}
      >
        <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={{ flex: flex ? 1 : undefined }}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          alignItems: 'center',
          shadowColor: gradientColors[gradientColors.length - 1],
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
        }}
      >
        <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '700' }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
