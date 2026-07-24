import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { fetchWorkoutForDate, fetchWorkoutDatesInRange, type WorkoutDetailExercise } from '../../lib/workouts';
import { useAuthStore } from '../../state/authStore';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

function monthRange(dateString: string) {
  const [year, month] = dateString.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  return { start, end };
}

function summarize(exercises: WorkoutDetailExercise[]) {
  const byCategory = new Map<string, number>();
  for (const e of exercises) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
  }
  return Array.from(byCategory.entries());
}

export function WorkoutsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const resetDraft = useWorkoutDraftStore((s) => s.reset);
  const userId = useAuthStore((s) => s.session?.user.id);
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [dayExercises, setDayExercises] = useState<WorkoutDetailExercise[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMonth = useCallback(
    async (dateString: string) => {
      if (!userId) return;
      const { start, end } = monthRange(dateString);
      const dates = await fetchWorkoutDatesInRange(userId, start, end);
      setMarkedDates(dates);
    },
    [userId]
  );

  const loadDay = useCallback(
    async (dateString: string) => {
      if (!userId) return;
      setLoading(true);
      try {
        const result = await fetchWorkoutForDate(userId, dateString);
        setDayExercises(result);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      loadMonth(selectedDate);
      loadDay(selectedDate);
    }, [loadMonth, loadDay, selectedDate])
  );

  const onEnterWorkout = () => {
    resetDraft(selectedDate);
    navigation.navigate('AddWorkout');
  };

  const marks = Object.fromEntries(
    markedDates.map((d) => [
      d,
      { marked: true, dotColor: colors.primary, selected: d === selectedDate, selectedColor: colors.primary },
    ])
  );
  if (!marks[selectedDate]) {
    marks[selectedDate] = {
      marked: false,
      dotColor: colors.primary,
      selected: true,
      selectedColor: colors.primary,
    };
  }

  const summary = dayExercises ? summarize(dayExercises) : [];

  return (
    <ScreenContainer>
      <Pressable
        onPress={onEnterWorkout}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: colors.surface, fontWeight: '700' }}>Enter a workout</Text>
      </Pressable>

      <Card>
        <Calendar
          current={selectedDate}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          onMonthChange={(month: DateData) => loadMonth(month.dateString)}
          markedDates={marks}
          theme={{
            backgroundColor: colors.surface,
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.textSecondary,
            dayTextColor: colors.textPrimary,
            monthTextColor: colors.textPrimary,
            todayTextColor: colors.primary,
            selectedDayBackgroundColor: colors.primary,
            arrowColor: colors.primary,
          }}
        />
      </Card>

      <Pressable
        onPress={() => navigation.navigate('DayDetail', { date: selectedDate })}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card title={`Day Summary — ${selectedDate}`}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : summary.length === 0 ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              No workout logged for this day yet. Tap to view details.
            </Text>
          ) : (
            summary.map(([category, count]) => (
              <Text key={category} style={[typography.body, { color: colors.textSecondary }]}>
                {category[0].toUpperCase() + category.slice(1)} — {count} exercise
                {count === 1 ? '' : 's'}
              </Text>
            ))
          )}
        </Card>
      </Pressable>
    </ScreenContainer>
  );
}
