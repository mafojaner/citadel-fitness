import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ActivityCalendar } from '../../components/ActivityCalendar';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useIsDesktop } from '../../hooks/useResponsiveLayout';
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

export function WorkoutsScreen() {
  const { colors, spacing, typography } = useTheme();
  const isDesktop = useIsDesktop();
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

  const summary = dayExercises ? summarize(dayExercises) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Workouts" showSearch={false} />
      <ScreenContainer>
      {/* Natural width on desktop, matching Home's CTA — see the note there. */}
      <View style={isDesktop ? { alignSelf: 'flex-start', minWidth: 220 } : undefined}>
        <GradientButton
          label={dayExercises && dayExercises.length > 0 ? 'Edit workout' : 'Enter a workout'}
          onPress={onEnterWorkout}
        />
      </View>

      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      <ActivityCalendar
        selectedDate={selectedDate}
        onDayPress={setSelectedDate}
        onMonthChange={loadMonth}
        markedDates={markedDates}
      />

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
