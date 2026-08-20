import { estimateOneRepMax } from './personalRecords';
import { supabase } from './supabase';
import { roundForDisplay } from './units';
import { type ExerciseHistory } from './workoutHistory';
import type { Category, DistanceUnit, WeightUnit } from '../types/models';

/** A lift needs at least this many separate days before a trend means anything. */
const MIN_DAYS_FOR_TREND = 2;

export interface MuscleBalance {
  category: Category;
  /** Volume in the display weight unit, or minutes for cardio categories. */
  value: number;
  /** 0–1 of total across all categories. */
  share: number;
  sets: number;
}

export interface StrengthPoint {
  date: string;
  estimatedOneRepMax: number;
}

export interface LiftProgression {
  exerciseId: string;
  exerciseName: string;
  /** Best estimate per day, chronological. */
  points: StrengthPoint[];
  first: number;
  latest: number;
  /** Percentage change from first to latest. Negative means regression. */
  changePct: number;
}

export interface AdvancedAnalytics {
  balance: MuscleBalance[];
  progressions: LiftProgression[];
  totalValue: number;
  totalSets: number;
  activeDays: number;
}

function withinPeriod(sets: ExerciseHistory['sets'], since: string | null) {
  return since ? sets.filter((s) => s.date >= since) : sets;
}

/**
 * Share of work per muscle group. Strength contributes reps x weight;
 * cardio contributes minutes, since reps x weight is zero for every run and
 * a single total would otherwise erase cardio from the picture entirely.
 *
 * That does mean the two are summed in different units, which is why this
 * reports a *share* rather than a headline total — the comparison that's
 * useful here is "am I neglecting legs", not "how many kilo-minutes".
 */
export function computeMuscleBalance(
  histories: ExerciseHistory[],
  since: string | null = null
): MuscleBalance[] {
  const valueByCategory = new Map<Category, number>();
  const setsByCategory = new Map<Category, number>();

  for (const history of histories) {
    const sets = withinPeriod(history.sets, since);
    if (sets.length === 0) continue;
    const cardio = history.type === 'cardio';

    let value = 0;
    for (const set of sets) {
      value += cardio ? set.durationSeconds / 60 : set.reps * set.weight;
    }

    valueByCategory.set(history.category, (valueByCategory.get(history.category) ?? 0) + value);
    setsByCategory.set(history.category, (setsByCategory.get(history.category) ?? 0) + sets.length);
  }

  const total = Array.from(valueByCategory.values()).reduce((sum, v) => sum + v, 0);

  return Array.from(valueByCategory.entries())
    .map(([category, value]) => ({
      category,
      value: roundForDisplay(value),
      // Guarded: a period containing only zero-value sets (bodyweight logged
      // without reps, say) would otherwise divide by zero and report NaN.
      share: total > 0 ? value / total : 0,
      sets: setsByCategory.get(category) ?? 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Estimated one-rep max over time, per strength lift — the question
 * "am I actually getting stronger", which volume alone can't answer since
 * it rises just as well by doing more easy sets.
 *
 * Takes the best estimate per day rather than every set, so a working set
 * after a heavy single doesn't read as a decline within the same session.
 */
export function computeLiftProgressions(
  histories: ExerciseHistory[],
  since: string | null = null
): LiftProgression[] {
  const progressions: LiftProgression[] = [];

  for (const history of histories) {
    if (history.type === 'cardio') continue;

    const bestByDate = new Map<string, number>();
    for (const set of withinPeriod(history.sets, since)) {
      const estimate = estimateOneRepMax(set.weight, set.reps);
      if (estimate <= 0) continue;
      bestByDate.set(set.date, Math.max(bestByDate.get(set.date) ?? 0, estimate));
    }

    if (bestByDate.size < MIN_DAYS_FOR_TREND) continue;

    const points = Array.from(bestByDate.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, estimate]) => ({ date, estimatedOneRepMax: roundForDisplay(estimate) }));

    const first = points[0].estimatedOneRepMax;
    const latest = points[points.length - 1].estimatedOneRepMax;

    progressions.push({
      exerciseId: history.exerciseId,
      exerciseName: history.exerciseName,
      points,
      first,
      latest,
      changePct: first > 0 ? Math.round(((latest - first) / first) * 100) : 0,
    });
  }

  // Biggest gains first: the useful read is which lifts are moving, and
  // which have stalled and need attention.
  return progressions.sort((a, b) => b.changePct - a.changePct);
}

export function computeAdvancedAnalytics(
  histories: ExerciseHistory[],
  since: string | null = null
): AdvancedAnalytics {
  const balance = computeMuscleBalance(histories, since);
  const activeDates = new Set<string>();
  let totalSets = 0;

  for (const history of histories) {
    for (const set of withinPeriod(history.sets, since)) {
      activeDates.add(set.date);
      totalSets += 1;
    }
  }

  return {
    balance,
    progressions: computeLiftProgressions(histories, since),
    totalValue: roundForDisplay(balance.reduce((sum, b) => sum + b.value, 0)),
    totalSets,
    activeDays: activeDates.size,
  };
}

/**
 * null periodDays means "everything ever logged".
 *
 * Computed by `get_advanced_analytics` now, not by the functions above. They
 * remain the readable definition of the arithmetic and keep the tests, but
 * running them here shipped the entire feature in the bundle with only a
 * client-side tier check in front of it. See personalRecords.ts, which moved
 * for the same reason — and keep the two definitions in step, because a
 * muscle-balance share that disagrees with itself between builds is worse
 * than one that is merely late.
 */
export async function fetchAdvancedAnalytics(
  _userId: string,
  displayWeightUnit: WeightUnit,
  displayDistanceUnit: DistanceUnit,
  periodDays: number | null
): Promise<AdvancedAnalytics> {
  const { data, error } = await supabase.rpc('get_advanced_analytics', {
    p_weight_unit: displayWeightUnit,
    p_distance_unit: displayDistanceUnit,
    p_period_days: periodDays,
  });
  if (error) throw error;

  const result = data as {
    balance: { category: Category; value: number; share: number; sets: number }[];
    progressions: LiftProgression[];
    totalValue: number;
    totalSets: number;
    activeDays: number;
  };

  // Numerics can arrive as strings from Postgres; Number() on each keeps the
  // interface honestly typed rather than letting a string reach a chart axis.
  return {
    balance: result.balance.map((b) => ({
      category: b.category,
      value: Number(b.value),
      share: Number(b.share),
      sets: Number(b.sets),
    })),
    progressions: result.progressions.map((p) => ({
      ...p,
      first: Number(p.first),
      latest: Number(p.latest),
      changePct: Number(p.changePct),
      points: p.points.map((pt) => ({
        date: pt.date,
        estimatedOneRepMax: Number(pt.estimatedOneRepMax),
      })),
    })),
    totalValue: Number(result.totalValue),
    totalSets: Number(result.totalSets),
    activeDays: Number(result.activeDays),
  };
}
