import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface GradientPillProps {
  /** Always used as the accessibility label, even when `icon` replaces it visually. */
  label: string;
  /** When set, renders this icon instead of the label text. */
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  colors?: readonly [string, string, ...string[]];
  flex?: boolean;
  /**
   * 'gradient' is the app's accent pill, right where it sits among vivid
   * stat tiles and category chips. 'ink' is the flat version for the
   * account centre and anywhere else that has gone monochrome, where an
   * orange pill would be the only saturated thing on the screen.
   */
  tone?: 'gradient' | 'ink';
}

export function GradientPill({
  label,
  icon,
  active,
  onPress,
  colors: gradientColors = gradients.action,
  flex,
  tone = 'gradient',
}: GradientPillProps) {
  const { colors, spacing, radius, typography } = useTheme();

  if (!active) {
    return (
      <AnimatedPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        // Which pill is active is otherwise conveyed only by the gradient,
        // so without this a screen reader gives no way to tell the selected
        // filter or unit from the rest.
        accessibilityState={{ selected: false }}
        scaleTo={0.95}
        style={{
          flex: flex ? 1 : undefined,
          paddingVertical: spacing.xs - 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        }}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.textSecondary} />
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
        )}
      </AnimatedPressable>
    );
  }

  if (tone === 'ink') {
    return (
      <AnimatedPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: true }}
        scaleTo={0.95}
        style={{
          flex: flex ? 1 : undefined,
          paddingVertical: spacing.xs - 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.textPrimary,
          alignItems: 'center',
        }}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.surface} />
        ) : (
          <Text style={[typography.body, { color: colors.surface, fontWeight: '700' }]}>{label}</Text>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: true }}
      scaleTo={0.95}
      style={{ flex: flex ? 1 : undefined }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingVertical: spacing.xs - 2,
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
        {icon ? (
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        ) : (
          <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '700' }]}>{label}</Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}
