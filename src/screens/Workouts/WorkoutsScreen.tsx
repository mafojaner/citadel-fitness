import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientNumberBadge } from '../../components/GradientNumberBadge';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { todayISO } from '../../lib/analytics';
import { fetchWorkoutForDate, fetchWorkoutDatesInRange, type WorkoutDetailExercise } from '../../lib/workouts';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

function monthRange(dateString: string) {
  const [year, month] = dateString.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function summarize(exercises: WorkoutDetailExercise[]) {
  const byCategory = new Map<Category, number>();
  for (const e of exercises) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
  }
  return Array.from(byCategory.entries());
}

function formatDayLabel(dateString: string, today: string) {
  if (dateString === today) return 'Today';
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

interface CalendarDayMarking {
  marked?: boolean;
  selected?: boolean;
}

interface CalendarDayProps {
  date?: DateData;
  state?: '' | 'disabled' | 'today' | 'selected' | 'inactive';
  marking?: CalendarDayMarking;
  onPress?: (date?: DateData) => void;
}

export function WorkoutsScreen() {
  const { colors, spacing, radius, typography, scheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const ensureDraftFor = useWorkoutDraftStore((s) => s.ensureDraftFor);
  const loadDraftFromExisting = useWorkoutDraftStore((s) => s.loadFromExisting);
  const userId = useAuthStore((s) => s.session?.user.id);
  const units = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [dayExercises, setDayExercises] = useState<WorkoutDetailExercise[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMonth = useCallback(
    async (dateString: string) => {
      if (!userId) return;
      const { start, end } = monthRange(dateString);
      try {
        const dates = await fetchWorkoutDatesInRange(userId, start, end);
        setMarkedDates(dates);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your workout calendar');
      }
    },
    [userId]
  );

  const loadDay = useCallback(
    async (dateString: string) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchWorkoutForDate(userId, dateString);
        setDayExercises(result);
      } catch (err) {
        setDayExercises(null);
        setError(err instanceof Error ? err.message : 'Failed to load this day');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const reload = useCallback(() => {
    loadMonth(selectedDate);
    loadDay(selectedDate);
  }, [loadMonth, loadDay, selectedDate]);

  useFocusEffect(reload);

  const onEnterWorkout = () => {
    if (dayExercises && dayExercises.length > 0) {
      loadDraftFromExisting(selectedDate, dayExercises, units, distanceUnit);
    } else {
      // Keeps an unsaved draft for this day rather than discarding it.
      ensureDraftFor(selectedDate);
    }
    navigation.navigate('AddWorkout');
  };

  const marks = Object.fromEntries(
    markedDates.map((d) => [d, { marked: true, selected: d === selectedDate }])
  );
  if (!marks[selectedDate]) {
    marks[selectedDate] = { marked: false, selected: true };
  }

  const summary = dayExercises ? summarize(dayExercises) : [];

  const CalendarDay = useCallback(
    ({ date, state, marking, onPress }: CalendarDayProps) => {
      if (!date) return null;
      const isSelected = !!marking?.selected;
      const isMarked = !!marking?.marked;
      const isToday = state === 'today';
      const isOtherMonth = state === 'disabled' || state === 'inactive';

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
                borderWidth: isToday ? 1.5 : 0,
                borderColor: colors.primary,
              }}
            >
              <Text
                style={{
                  color: isOtherMonth ? colors.textMuted : isToday ? colors.primary : colors.textPrimary,
                  fontWeight: isToday ? '700' : '500',
                  opacity: isOtherMonth ? 0.4 : 1,
                }}
              >
                {date.day}
              </Text>
            </View>
          )}
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              marginTop: 3,
              backgroundColor: isMarked && !isSelected ? colors.primary : 'transparent',
            }}
          />
        </Pressable>
      );
    },
    [colors.primary, colors.textMuted, colors.textPrimary]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Workouts" placeholder="Search workouts..." />
      <ScreenContainer>
      <GradientButton
        label={dayExercises && dayExercises.length > 0 ? 'Edit workout' : 'Enter a workout'}
        onPress={onEnterWorkout}
      />

      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

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
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={(month: DateData) => loadMonth(month.dateString)}
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

      <AnimatedPressable
        onPress={() => navigation.navigate('DayDetail', { date: selectedDate })}
        scaleTo={0.98}
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>
              {formatDayLabel(selectedDate, today)}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : error ? (
            <Text style={[typography.body, { color: colors.danger }]}>
              Couldn&apos;t load this day.
            </Text>
          ) : summary.length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <GradientIconBadge icon="calendar" colors={gradients.calendar} size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  No workout logged
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Tap to log one for this day
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {summary.map(([category, count]) => (
                <View key={category} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <GradientIconBadge
                    icon={CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON}
                    colors={CATEGORY_GRADIENTS[category] ?? DEFAULT_CATEGORY_GRADIENT}
                    size={28}
                  />
                  <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                    {category[0].toUpperCase() + category.slice(1)}
                  </Text>
                  <StatChip icon="barbell-outline" value={`${count} exercise${count === 1 ? '' : 's'}`} />
                </View>
              ))}
            </View>
          )}
        </Card>
      </AnimatedPressable>
      </ScreenContainer>
    </View>
  );
}
