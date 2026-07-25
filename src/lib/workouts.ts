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

export async function saveWorkout(
  userId: string,
  date: string,
  exercises: LoggedExercise[]
): Promise<void> {
  if (exercises.length === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (existingError) throw existingError;

  let workoutId = existing?.id;

  if (!workoutId) {
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({ user_id: userId, date })
      .select('id')
      .single();

    if (workoutError) throw workoutError;
    workoutId = workout.id;
  }

  const { data: loggedRows, error: loggedError } = await supabase
    .from('logged_exercises')
    .insert(
      exercises.map((e) => ({ workout_id: workoutId, exercise_id: e.exerciseId }))
    )
    .select('id, exercise_id')
    .order('id');

  if (loggedError) throw loggedError;

  const loggedByExerciseId = new Map<string, string[]>();
  for (const row of loggedRows) {
    const ids = loggedByExerciseId.get(row.exercise_id) ?? [];
    ids.push(row.id);
    loggedByExerciseId.set(row.exercise_id, ids);
  }

  const setRows = exercises.flatMap((e) => {
    const loggedId = loggedByExerciseId.get(e.exerciseId)?.shift();
    if (!loggedId) return [];
    return e.sets.map((s) => ({
      logged_exercise_id: loggedId,
      set_number: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      duration_minutes: s.durationMinutes || null,
      distance: s.distance || null,
    }));
  });

  if (setRows.length > 0) {
    const { error: setsError } = await supabase.from('set_entries').insert(setRows);
    if (setsError) throw setsError;
  }
}
