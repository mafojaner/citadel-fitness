import { addDays } from './analytics';
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
 * Which of an exercise's five records a date belongs to.
 *
 * Named rather than positional because the screen looks records up by kind:
 * the "set this week" section says *which* record was broken, and the card
 * headline picks the one worth printing large. A number into an array would
 * have both of those depending on the order of a literal.
 */
export type RecordKind =
  | 'heaviestWeight'
  | 'estimatedOneRepMax'
  | 'longestDuration'
  | 'farthestDistance'
  | 'bestSession';

/**
 * Every real record on one exercise, in the order ties resolve.
 *
 * A zero is not a record, and the server hands back plenty of them: a set
 * logged with no weight on it still produces a dated `bestSessionValue` of
 * 0 and a dated heaviest set of 0 kg for 0 reps. The screen printed both --
 * "0 kg × 0, heaviest set" -- and, worse, counted them as personal bests
 * broken this week, so a bodyweight chin-up logged on Tuesday announced two
 * new records of nothing.
 *
 * Filtered here rather than at each call site so the badge on a card, the
 * count above the list and the "new records" section cannot disagree about
 * what qualifies.
 */
function datedRecords(record: PersonalRecord): { kind: RecordKind; date: string }[] {
  return (
    [
      { kind: 'heaviestWeight' as const, date: record.heaviestWeightDate, value: record.heaviestWeight },
      {
        kind: 'estimatedOneRepMax' as const,
        date: record.estimatedOneRepMaxDate,
        value: record.estimatedOneRepMax,
      },
      {
        kind: 'longestDuration' as const,
        date: record.longestDurationDate,
        value: record.longestDurationSeconds,
      },
      { kind: 'farthestDistance' as const, date: record.farthestDistanceDate, value: record.farthestDistance },
      { kind: 'bestSession' as const, date: record.bestSessionDate, value: record.bestSessionValue },
    ] satisfies { kind: RecordKind; date: string | null; value: number }[]
  )
    .filter((entry): entry is { kind: RecordKind; date: string; value: number } => entry.date !== null)
    .filter((entry) => entry.value > 0)
    .map(({ kind, date }) => ({ kind, date }));
}

/**
 * The most recently broken record on this exercise, and which one it was.
 *
 * Every record already carries the date it was achieved, and the screen
 * printed each one under its value. What none of them answered is the
 * question a records screen exists for: did I just set one? Reading the
 * dates off six lines and comparing them to today is work the page should
 * have done.
 *
 * Ties go to the first in the list above -- a session that set the heaviest
 * set and the best estimate at once reports the heaviest set, which is the
 * one that actually happened rather than the one derived from it.
 *
 * Null when the exercise holds no record worth the name -- a lift logged
 * only as bodyweight, whose every figure is a dated zero.
 */
export function newestRecord(record: PersonalRecord): { kind: RecordKind; date: string } | null {
  const dated = datedRecords(record);
  if (dated.length === 0) return null;
  return dated.reduce((latest, entry) => (entry.date > latest.date ? entry : latest));
}

/** The date half of {@link newestRecord}, which is all most callers want. */
export function newestRecordDate(record: PersonalRecord): string | null {
  return newestRecord(record)?.date ?? null;
}

/**
 * Whether a record was set recently enough to still feel like news.
 *
 * Seven days rather than "since your last visit": the app does not track
 * visits, and a window tied to one would mark everything as new for someone
 * returning after a month off -- which is the moment the marker means least.
 * Compared as ISO strings, which sort lexically, so no date parsing and no
 * timezone to get wrong.
 */
export function isRecentRecord(
  record: PersonalRecord,
  today: string,
  withinDays = 7
): boolean {
  const set = newestRecordDate(record);
  if (set === null) return false;
  return set > addDays(today, -withinDays) && set <= today;
}

export interface RecordsSummary {
  /** Exercises with a record at all -- the size of the vault. */
  exercises: number;
  newThisWeek: number;
  totalSets: number;
  /** Heaviest single set across everything. Zero for a cardio-only member. */
  heaviestWeight: number;
  /** Longest single cardio effort, for when there is no weight to report. */
  longestDurationSeconds: number;
}

/**
 * The four figures the screen leads with.
 *
 * Derived here rather than inline so the headline and the list cannot
 * disagree about what "new this week" means -- the badge on a card and the
 * count above it are the same predicate, and they were two separate
 * expressions when the count was a chip.
 */
export function summariseRecords(records: PersonalRecord[], today: string): RecordsSummary {
  return {
    exercises: records.length,
    newThisWeek: records.filter((r) => isRecentRecord(r, today)).length,
    totalSets: records.reduce((sum, r) => sum + r.totalSets, 0),
    heaviestWeight: records.reduce((max, r) => Math.max(max, r.heaviestWeight), 0),
    longestDurationSeconds: records.reduce((max, r) => Math.max(max, r.longestDurationSeconds), 0),
  };
}

export type RecordSortMode = 'recent' | 'heaviest' | 'name';

/**
 * The vault in one of three orders.
 *
 * It only ever had one -- most recently trained -- which answers "what did
 * I do lately" on a screen whose subject is bests. Heaviest is the ordering
 * that makes it a trophy case, and alphabetical is the one that makes it a
 * reference you can look a lift up in.
 *
 * Cardio sinks to the bottom under 'heaviest' because it has no weight to
 * rank on, which is honest: it is a list of the heaviest sets, and a row
 * with no weight has no place in one. Ties fall back to name so the order
 * is stable rather than dependent on what the server happened to return.
 */
export function sortRecords(records: PersonalRecord[], mode: RecordSortMode): PersonalRecord[] {
  const byName = (a: PersonalRecord, b: PersonalRecord) => a.exerciseName.localeCompare(b.exerciseName);
  const sorted = records.slice();

  if (mode === 'name') return sorted.sort(byName);
  if (mode === 'heaviest') {
    return sorted.sort((a, b) => b.heaviestWeight - a.heaviestWeight || byName(a, b));
  }
  return sorted.sort((a, b) => (a.lastPerformed === b.lastPerformed ? byName(a, b) : a.lastPerformed < b.lastPerformed ? 1 : -1));
}

/**
 * The records broken inside the window, newest first.
 *
 * The screen already knew which cards to badge; what it could not do was
 * put them together. Badging is fine at three records in a list of ten and
 * useless at three in a list of sixty, and the list is ordered by when each
 * lift was last *trained* -- which is a different question, so the badges
 * do not even cluster at the top.
 */
export function recentRecords(
  records: PersonalRecord[],
  today: string,
  withinDays = 7
): { record: PersonalRecord; kind: RecordKind; date: string }[] {
  return records
    .filter((record) => isRecentRecord(record, today, withinDays))
    .map((record) => ({ record, ...(newestRecord(record) as { kind: RecordKind; date: string }) }))
    .sort((a, b) =>
      a.date === b.date ? a.record.exerciseName.localeCompare(b.record.exerciseName) : a.date < b.date ? 1 : -1
    );
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
