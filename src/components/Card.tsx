import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { shadow } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface CardProps extends PropsWithChildren {
  title?: string;
  /** Mainly for `flex: 1`, so a card in a row can fill its track and line up with its neighbour. */
  style?: StyleProp<ViewStyle>;
}

export function Card({ title, style, children }: CardProps) {
  const { colors, spacing, radius, typography, scheme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        shadow.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.sm,
          shadowOpacity: scheme === 'dark' ? 0.35 : 0.1,
        },
        style,
      ]}
    >
      {title ? (
        <Text style={[typography.subheading, { color: colors.textPrimary }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
});
