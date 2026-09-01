import { Pressable, ScrollView, Text, View } from 'react-native';
import { CURRENCIES, currencyInfo, type CurrencyCode } from '../lib/currency';
import { useTheme } from '../theme/useTheme';

/**
 * Which currency the prices on this page are shown in.
 *
 * Sits above the plan cards rather than inside one, unlike the billing
 * toggle. The period changes a single card's figure and belongs next to it;
 * the currency changes every number on the page, so it goes where it can be
 * seen to govern all of them.
 *
 * The line underneath is not boilerplate and should not be trimmed. These
 * prices are what will be listed, but the App Store and Play charge in the
 * currency of the buyer's own store account -- so someone with a US account
 * reading rand here would still be billed in dollars. Saying that once,
 * plainly, is cheaper than a support thread about a card statement.
 */
export function CurrencyPicker({
  value,
  onChange,
}: {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <ScrollView
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

      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Prices shown in {currencyInfo(value).label}. The App Store and Google Play charge in the
        currency of your own store account, so that is what a card statement will show.
      </Text>
    </View>
  );
}
