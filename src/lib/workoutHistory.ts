import { supabase } from './supabase';
import { convertDistance, convertWeight } from './units';
import type { Category, DistanceUnit, ExerciseType, WeightUnit } from '../types/models';

export interface RecordSet {
  date: string;
  reps: number;
  /** Already converted into the caller's display unit. */
  weight: number;
  durationSeconds: number;
  /** Already converted into the caller's display unit. */
  distance: number;
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  category: Category;
  type: ExerciseType;
  sets: RecordSet[];
}

interface DbSet {
  reps: number;
  weight: number;
  weight_unit: WeightUnit;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: DistanceUnit;
}

interface DbLogged {
  exercise_id: string;
  exercises: { name: string; category: Category; type: ExerciseType } | null;
  set_entries: DbSet[];
}

interface DbWorkout {
  date: string;
  logged_exercises: DbLogged[];
}

/**
 * Every set the user has logged, grouped per exercise and converted into
 * their current display units.
 *
 * Shared rather than duplicated per feature: the personal records vault,
 * advanced analytics and goal forecasting all want the same shape, and
 * three copies of this query would be three places to get the unit
 * conversion wrong. Units convert per set, not per exercise, because a set
 * carries whichever unit was active when it was logged — see
 * 20260101000009_set_entry_units.sql — so comparing raw stored numbers
 * would rank a 100 lb set above a 60 kg one.
 */
export async function fetchExerciseHistories(
  userId: string,
  displayWeightUnit: WeightUnit,
  displayDistanceUnit: DistanceUnit
): Promise<ExerciseHistory[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'date, logged_exercises ( exercise_id, exercises ( name, category, type ), set_entries ( reps, weight, weight_unit, duration_seconds, distance, distance_unit ) )'
    )
    .eq('user_id', userId)
    .returns<DbWorkout[]>();

  if (error) throw error;

  const byExercise = new Map<string, ExerciseHistory>();

  for (const workout of data ?? []) {
    for (const logged of workout.logged_exercises) {
      const existing = byExercise.get(logged.exercise_id) ?? {
        exerciseId: logged.exercise_id,
        exerciseName: logged.exercises?.name ?? 'Unknown exercise',
        category: logged.exercises?.category ?? 'chest',
        type: logged.exercises?.type ?? 'strength',
        sets: [],
      };

      for (const set of logged.set_entries) {
        existing.sets.push({
          date: workout.date,
          reps: set.reps,
          weight: convertWeight(set.weight, set.weight_unit, displayWeightUnit),
          durationSeconds: set.duration_seconds ?? 0,
          distance: convertDistance(set.distance ?? 0, set.distance_unit, displayDistanceUnit),
        });
      }

      byExercise.set(logged.exercise_id, existing);
    }
  }

  return Array.from(byExercise.values());
}
