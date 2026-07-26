import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { GradientNumberBadge } from './GradientNumberBadge';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface DateRangeCalendarProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}

interface RangeDayProps {
  date?: DateData;
  state?: '' | 'disabled' | 'today' | 'selected' | 'inactive';
  onPress?: (date?: DateData) => void;
}

/**
 * Two-tap range picker: first tap sets the start (and a zero-length end),
 * second tap (on/after start) sets the end. Tapping before the current
 * start restarts the selection rather than erroring, so there's no way to
 * get stuck.
 */
export function DateRangeCalendar({ start, end, onChange }: DateRangeCalendarProps) {
  const { colors, spacing, scheme } = useTheme();
  const [pickingEnd, setPickingEnd] = useState(false);

  const onDayPress = useCallback(
    (day: DateData) => {
      const d = day.dateString;
      if (!pickingEnd || d < start) {
        onChange(d, d);
        setPickingEnd(true);
      } else {
        onChange(start, d);
        setPickingEnd(false);
      }
    },
    [pickingEnd, start, onChange]
  );

  const RangeDay = useCallback(
    ({ date, state, onPress }: RangeDayProps) => {
      if (!date) return null;
      const inRange = date.dateString >= start && date.dateString <= end;
      const isEndpoint = date.dateString === start || date.dateString === end;
      const isOtherMonth = state === 'disabled' || state === 'inactive';

      return (
        <Pressable onPress={() => onPress?.(date)} style={{ alignItems: 'center', paddingVertical: 4 }}>
          {isEndpoint ? (
            <GradientNumberBadge value={date.day} colors={gradients.calendar} size={30} fontSize={13} />
          ) : (
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: inRange ? colors.primaryMuted : 'transparent',
              }}
            >
              <Text
                style={{
                  color: isOtherMonth ? colors.textMuted : colors.textPrimary,
                  opacity: isOtherMonth ? 0.4 : 1,
                  fontSize: 13,
                }}
              >
                {date.day}
              </Text>
            </View>
          )}
        </Pressable>
      );
    },
    [start, end, colors.primaryMuted, colors.textMuted, colors.textPrimary]
  );

  return (
    <View style={{ gap: spacing.xs }}>
      <Calendar
        key={scheme}
        current={end}
        onDayPress={onDayPress}
        dayComponent={RangeDay}
        renderArrow={(direction: 'left' | 'right') => (
          <Ionicons
            name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
            size={18}
            color={colors.primary}
          />
        )}
        theme={{
          backgroundColor: colors.surface,
          calendarBackground: colors.surface,
          textSectionTitleColor: colors.textSecondary,
          monthTextColor: colors.textPrimary,
          textMonthFontWeight: '700',
          arrowColor: colors.primary,
        }}
      />
      <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
        {pickingEnd ? 'Tap an end date' : 'Tap a start date'}
      </Text>
    </View>
  );
}
