import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { Card } from './Card';
import { useTheme } from '../theme/useTheme';

interface CalendarDayMarking {
  marked?: boolean;
  ringed?: boolean;
  selected?: boolean;
}

interface CalendarDayProps {
  date?: DateData;
  state?: '' | 'disabled' | 'today' | 'selected' | 'inactive';
  marking?: CalendarDayMarking;
  onPress?: (date?: DateData) => void;
}

interface ActivityCalendarProps {
  selectedDate: string;
  onDayPress: (date: string) => void;
  onMonthChange: (date: string) => void;
  /** Dates that get the small dot underneath — "something happened this day." */
  markedDates?: string[];
  /** Dates that get the orange ring around the number — "this day counted toward the reward." */
  ringedDates?: string[];
  /**
   * Rewards-specific rendering: ringed days get a green ring + green tint
   * fill ("counts"), and marked-but-unringed days get a solid black fill
   * ("logged, but backdated so it doesn't count") instead of the plain dot
   * — the Workouts calendar has no such distinction to make, so it stays
   * off there.
   */
  showEligibility?: boolean;
  /**
   * Render the grid alone, with no card or shadow of its own.
   *
   * For a caller that is already a card and wants the month inside it --
   * WeekStripCalendar, which puts a week strip and a toggle above the grid
   * and would otherwise be a card nested in a card.
   */
  bare?: boolean;
}

/**
 * The one calendar used across Workouts and Activity — "multi-purpose" in
 * that a day can carry either signal independently (dot = logged, ring =
 * reward-eligible) or both at once, so a backdated entry reads differently
 * from a same-day one at a glance instead of looking identical.
 */
export function ActivityCalendar({
  selectedDate,
  onDayPress,
  onMonthChange,
  markedDates = [],
  ringedDates = [],
  showEligibility = false,
  bare = false,
}: ActivityCalendarProps) {
  const { colors, radius, scheme } = useTheme();

  const markedSet = new Set(markedDates);
  const ringedSet = new Set(ringedDates);

  const marks: Record<string, CalendarDayMarking> = {};
  for (const date of new Set([...markedDates, ...ringedDates])) {
    marks[date] = { marked: markedSet.has(date), ringed: ringedSet.has(date) };
  }
  marks[selectedDate] = { ...marks[selectedDate], selected: true };

  const CalendarDay = useCallback(
    ({ date, state, marking, onPress }: CalendarDayProps) => {
      if (!date) return null;
      const isSelected = !!marking?.selected;
      const isMarked = !!marking?.marked;
      const isRinged = !!marking?.ringed;
      const isToday = state === 'today';
      const isOtherMonth = state === 'disabled' || state === 'inactive';
      const isUncountedComplete = showEligibility && isMarked && !isRinged;

      // A bare number is meaningless read aloud, and the dot and ring carry
      // real information — logged, and reward-eligible — that exists only as
      // colour otherwise. The full date is spelled out because "17" alone
      // gives no way to know which month is on screen.
      const spokenDate = new Date(`${date.dateString}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const marks = [
        isMarked ? 'workout logged' : null,
        isRinged ? 'counts toward reward' : null,
        isUncountedComplete ? "logged, but doesn't count toward the reward" : null,
        isToday ? 'today' : null,
      ].filter(Boolean);

      return (
        <Pressable
          onPress={() => onPress?.(date)}
          accessibilityRole="button"
          accessibilityLabel={[spokenDate, ...marks].join(', ')}
          accessibilityState={{ selected: isSelected }}
          style={{ alignItems: 'center', paddingVertical: 4 }}
        >
          {isSelected ? (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                // The selected day in ink, where it was a violet-to-orange
                // gradient disc. It is a selection, and selections in this
                // app are ink now -- the same fill the tab bar's pill and
                // GradientPill's active state use.
                backgroundColor: colors.textPrimary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.surface, fontWeight: '800', fontSize: 14 }}>
                {date.day}
              </Text>
            </View>
          ) : (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: isRinged ? 2 : isUncountedComplete ? 0 : isToday ? 1.5 : 0,
                borderColor: isRinged ? colors.success : colors.primary,
                // A grey pill for a day that was logged but doesn't count.
                // This was a hardcoded near-black with white on it, which
                // meant the same near-black in both schemes -- a black disc
                // on the light theme and, on the dark one, a disc the same
                // colour as the page it sat on. The border token is the
                // app's neutral fill and moves with the scheme, so the pill
                // reads as "marked, not counted" either way.
                backgroundColor: isRinged
                  ? `${colors.success}22`
                  : isUncountedComplete
                    ? colors.border
                    : 'transparent',
              }}
            >
              <Text
                style={{
                  color: isUncountedComplete
                    ? colors.textPrimary
                    : isOtherMonth
                      ? colors.textMuted
                      : isToday
                        ? colors.primary
                        : colors.textPrimary,
                  fontWeight: isToday || isRinged || isUncountedComplete ? '700' : '500',
                  opacity: isOtherMonth ? 0.4 : 1,
                }}
              >
                {date.day}
              </Text>
            </View>
          )}
          {!showEligibility ? (
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                marginTop: 3,
                backgroundColor: isMarked && !isSelected ? colors.primary : 'transparent',
              }}
            />
          ) : null}
        </Pressable>
      );
    },
    [
      colors.border,
      colors.primary,
      colors.success,
      colors.surface,
      colors.textMuted,
      colors.textPrimary,
      showEligibility,
    ]
  );

  const grid = (
    <Calendar
      key={scheme}
      current={selectedDate}
      onDayPress={(day: DateData) => onDayPress(day.dateString)}
      onMonthChange={(month: DateData) => onMonthChange(month.dateString)}
      markedDates={marks}
      dayComponent={CalendarDay}
      renderArrow={(direction: 'left' | 'right') => (
        <Ionicons
          name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
          size={20}
          color={colors.textSecondary}
        />
      )}
      theme={{
        backgroundColor: colors.surface,
        calendarBackground: colors.surface,
        textSectionTitleColor: colors.textSecondary,
        dayTextColor: colors.textPrimary,
        monthTextColor: colors.textPrimary,
        textMonthFontWeight: '700',
        todayTextColor: colors.primary,
        arrowColor: colors.primary,
      }}
    />
  );

  if (bare) return grid;

  // A neutral shadow, where this was a violet glow borrowed from
  // `gradients.calendar` -- the same borrowed-ramp habit the glyphs had.
  return (
    <View
      style={{
        borderRadius: radius.lg,
        shadowColor: '#000',
        shadowOpacity: scheme === 'dark' ? 0.3 : 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}
    >
      <Card>{grid}</Card>
    </View>
  );
}
