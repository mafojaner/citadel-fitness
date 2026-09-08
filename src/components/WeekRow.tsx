import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { todayISO } from '../lib/analytics';
import { useTheme } from '../theme/useTheme';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface WeekRowProps {
  /** Seven dates, Sunday first, as `weekOf` returns them. */
  week: string[];
  /** Drawn with the ink pill. Omit for a row with no selection, like the snapshot. */
  selectedDate?: string;
  /** Dates with something logged: a dot under the number. */
  markedDates?: string[];
  /**
   * Omit to make the row inert. Days then render as plain views rather than
   * disabled buttons, so a screen reader walking the snapshot does not
   * announce seven controls that do nothing.
   */
  onDayPress?: (date: string) => void;
}

function dayNumber(dateString: string): string {
  return String(Number(dateString.slice(8, 10)));
}

/**
 * One week as seven columns: initial, day number, dot.
 *
 * Shared by the date picker on Add Workout and the read-only snapshot on
 * Home and Workouts, because the two have to be recognisably the same
 * object -- the snapshot is a preview of the thing you land on. What
 * differs is only whether a day does anything when pressed, which is the
 * one prop below.
 */
export function WeekRow({ week, selectedDate, markedDates = [], onDayPress }: WeekRowProps) {
  const { colors, radius } = useTheme();
  const today = todayISO();
  const marked = new Set(markedDates);
  // A week can straddle two months. Which month the row "is" comes from the
  // selection when there is one, and otherwise from whichever month holds
  // most of the row -- the middle day, which is that month by definition.
  const anchorMonth = (selectedDate ?? week[3]).slice(0, 7);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {week.map((date, index) => {
        const isSelected = date === selectedDate;
        const isToday = date === today;
        // Days on the far side of a month boundary are still real days that
        // may have been trained, so they are drawn -- just stepped back, so
        // the row reads as "this month, mostly".
        const isOtherMonth = date.slice(0, 7) !== anchorMonth;

        const content = (
          <>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
              {WEEKDAY_INITIALS[index]}
            </Text>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                // The same ink pill the month grid gives its selected day, so
                // toggling between the two does not change what "selected"
                // looks like.
                backgroundColor: isSelected ? colors.textPrimary : 'transparent',
                borderWidth: !isSelected && isToday ? 1.5 : 0,
                borderColor: colors.primary,
              }}
            >
              <Text
                style={{
                  fontWeight: isSelected || isToday ? '800' : '500',
                  color: isSelected
                    ? colors.surface
                    : isToday
                      ? colors.primary
                      : colors.textPrimary,
                  opacity: isOtherMonth && !isSelected ? 0.4 : 1,
                }}
              >
                {dayNumber(date)}
              </Text>
            </View>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: radius.pill,
                backgroundColor: marked.has(date) && !isSelected ? colors.primary : 'transparent',
              }}
            />
          </>
        );

        const label = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });

        if (!onDayPress) {
          return (
            <View key={date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              {content}
            </View>
          );
        }

        return (
          <AnimatedPressable
            key={date}
            onPress={() => onDayPress(date)}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            {content}
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
