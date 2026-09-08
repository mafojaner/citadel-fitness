import { Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface WeekBlocksProps {
  /** Seven, Monday first: true trains, false rests. */
  week: boolean[];
  /** Leading line, e.g. "4 days a week". */
  frequency: string;
}

/**
 * A week as seven blocks, the training days filled.
 *
 * This replaced a sentence -- "Mon Upper A · Tue Lower A · Thu Upper B ·
 * Fri Lower B · weekend rest" -- which said everything and showed nothing.
 * Whether a programme fits someone's week is a question about shape: how
 * many days, whether they run together, where the gaps fall. A row of
 * blocks answers that before it is read, and the rest days are the empty
 * ones rather than a clause at the end of a list.
 *
 * The count of rest days is stated as well as drawn. Someone scanning
 * several programmes is comparing that number, and counting gaps in a
 * seven-block row is exactly the sort of small work a label removes.
 *
 * Filled in `ctaFill` rather than in the programme's own ink -- the same
 * mirrored pair the primary button and the logging widget use, near-black
 * on light and white on dark. A trained day is a fact about the week, not
 * a claim about which programme this is, and five of these rows in the
 * catalogue each in a different colour turned a comparison into a
 * swatch chart.
 */
export function WeekBlocks({ week, frequency }: WeekBlocksProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const rest = week.filter((day) => !day).length;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
          {frequency}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          · {rest === 0 ? 'no rest days' : `${rest} rest day${rest === 1 ? '' : 's'}`}
        </Text>
      </View>

      <View
        style={{ flexDirection: 'row', gap: 6 }}
        accessible
        accessibilityLabel={`${frequency}, ${rest} rest days. Trains on ${week
          .map((train, i) => (train ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i] : null))
          .filter(Boolean)
          .join(', ')}.`}
      >
        {week.map((train, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 7,
              borderRadius: radius.sm,
              backgroundColor: train ? colors.ctaFill : colors.background,
              // A rest day is drawn, not omitted -- the gap is half of what
              // the row is saying. The outline keeps it a block rather than
              // a hole where the eye expects one.
              borderWidth: train ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: train ? colors.ctaText : colors.textMuted,
              }}
            >
              {DAY_INITIALS[i]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
