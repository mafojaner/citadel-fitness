import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActivityCalendar } from './ActivityCalendar';
import { Card } from './Card';
import { WeekRow } from './WeekRow';
import { weekOf } from '../lib/analytics';
import { useTheme } from '../theme/useTheme';

interface WeekStripCalendarProps {
  selectedDate: string;
  onDayPress: (date: string) => void;
  /** Fires when the month view moves, so the caller can load that month's dots. */
  onMonthChange: (date: string) => void;
  /** Dates with something logged: a dot under the number. */
  markedDates?: string[];
}

/** "September 2026", from a date string, without re-reading it as local time. */
function monthLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The date picker on the logging screen: one week by default, the whole
 * month behind a toggle.
 *
 * A month grid was the first thing on Add Workout, roughly six hundred
 * pixels of it, and it pushed the actual job -- add an exercise, enter a
 * set, confirm -- off the bottom of the phone. The grid was also answering
 * a question almost nobody was asking. Workouts are logged the day they
 * happen; backdating is the exception, and an exception does not deserve
 * the top third of the screen.
 *
 * So the common case is one row. The exception is one tap away, and the tap
 * lands on the same component rather than a different screen, so the day
 * you pick in the month is the day the strip shows when it closes.
 */
export function WeekStripCalendar({
  selectedDate,
  onDayPress,
  onMonthChange,
  markedDates = [],
}: WeekStripCalendarProps) {
  const { colors, spacing, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const week = weekOf(selectedDate);

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Only while collapsed. The month grid brings its own month
            header -- it has to, because the arrows live in it -- so leaving
            this one up printed "September 2026" twice, once above the
            other. */}
        <Text style={[typography.subheading, { color: colors.textPrimary }]}>
          {expanded ? '' : monthLabel(selectedDate)}
        </Text>
        {/* The label names what you get, not what you are looking at, so
            there is nothing to work out: press "Month" and you get the
            month. */}
        <Pressable
          onPress={() => setExpanded((open) => !open)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Show only this week' : 'Show the whole month'}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
            {expanded ? 'Week' : 'Month'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {expanded ? (
        // `bare`, because this card is already the surface. Without it the
        // month arrives in a card of its own, nested inside this one.
        <ActivityCalendar
          selectedDate={selectedDate}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          markedDates={markedDates}
          bare
        />
      ) : (
        <WeekRow
          week={week}
          selectedDate={selectedDate}
          markedDates={markedDates}
          onDayPress={onDayPress}
        />
      )}
    </Card>
  );
}
