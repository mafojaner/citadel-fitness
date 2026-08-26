import { Children, isValidElement, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface SettingsSectionProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

/** A grouped, divided list of SettingsRows — the Meta Accounts Center "card of rows" pattern. */
export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={{ gap: spacing.xs }}>
      {title ? (
        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              paddingHorizontal: spacing.xs,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => (
          <View key={index}>
            {row}
            {index < rows.length - 1 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.border,
                  // Indented past the icon column so the rule starts under
                  // the text, not under the icon. The icon is 24 wide now
                  // rather than a 40px disc, so this follows it in.
                  marginLeft: spacing.md + 24 + spacing.md,
                }}
              />
            ) : null}
          </View>
        ))}
      </View>
      {footer ? (
        <Text style={[typography.caption, { color: colors.textMuted, paddingHorizontal: spacing.xs }]}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}
