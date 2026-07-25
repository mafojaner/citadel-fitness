import { supabase } from './supabase';
import type { Category, ExerciseType } from '../types/models';

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Pure UTC calendar math — avoids re-interpreting a date-only string as
// local time and shifting by a day when round-tripped through a timezone
// with a positive UTC offset.
function addDays(dateString: string, delta: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return toISODate(new Date(Date.UTC(year, month - 1, day + delta)));
}

interface DbSetEntry {
  reps: number;
  weight: number;
  duration_minutes: number | null;
}

interface DbLoggedExercise {
  exercises: { category: Category; type: ExerciseType } | null;
  set_entries: DbSetEntry[];
}

interface DbWorkoutRow {
  date: string;
  logged_exercises: DbLoggedExercise[];
}

export interface ProgressPoint {
  label: string;
  value: number;
}

export interface ActivityAnalytics {
  progressSeries: ProgressPoint[];
  workoutsThisWeek: number;
  currentStreakDays: number;
  totalVolumeThisWeek: number;
  /** 'minutes' when scoped to the cardio category, 'volume' (reps x weight) otherwise. */
  metric: 'volume' | 'minutes';
}

const HISTORY_DAYS = 60;

export async function fetchActivityAnalytics(
  userId: string,
  category: Category | 'all'
): Promise<ActivityAnalytics> {
  const today = toISODate(new Date());
  const startDate = addDays(today, -HISTORY_DAYS);
  const metric: 'volume' | 'minutes' = category === 'cardio' ? 'minutes' : 'volume';

  const { data, error } = await supabase
    .from('workouts')
    .select(
      'date, logged_exercises ( exercises ( category, type ), set_entries ( reps, weight, duration_minutes ) )'
    )
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', today)
    .returns<DbWorkoutRow[]>();

  if (error) throw error;

  const volumeByDate = new Map<string, number>();
  const activeDates = new Set<string>();

  for (const workout of data ?? []) {
    for (const logged of workout.logged_exercises) {
      const matches = category === 'all' || logged.exercises?.category === category;
      if (!matches) continue;

      activeDates.add(workout.date);
      const value =
        metric === 'minutes'
          ? logged.set_entries.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
          : logged.set_entries.reduce((sum, s) => sum + s.reps * s.weight, 0);
      volumeByDate.set(workout.date, (volumeByDate.get(workout.date) ?? 0) + value);
    }
  }

  const last7Dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    last7Dates.push(addDays(today, -i));
  }

  const progressSeries = last7Dates.map((date) => ({
    label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
    value: volumeByDate.get(date) ?? 0,
  }));

  const workoutsThisWeek = last7Dates.filter((date) => activeDates.has(date)).length;
  const totalVolumeThisWeek = last7Dates.reduce((sum, date) => sum + (volumeByDate.get(date) ?? 0), 0);

  let currentStreakDays = 0;
  let cursor = activeDates.has(today) ? today : addDays(today, -1);
  while (activeDates.has(cursor)) {
    currentStreakDays += 1;
    cursor = addDays(cursor, -1);
  }

  return { progressSeries, workoutsThisWeek, currentStreakDays, totalVolumeThisWeek, metric };
}

export interface RecentWorkoutSummary {
  date: string;
  totalExercises: number;
  categories: Category[];
}

export async function fetchRecentWorkouts(
  userId: string,
  limit = 3
): Promise<RecentWorkoutSummary[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('date, logged_exercises ( exercises ( category ) )')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
    .returns<{ date: string; logged_exercises: { exercises: { category: Category } | null }[] }[]>();

  if (error) throw error;

  return (data ?? []).map((workout) => {
    const categories = Array.from(
      new Set(
        workout.logged_exercises
          .map((e) => e.exercises?.category)
          .filter((c): c is Category => Boolean(c))
      )
    );
    return { date: workout.date, totalExercises: workout.logged_exercises.length, categories };
  });
}
