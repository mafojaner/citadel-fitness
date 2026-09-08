import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  deleteLiftGoal,
  fetchGoalProjections,
  fetchLiftGoals,
  saveLiftGoal,
  type GoalProjection,
} from '../lib/goals';
import { estimateOneRepMax } from '../lib/personalRecords';
import { roundForDisplay } from '../lib/units';
import { fetchExerciseHistories } from '../lib/workoutHistory';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';
import type { WeightUnit } from '../types/models';

export interface LiftedExercise {
  id: string;
  name: string;
  /**
   * The best estimated one-rep max ever logged for this lift, in the
   * display unit -- which is the number a goal on it is scored against.
   *
   * This was the heaviest *set* instead, and the two are not the same
   * quantity. A member whose best bench was 70 kg for 5 was shown "best so
   * far: 70 kg" and offered 72.5, 77.5 and 85 as targets; the projection
   * then compared those against an estimated max of 82.3, so two of the
   * three suggestions came back Achieved the instant they were saved. The
   * form was measuring one thing and the forecast another, and nothing on
   * the screen said so.
   *
   * Zero for a lift only ever done above twelve reps, where Epley stops
   * being honest and `estimateOneRepMax` refuses to guess. The form falls
   * back to its plain input, which is the same thing it already does for a
   * bodyweight-only lift.
   */
  best: number;
  /**
   * The heaviest set actually lifted, and for how many. Shown beside the
   * estimate because 82.3 kg is a weight this member has never had on a
   * bar, and a target set against it needs to say where it came from.
   */
  heaviestWeight: number;
  heaviestReps: number;
  /** ISO date of the most recent set, for the same reason. */
  lastLogged: string | null;
}

export function useLiftGoals() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const [projections, setProjections] = useState<GoalProjection[]>([]);
  const [liftedExercises, setLiftedExercises] = useState<LiftedExercise[]>([]);
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
            .map((h) => {
              // The heaviest set is still tracked, but only to explain the
              // estimate beside it -- the estimate is what a goal is judged
              // against, so it is what the suggestions step up from.
              const heaviest = h.sets.reduce(
                (best, set) => (set.weight > best.weight ? set : best),
                { weight: 0, reps: 0 }
              );
              return {
                id: h.exerciseId,
                name: h.exerciseName,
                best: roundForDisplay(
                  h.sets.reduce((max, set) => Math.max(max, estimateOneRepMax(set.weight, set.reps)), 0)
                ),
                heaviestWeight: roundForDisplay(heaviest.weight),
                heaviestReps: heaviest.reps,
                lastLogged: h.sets.reduce<string | null>(
                  (latest, set) => (latest === null || set.date > latest ? set.date : latest),
                  null
                ),
              };
            })
            // Most recently trained first, not alphabetical. The lift you
            // are about to set a goal on is overwhelmingly the one you were
            // just doing, and an A-Z list buries it behind whatever happens
            // to start with a B.
            .sort((a, b) => (b.lastLogged ?? '').localeCompare(a.lastLogged ?? ''))
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
