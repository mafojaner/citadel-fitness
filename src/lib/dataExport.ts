import { toCsv } from './csv';
import { supabase } from './supabase';
import type { Category, DistanceUnit, ExerciseType, WeightUnit } from '../types/models';

interface DbSet {
  set_number: number;
  reps: number;
  weight: number;
  weight_unit: WeightUnit;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: DistanceUnit;
}

interface DbLogged {
  exercises: { name: string; category: Category; type: ExerciseType } | null;
  set_entries: DbSet[];
}

interface DbWorkout {
  date: string;
  logged_same_day: boolean | null;
  logged_exercises: DbLogged[];
}

const HEADERS = [
  'date',
  'exercise',
  'category',
  'type',
  'set_number',
  'reps',
  'weight',
  'weight_unit',
  'duration_seconds',
  'distance',
  'distance_unit',
  'logged_same_day',
];

/**
 * Exports exactly what is stored, deliberately without converting units.
 *
 * Every other feature converts sets into the user's current display unit so
 * mixed history aggregates correctly. An export should do the opposite: a
 * set logged in kg is exported as kg with its unit beside it, so the file
 * is a faithful record rather than a snapshot of whichever preference
 * happened to be set the day it was downloaded. Converting would also make
 * the export lossy and non-reproducible.
 *
 * Rows are one per set, which is the shape a spreadsheet can pivot; a
 * nested-per-workout layout would need unpacking before it's useful.
 */
export function buildWorkoutCsv(workouts: DbWorkout[]): string {
  const rows: (string | number | null)[][] = [];

  const chronological = [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1));

  for (const workout of chronological) {
    for (const logged of workout.logged_exercises) {
      const sets = [...logged.set_entries].sort((a, b) => a.set_number - b.set_number);
      for (const set of sets) {
        rows.push([
          workout.date,
          logged.exercises?.name ?? 'Unknown exercise',
          logged.exercises?.category ?? '',
          logged.exercises?.type ?? '',
          set.set_number,
          set.reps,
          set.weight,
          set.weight_unit,
          set.duration_seconds ?? '',
          set.distance ?? '',
          set.distance_unit,
          workout.logged_same_day === null ? '' : String(workout.logged_same_day),
        ]);
      }
    }
  }

  return toCsv(HEADERS, rows);
}

export interface WorkoutExport {
  csv: string;
  filename: string;
  /** Sets exported, so the UI can say what was produced instead of guessing. */
  rowCount: number;
}

/** How much history to export. */
export type ExportRange = 'all' | '30' | '90' | '365';

export const EXPORT_RANGES: { label: string; value: ExportRange }[] = [
  { label: 'Everything', value: 'all' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'Last year', value: '365' },
];

/**
 * The earliest date a range includes, or null for everything.
 *
 * Exported rather than inlined so it can be reasoned about on its own: an
 * off-by-one here silently drops or adds a day of someone's training
 * history, which is the kind of error an export is least likely to have
 * noticed.
 */
export function rangeStart(range: ExportRange, today = new Date()): string | null {
  if (range === 'all') return null;
  const d = new Date(today);
  // Inclusive of today, so "last 30 days" is thirty days including this one
  // rather than thirty-one.
  d.setDate(d.getDate() - (Number(range) - 1));
  return d.toISOString().slice(0, 10);
}

export async function exportWorkoutHistory(
  userId: string,
  range: ExportRange = 'all'
): Promise<WorkoutExport> {
  const from = rangeStart(range);
  let query = supabase
    .from('workouts')
    .select(
      'date, logged_same_day, logged_exercises ( exercises ( name, category, type ), set_entries ( set_number, reps, weight, weight_unit, duration_seconds, distance, distance_unit ) )'
    )
    .eq('user_id', userId);

  // Filtered server-side rather than after the fact. Exporting four years to
  // inspect last month is a spreadsheet problem the app can solve, and
  // pulling it all down first would solve nothing.
  if (from !== null) query = query.gte('date', from);

  const { data, error } = await query.returns<DbWorkout[]>();

  if (error) throw error;

  const workouts = data ?? [];
  const csv = buildWorkoutCsv(workouts);
  const rowCount = workouts.reduce(
    (sum, w) => sum + w.logged_exercises.reduce((n, l) => n + l.set_entries.length, 0),
    0
  );

  const stamp = new Date().toISOString().slice(0, 10);
  // The range is in the filename, so two exports taken the same day are
  // told apart by the file rather than by remembering which was which.
  const suffix = range === 'all' ? '' : `-last-${range}d`;
  return { csv, filename: `citadel-fitness-workouts${suffix}-${stamp}.csv`, rowCount };
}
