import { Text, View } from 'react-native';
import type { BillingPeriod } from './BillingPeriodToggle';
import { isPriced, type TierPricing } from '../constants/featureCatalog';
import { currencyInfo, formatPrice } from '../lib/currency';
import { useTheme } from '../theme/useTheme';

/**
 * The price, laid out the way a pricing page lays one out: one large figure
 * with the unit and the billing basis stacked small beside it.
 *
 * Those two small lines are doing different jobs and are often collapsed
 * into one. "USD / month" is the unit the number is in; "billed yearly" is
 * how the charge actually lands. Someone comparing plans needs the first,
 * and someone deciding whether to commit needs the second -- printing only
 * "$16/month" for an annual plan is the omission that produces a support
 * ticket on the first statement.
 */
export function PlanPrice({
  pricing,
  period,
  fallback,
}: {
  pricing: TierPricing;
  period: BillingPeriod;
  /** Shown when there is no price yet, e.g. "Pricing at launch". */
  fallback: string;
}) {
  const { colors, spacing, typography } = useTheme();

  if (!isPriced(pricing)) {
    return (
      <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>{fallback}</Text>
    );
  }

  const amount = period === 'yearly' ? pricing.annualPerMonth ?? pricing.monthly : pricing.monthly;
  const free = !amount;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text style={{ color: colors.textPrimary, fontSize: 40, fontWeight: '800', letterSpacing: -1 }}>
        {/* Formatted through the currency, not with a hard-coded dollar
            sign. The symbol was inlined here while USD was the only option,
            which would have quietly printed "$89.99" for a rand price. */}
        {free ? 'Free' : formatPrice(amount as number, pricing.currency)}
      </Text>
      {free ? null : (
        <View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {currencyInfo(pricing.currency).code} / month
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            billed {period === 'yearly' ? 'yearly' : 'monthly'}
          </Text>
        </View>
      )}
    </View>
  );
}
