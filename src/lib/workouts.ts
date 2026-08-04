import { supabase } from './supabase';
import type {
  Category,
  DistanceUnit,
  Exercise,
  ExerciseType,
  LoggedExercise,
  WeightUnit,
} from '../types/models';

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, category, type, description')
    .order('category')
    .order('name');

  if (error) throw error;
  return data as Exercise[];
}

export async function fetchWorkoutDatesInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('date')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => row.date as string)));
}

interface DbSetEntry {
  id: string;
  set_number: number;
  reps: number;
  weight: number;
  weight_unit: WeightUnit;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: DistanceUnit;
}

interface DbLoggedExercise {
  id: string;
  exercise_id: string;
  exercises: { name: string; category: Category; type: ExerciseType } | null;
  set_entries: DbSetEntry[];
}

export interface WorkoutDetailExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: Category;
  type: ExerciseType;
  sets: {
    id: string;
    setNumber: number;
    reps: number;
    weight: number;
    weightUnit: WeightUnit;
    durationSeconds: number;
    distance: number;
    distanceUnit: DistanceUnit;
  }[];
}

export async function fetchWorkoutForDate(
  userId: string,
  date: string
): Promise<WorkoutDetailExercise[] | null> {
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (workoutError) throw workoutError;
  if (!workout) return null;

  const { data, error } = await supabase
    .from('logged_exercises')
    .select(
      'id, exercise_id, exercises ( name, category, type ), set_entries ( id, set_number, reps, weight, weight_unit, duration_seconds, distance, distance_unit )'
    )
    .eq('workout_id', workout.id)
    .returns<DbLoggedExercise[]>();

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercises?.name ?? 'Unknown exercise',
    category: row.exercises?.category ?? 'chest',
    type: row.exercises?.type ?? 'strength',
    sets: [...row.set_entries]
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        id: s.id,
        setNumber: s.set_number,
        reps: s.reps,
        weight: s.weight,
        weightUnit: s.weight_unit,
        durationSeconds: s.duration_seconds ?? 0,
        distance: s.distance ?? 0,
        distanceUnit: s.distance_unit,
      })),
  }));
}

/**
 * Saves (or replaces) the workout for a given day.
 *
 * Delegates to the `save_workout` Postgres function so the delete-then-insert
 * happens inside a single transaction. Doing it as separate client requests
 * meant a failure partway through could destroy the existing day's data
 * without writing the replacement. See
 * supabase/migration_005_transactional_save_workout.sql.
 *
 * The user id is resolved from auth.uid() server-side, so it isn't passed in.
 *
 * weightUnit/distanceUnit are the units active *right now* — every set in
 * this save is tagged with them, so a later unit-preference switch can
 * never change what a past entry means. See
 * supabase/migration_009_set_entry_units.sql.
 */
export async function saveWorkout(
  date: string,
  exercises: LoggedExercise[],
  weightUnit: WeightUnit,
  distanceUnit: DistanceUnit
): Promise<void> {
  if (exercises.length === 0) return;

  const payload = exercises.map((e) => ({
    exercise_id: e.exerciseId,
    sets: e.sets.map((s) => ({
      set_number: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      duration_seconds: s.durationSeconds || null,
      distance: s.distance || null,
    })),
  }));

  const { error } = await supabase.rpc('save_workout', {
    p_date: date,
    p_exercises: payload,
    p_weight_unit: weightUnit,
    p_distance_unit: distanceUnit,
  });

  if (error) throw error;
}

export async function deleteWorkoutForDate(userId: string, date: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('user_id', userId).eq('date', date);
  if (error) throw error;
}
