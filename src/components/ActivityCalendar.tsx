import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { Card } from './Card';
import { GradientNumberBadge } from './GradientNumberBadge';
import { gradients } from '../theme/tokens';
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

      return (
        <Pressable onPress={() => onPress?.(date)} style={{ alignItems: 'center', paddingVertical: 4 }}>
          {isSelected ? (
            <GradientNumberBadge value={date.day} colors={gradients.calendar} size={32} fontSize={14} />
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
                backgroundColor: isRinged
                  ? `${colors.success}22`
                  : isUncountedComplete
                    ? '#0B0E14'
                    : 'transparent',
              }}
            >
              <Text
                style={{
                  color: isUncountedComplete
                    ? '#FFFFFF'
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
    [colors.primary, colors.success, colors.textMuted, colors.textPrimary, showEligibility]
  );

  return (
    <View
      style={{
        borderRadius: radius.lg,
        shadowColor: gradients.calendar[1],
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}
    >
      <Card>
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
              color={colors.primary}
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
      </Card>
    </View>
  );
}
