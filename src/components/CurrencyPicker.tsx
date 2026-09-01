import { Pressable, ScrollView, Text, View } from 'react-native';
import { CURRENCIES, type CurrencyCode } from '../lib/currency';
import { useTheme } from '../theme/useTheme';

/**
 * Which currency the prices on this page are shown in.
 *
 * Sits above the plan cards rather than inside one, unlike the billing
 * toggle. The period changes a single card's figure and belongs next to it;
 * the currency changes every number on the page, so it goes where it can be
 * seen to govern all of them.
 *
 * Pills only. The sentence explaining that the store bills in the buyer's
 * own account currency used to sit underneath and now lives behind the
 * page's info toggle -- it is an explanation rather than a control, and the
 * top of the plans page had grown to six lines of prose before the first
 * plan. See currencyNote in lib/currency.ts; it is still required reading,
 * just not required scrolling.
 *
 * `trailing` is where the info button goes, so it shares a row with the
 * pills instead of taking another line of its own.
 */
export function CurrencyPicker({
  value,
  onChange,
  trailing,
}: {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  /** Rendered at the end of the row, outside the scrolling pills. */
  trailing?: React.ReactNode;
}) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <ScrollView
        style={{ flex: 1, minWidth: 0 }}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs, paddingRight: spacing.md }}
      >
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.xs }}>
          {CURRENCIES.map((c) => {
            const selected = c.code === value;
            return (
              <Pressable
                key={c.code}
                onPress={() => onChange(c.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                // The code alone reads as jargon to a screen reader, so the
                // label carries the full name that the pill has no room for.
                accessibilityLabel={`${c.label} (${c.code})`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 5,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: selected ? colors.textMuted : colors.border,
                  backgroundColor: selected ? colors.border : 'transparent',
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textPrimary,
                      fontWeight: selected ? '700' : '500',
                    },
                  ]}
                >
                  {c.symbol} {c.code}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {trailing}
    </View>
  );
}
