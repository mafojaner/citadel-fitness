import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { GradientIconBadge } from './GradientIconBadge';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColors?: readonly [string, string, ...string[]];
  danger?: boolean;
  title: string;
  subtitle?: string;
  value?: string;
  rightElement?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/** A single icon + title (+ optional subtitle/value/accessory) row, meant to be stacked inside a SettingsSection. */
export function SettingsRow({
  icon,
  iconColors = gradients.identity,
  danger = false,
  title,
  subtitle,
  value,
  rightElement,
  onPress,
  disabled = false,
  loading = false,
}: SettingsRowProps) {
  const { colors, spacing, typography } = useTheme();

  const row = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {danger ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.danger,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
      ) : (
        <GradientIconBadge icon={icon} colors={iconColors} size={40} />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {loading ? (
          <ActivityIndicator color={danger ? colors.danger : colors.primary} style={{ alignSelf: 'flex-start' }} />
        ) : (
          <Text
            style={[typography.body, { color: danger ? colors.danger : colors.textPrimary, fontWeight: '600' }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {rightElement}
      {onPress && !rightElement ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );

  if (!onPress) return row;

  return (
    // Composed into one label rather than left to the child Text nodes, so
    // the current value ("Appearance, System") is announced with the row
    // instead of as a separate stop after it.
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join(', ')}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {row}
    </AnimatedPressable>
  );
}
