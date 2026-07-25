import { supabase } from './supabase';
import type { Category, Exercise, ExerciseType, LoggedExercise } from '../types/models';

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, category, type')
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
  duration_minutes: number | null;
  distance: number | null;
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
    durationMinutes: number;
    distance: number;
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
      'id, exercise_id, exercises ( name, category, type ), set_entries ( id, set_number, reps, weight, duration_minutes, distance )'
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
        durationMinutes: s.duration_minutes ?? 0,
        distance: s.distance ?? 0,
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
 */
export async function saveWorkout(date: string, exercises: LoggedExercise[]): Promise<void> {
  if (exercises.length === 0) return;

  const payload = exercises.map((e) => ({
    exercise_id: e.exerciseId,
    sets: e.sets.map((s) => ({
      set_number: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      duration_minutes: s.durationMinutes || null,
      distance: s.distance || null,
    })),
  }));

  const { error } = await supabase.rpc('save_workout', {
    p_date: date,
    p_exercises: payload,
  });

  if (error) throw error;
}

export async function deleteWorkoutForDate(userId: string, date: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('user_id', userId).eq('date', date);
  if (error) throw error;
}
