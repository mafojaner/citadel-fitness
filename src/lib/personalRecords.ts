import { supabase } from './supabase';
import { convertDistance, convertWeight, roundForDisplay } from './units';
import type { Category, DistanceUnit, ExerciseType, WeightUnit } from '../types/models';

/**
 * Above about 12 reps the Epley estimate drifts badly — it implies a 20-rep
 * set predicts a 1RM two thirds higher than the weight lifted, which is not
 * true for most people. Sets beyond this are still counted for heaviest
 * weight and volume, just not used to estimate a max.
 */
const MAX_REPS_FOR_ONE_REP_MAX = 12;

/** Epley: the most widely used estimate, and exact at a single rep. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0 || reps > MAX_REPS_FOR_ONE_REP_MAX) return 0;
  return weight * (1 + reps / 30);
}

export interface RecordSet {
  date: string;
  reps: number;
  /** Already converted into the caller's display unit. */
  weight: number;
  durationSeconds: number;
  /** Already converted into the caller's display unit. */
  distance: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  category: Category;
  type: ExerciseType;
  /** Heaviest single set, and what it was for. Zero when nothing qualifies. */
  heaviestWeight: number;
  heaviestWeightReps: number;
  heaviestWeightDate: string | null;
  estimatedOneRepMax: number;
  estimatedOneRepMaxDate: string | null;
  longestDurationSeconds: number;
  longestDurationDate: string | null;
  farthestDistance: number;
  farthestDistanceDate: string | null;
  /** Most total volume (or minutes, for cardio) in one day. */
  bestSessionValue: number;
  bestSessionDate: string | null;
  totalSets: number;
  lastPerformed: string;
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  category: Category;
  type: ExerciseType;
  sets: RecordSet[];
}

/**
 * Derives records from already-converted sets. Split out from the fetch so
 * the arithmetic — which is the part that can silently be wrong — is
 * testable without a database.
 *
 * Ties go to the earliest date: a record belongs to the session that first
 * achieved it, not the most recent one to equal it.
 */
export function computePersonalRecords(histories: ExerciseHistory[]): PersonalRecord[] {
  const records: PersonalRecord[] = [];

  for (const history of histories) {
    if (history.sets.length === 0) continue;

    let heaviestWeight = 0;
    let heaviestWeightReps = 0;
    let heaviestWeightDate: string | null = null;
    let estimatedOneRepMax = 0;
    let estimatedOneRepMaxDate: string | null = null;
    let longestDurationSeconds = 0;
    let longestDurationDate: string | null = null;
    let farthestDistance = 0;
    let farthestDistanceDate: string | null = null;
    let lastPerformed = history.sets[0].date;

    const valueByDate = new Map<string, number>();
    const cardio = history.type === 'cardio';

    for (const set of history.sets) {
      if (set.date > lastPerformed) lastPerformed = set.date;

      if (set.weight > heaviestWeight) {
        heaviestWeight = set.weight;
        heaviestWeightReps = set.reps;
        heaviestWeightDate = set.date;
      }

      const oneRepMax = estimateOneRepMax(set.weight, set.reps);
      if (oneRepMax > estimatedOneRepMax) {
        estimatedOneRepMax = oneRepMax;
        estimatedOneRepMaxDate = set.date;
      }

      if (set.durationSeconds > longestDurationSeconds) {
        longestDurationSeconds = set.durationSeconds;
        longestDurationDate = set.date;
      }

      if (set.distance > farthestDistance) {
        farthestDistance = set.distance;
        farthestDistanceDate = set.date;
      }

      // Cardio has no weight to multiply, so its "session best" is minutes.
      const contribution = cardio ? set.durationSeconds / 60 : set.reps * set.weight;
      valueByDate.set(set.date, (valueByDate.get(set.date) ?? 0) + contribution);
    }

    let bestSessionValue = 0;
    let bestSessionDate: string | null = null;
    // Sorted so an equal-best day resolves to the earlier one, matching how
    // the single-set records above break their ties.
    for (const [date, value] of Array.from(valueByDate.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (value > bestSessionValue) {
        bestSessionValue = value;
        bestSessionDate = date;
      }
    }

    records.push({
      exerciseId: history.exerciseId,
      exerciseName: history.exerciseName,
      category: history.category,
      type: history.type,
      heaviestWeight: roundForDisplay(heaviestWeight),
      heaviestWeightReps,
      heaviestWeightDate,
      estimatedOneRepMax: roundForDisplay(estimatedOneRepMax),
      estimatedOneRepMaxDate,
      longestDurationSeconds,
      longestDurationDate,
      farthestDistance: roundForDisplay(farthestDistance),
      farthestDistanceDate,
      bestSessionValue: roundForDisplay(bestSessionValue),
      bestSessionDate,
      totalSets: history.sets.length,
      lastPerformed,
    });
  }

  return records.sort((a, b) => (a.lastPerformed < b.lastPerformed ? 1 : -1));
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
 * Every set the user has ever logged, grouped per exercise and converted
 * into their current display units. Units are converted per set rather than
 * per exercise because a set carries whichever unit was active when it was
 * logged — see 20260101000009_set_entry_units.sql — so comparing raw stored
 * numbers would rank a 100 lb set above a 60 kg one.
 */
export async function fetchPersonalRecords(
  userId: string,
  displayWeightUnit: WeightUnit,
  displayDistanceUnit: DistanceUnit
): Promise<PersonalRecord[]> {
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

  return computePersonalRecords(Array.from(byExercise.values()));
}
