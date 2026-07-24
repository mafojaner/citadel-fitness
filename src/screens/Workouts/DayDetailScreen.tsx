import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { fetchWorkoutForDate, type WorkoutDetailExercise } from '../../lib/workouts';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

export function DayDetailScreen() {
  const { colors, spacing, typography } = useTheme();
  const route = useRoute<RouteProp<WorkoutsStackParamList, 'DayDetail'>>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const units = useProfileStore((s) => s.preferences.units);
  const [exercises, setExercises] = useState<WorkoutDetailExercise[] | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      setLoading(true);
      fetchWorkoutForDate(userId, route.params.date)
        .then(setExercises)
        .finally(() => setLoading(false));
    }, [userId, route.params.date])
  );

  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutDetailExercise[]>();
    for (const e of exercises ?? []) {
      const list = map.get(e.category) ?? [];
      list.push(e);
      map.set(e.category, list);
    }
    return Array.from(map.entries());
  }, [exercises]);

  return (
    <ScreenContainer>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : !exercises || exercises.length === 0 ? (
        <Card title={route.params.date}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No exercises logged for this day yet.
          </Text>
        </Card>
      ) : (
        grouped.map(([category, categoryExercises]) => (
          <Card key={category} title={category[0].toUpperCase() + category.slice(1)}>
            {categoryExercises.map((exercise) => (
              <View key={exercise.id} style={{ gap: spacing.xs }}>
                <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                  {exercise.exerciseName}
                </Text>
                {exercise.sets.map((set) => (
                  <Text key={set.id} style={[typography.caption, { color: colors.textSecondary }]}>
                    Set {set.setNumber} — {set.reps} reps @ {set.weight} {units}
                  </Text>
                ))}
              </View>
            ))}
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}
