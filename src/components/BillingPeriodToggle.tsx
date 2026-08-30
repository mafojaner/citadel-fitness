import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

export type BillingPeriod = 'monthly' | 'yearly';

/**
 * Monthly / Yearly, as one small pill rather than two buttons.
 *
 * It sits inside the plan card, at the top, next to the icon -- not above
 * the list of plans. That placement is the point: the toggle changes the
 * number directly beneath it, so putting it anywhere else makes the reader
 * look away from the price to change the price.
 *
 * The saving rides on the "Yearly" label instead of getting its own badge.
 * A separate "Save 17%" chip competes with the price for the same glance,
 * and what it is actually doing is describing the option beside it.
 */
export function BillingPeriodToggle({
  value,
  onChange,
  savingPct,
}: {
  value: BillingPeriod;
  onChange: (value: BillingPeriod) => void;
  /** Omitted when annual pricing is not set, which drops the suffix entirely. */
  savingPct?: number | null;
}) {
  const { colors, spacing, radius, typography } = useTheme();

  const option = (period: BillingPeriod, label: string, suffix?: string) => {
    const selected = value === period;
    return (
      <Pressable
        key={period}
        onPress={() => onChange(period)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={suffix ? `${label}, ${suffix}` : label}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 5,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          // The selected option is a raised white pill on the track, which is
          // how a segmented control says "you are here" without colour.
          backgroundColor: selected ? colors.surface : 'transparent',
          borderWidth: 1,
          borderColor: selected ? colors.border : 'transparent',
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: selected ? colors.textPrimary : colors.textSecondary,
              fontWeight: selected ? '700' : '500',
            },
          ]}
        >
          {label}
        </Text>
        {suffix ? (
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
            {suffix}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        padding: 2,
        borderRadius: radius.pill,
        backgroundColor: colors.background,
      }}
    >
      {option('monthly', 'Monthly')}
      {option(
        'yearly',
        'Yearly',
        savingPct != null && savingPct > 0 ? `· Save ${savingPct}%` : undefined
      )}
    </View>
  );
}
