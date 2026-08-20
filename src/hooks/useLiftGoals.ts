import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  deleteLiftGoal,
  fetchGoalProjections,
  fetchLiftGoals,
  saveLiftGoal,
  type GoalProjection,
} from '../lib/goals';
import { fetchExerciseHistories } from '../lib/workoutHistory';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';
import type { WeightUnit } from '../types/models';

export function useLiftGoals() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const [projections, setProjections] = useState<GoalProjection[]>([]);
  const [liftedExercises, setLiftedExercises] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Goals and history in parallel, then projections, which need the goals
    // to merge onto. History is still fetched because the picker below is
    // built from it — that is the user's own logged data and deliberately
    // ungated, unlike the projection itself, which the server now computes.
    Promise.all([fetchLiftGoals(userId), fetchExerciseHistories(userId, weightUnit, distanceUnit)])
      .then(async ([goals, histories]) => {
        if (cancelled) return;
        setProjections(await fetchGoalProjections(goals));
        // Only strength lifts the user has actually logged: a projection is
        // fitted to their own history, so offering the full 125-exercise
        // catalogue would mostly offer goals that can never show a trend.
        setLiftedExercises(
          histories
            .filter((h) => h.type === 'strength')
            .map((h) => ({ id: h.exerciseId, name: h.exerciseName }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your goals');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, weightUnit, distanceUnit]);

  useFocusEffect(load);

  const addGoal = useCallback(
    async (exerciseId: string, targetWeight: number, targetUnit: WeightUnit, targetDate: string) => {
      if (!userId) return;
      setSaving(true);
      setError(null);
      try {
        await saveLiftGoal(userId, exerciseId, targetWeight, targetUnit, targetDate);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save that goal');
      } finally {
        setSaving(false);
      }
    },
    [userId, load]
  );

  const removeGoal = useCallback(
    async (goalId: string) => {
      setSaving(true);
      setError(null);
      try {
        await deleteLiftGoal(goalId);
        setProjections((prev) => prev.filter((p) => p.goal.id !== goalId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove that goal');
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { projections, liftedExercises, loading, saving, error, reload: load, addGoal, removeGoal };
}
