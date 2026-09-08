import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { WeekRow } from './WeekRow';
import { todayISO, weekOf } from '../lib/analytics';
import { useWeekWorkoutDates } from '../hooks/useWeekWorkoutDates';
import { useTheme } from '../theme/useTheme';

interface WeekStripSnapshotProps {
  /**
   * Where the whole card goes when pressed. Left off, the card is inert --
   * it reports the week and nothing more.
   *
   * There is no per-day press either way. A snapshot that let you pick a
   * day would have to answer what picking one means on a screen that is not
   * the logging screen, and the honest answer is nothing.
   */
  onPress?: () => void;
  /** Read out in place of the days when the card is pressable. */
  accessibilityLabel?: string;
}

/** "September 2026", from a date string, without re-reading it as local time. */
function monthLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * This week, as a strip: the month, seven days, and a dot under each day
 * that has something logged.
 *
 * The same row the Add Workout picker draws, deliberately -- it is a
 * preview of the screen it points at, and a preview drawn differently from
 * the thing it previews is just a second design to maintain. What it does
 * not carry is the picker's behaviour: no month toggle, because expanding a
 * calendar on a summary screen answers a question nobody asked there, and
 * no per-day selection, because there is nothing on these screens for a
 * selected day to change.
 *
 * Today is ringed rather than filled. The filled pill means "selected", and
 * nothing here is selected -- reusing it would promise a picker.
 */
export function WeekStripSnapshot({ onPress, accessibilityLabel }: WeekStripSnapshotProps) {
  const { colors, spacing, typography } = useTheme();
  const today = todayISO();
  const week = weekOf(today);
  const { dates } = useWeekWorkoutDates();

  const trained = dates.length;
  const summary =
    trained === 0 ? 'Nothing logged this week' : `${trained} day${trained === 1 ? '' : 's'} logged this week`;

  const body = (
    <Card style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.subheading, { color: colors.textPrimary }]}>
          {monthLabel(today)}
        </Text>
        {onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : null}
      </View>

      <WeekRow week={week} markedDates={dates} />

      <Text style={[typography.caption, { color: colors.textMuted }]}>{summary}</Text>
    </Card>
  );

  if (!onPress) {
    // Inert, and marked as one piece of text for a screen reader rather than
    // as seven unlabelled day cells with no action behind them.
    return (
      <View accessible accessibilityLabel={`${monthLabel(today)}. ${summary}.`}>
        {body}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${monthLabel(today)}. ${summary}. Opens workouts.`}
    >
      {body}
    </AnimatedPressable>
  );
}
