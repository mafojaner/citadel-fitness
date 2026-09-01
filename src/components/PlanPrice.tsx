import { Text, View } from 'react-native';
import type { BillingPeriod } from './BillingPeriodToggle';
import { annualTotal, isPriced, type TierPricing } from '../constants/featureCatalog';
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
 *
 * That reasoning was written here and then stopped one step short. Saying
 * "billed yearly" tells you the shape of the charge without ever telling
 * you its size: the card showed R414.99 and never once showed the R4,979.88
 * that leaves the account. Both stores require the total to be visible
 * before purchase, and a member reading only the large figure would have
 * been off by a factor of twelve. The total now sits under the row, quiet
 * but present -- the per-month figure stays the headline, because that is
 * still what compares against the monthly plan.
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
  // Only on the yearly period, and only when there is a charge. On the
  // monthly plan the large figure already is the total, and repeating it
  // underneath would read as a second, different price.
  const total = period === 'yearly' && !free ? annualTotal(pricing) : null;

  return (
    <View style={{ gap: 2 }}>
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

      {total === null ? null : (
        // Muted and small: this is the figure you check, not the figure you
        // compare. Loud enough to be found before committing, quiet enough
        // that it does not compete with the number beside "/ month".
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {formatPrice(total, pricing.currency)} billed once a year
        </Text>
      )}
    </View>
  );
}
