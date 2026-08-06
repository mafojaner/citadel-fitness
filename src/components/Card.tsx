import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { shadow } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface CardProps extends PropsWithChildren {
  title?: string;
}

export function Card({ title, children }: CardProps) {
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
