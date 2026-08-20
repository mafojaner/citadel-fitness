import { supabase } from './supabase';
import { roundForDisplay } from './units';
import { type ExerciseHistory } from './workoutHistory';
import type { Category, DistanceUnit, ExerciseType, WeightUnit } from '../types/models';

/** One row of get_personal_records, snake_case as Postgres returns it. */
interface ServerPersonalRecord {
  exercise_id: string;
  exercise_name: string;
  category: string;
  type: string;
  heaviest_weight: number | string;
  heaviest_weight_reps: number;
  heaviest_weight_date: string | null;
  estimated_one_rep_max: number | string;
  estimated_one_rep_max_date: string | null;
  longest_duration_seconds: number;
  longest_duration_date: string | null;
  farthest_distance: number | string;
  farthest_distance_date: string | null;
  best_session_value: number | string;
  best_session_date: string | null;
  /** bigint — arrives as a string, so every numeric here goes through Number(). */
  total_sets: number | string;
  last_performed: string;
}

export type { ExerciseHistory, RecordSet } from './workoutHistory';

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

/**
 * Records come from the server now, not from history computed here.
 *
 * `computePersonalRecords` above is still the definition of the arithmetic
 * and still carries the tests, but it is no longer what the app runs: the
 * same derivation exists in `get_personal_records`, and that one is gated.
 * Computing locally meant every line of the feature shipped in the bundle,
 * so unlocking it was a matter of flipping the tier check the client itself
 * evaluated. Now a free caller gets an exception from Postgres.
 *
 * The two must not drift. If the Epley cap, the tie-to-earliest rule or a
 * unit constant changes in one, it changes in the other — see the migration,
 * which names this file for the same reason.
 */
export async function fetchPersonalRecords(
  _userId: string,
  displayWeightUnit: WeightUnit,
  displayDistanceUnit: DistanceUnit
): Promise<PersonalRecord[]> {
  const { data, error } = await supabase.rpc('get_personal_records', {
    p_weight_unit: displayWeightUnit,
    p_distance_unit: displayDistanceUnit,
  });
  if (error) throw error;

  return (data ?? []).map((row: ServerPersonalRecord) => ({
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    category: row.category as Category,
    type: row.type as ExerciseType,
    heaviestWeight: roundForDisplay(Number(row.heaviest_weight)),
    heaviestWeightReps: row.heaviest_weight_reps,
    heaviestWeightDate: row.heaviest_weight_date,
    estimatedOneRepMax: roundForDisplay(Number(row.estimated_one_rep_max)),
    estimatedOneRepMaxDate: row.estimated_one_rep_max_date,
    longestDurationSeconds: row.longest_duration_seconds,
    longestDurationDate: row.longest_duration_date,
    farthestDistance: roundForDisplay(Number(row.farthest_distance)),
    farthestDistanceDate: row.farthest_distance_date,
    bestSessionValue: roundForDisplay(Number(row.best_session_value)),
    bestSessionDate: row.best_session_date,
    totalSets: Number(row.total_sets),
    lastPerformed: row.last_performed,
  }));
}
