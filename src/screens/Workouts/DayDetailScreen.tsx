import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { fetchWorkoutForDate, type WorkoutDetailExercise } from '../../lib/workouts';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

export function DayDetailScreen() {
  const { colors, spacing, typography } = useTheme();
  const route = useRoute<RouteProp<WorkoutsStackParamList, 'DayDetail'>>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const units = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
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
    const map = new Map<Category, WorkoutDetailExercise[]>();
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
          <Card key={category}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <GradientIconBadge
                icon={CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON}
                colors={CATEGORY_GRADIENTS[category] ?? DEFAULT_CATEGORY_GRADIENT}
                size={40}
              />
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                {category[0].toUpperCase() + category.slice(1)}
              </Text>
            </View>

            {categoryExercises.map((exercise) => (
              <View
                key={exercise.id}
                style={{
                  gap: spacing.sm,
                  paddingTop: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {exercise.exerciseName}
                </Text>
                {exercise.sets.map((set) => (
                  <View key={set.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 11 }}>
                        {set.setNumber}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flex: 1 }}>
                      {exercise.type === 'cardio' ? (
                        <>
                          <StatChip icon="time-outline" value={`${set.durationMinutes} min`} />
                          {set.distance ? (
                            <StatChip icon="navigate-outline" value={`${set.distance} ${distanceUnit}`} />
                          ) : null}
                        </>
                      ) : (
                        <>
                          <StatChip icon="repeat-outline" value={`${set.reps} reps`} />
                          <StatChip icon="barbell-outline" value={`${set.weight} ${units}`} />
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}
