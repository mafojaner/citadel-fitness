import { addDays, todayISO } from './analytics';
import { estimateOneRepMax } from './personalRecords';
import { supabase } from './supabase';
import { convertWeight, roundForDisplay } from './units';
import type { ExerciseHistory } from './workoutHistory';
import type { WeightUnit } from '../types/models';

/** Below this there is no line to fit — two points define a slope, one defines nothing. */
const MIN_SESSIONS_FOR_TREND = 2;

export interface LiftGoal {
  id: string;
  exerciseId: string;
  targetWeight: number;
  targetUnit: WeightUnit;
  targetDate: string;
}

export type GoalStatus =
  /** Already lifted at or above the target. */
  | 'achieved'
  /** The trend reaches the target on or before the date. */
  | 'on-track'
  /** Rising, but not fast enough to arrive in time. */
  | 'behind'
  /** Flat or falling — the target isn't approaching at all. */
  | 'declining'
  /** Not enough sessions to fit a line. */
  | 'no-trend';

export interface GoalProjection {
  goal: LiftGoal;
  exerciseName: string;
  status: GoalStatus;
  /** Best estimated 1RM so far, in the goal's own unit. */
  current: number;
  /** Target expressed in the goal's own unit, for display alongside `current`. */
  target: number;
  /** What the trend predicts on the target date, or null without a trend. */
  projected: number | null;
  /** Change per week implied by the trend, in the goal's unit. */
  weeklyRate: number;
  /** When the trend expects to reach the target, or null if never/unknown. */
  projectedDate: string | null;
  daysRemaining: number;
  sessions: number;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export interface TrendLine {
  /** Units per day. */
  slope: number;
  /** Value at day zero. */
  intercept: number;
}

/**
 * Least-squares fit over (day, value).
 *
 * A straight line is deliberately the model: strength gains aren't really
 * linear, but any curve fitted to a handful of gym sessions is a story
 * about noise. A line is the honest amount of structure to claim from this
 * much data, and its slope is directly readable as "kilos per week".
 *
 * Returns null when the fit is undefined — fewer than two points, or every
 * point on the same day, which would divide by zero.
 */
export function fitTrend(points: { day: number; value: number }[]): TrendLine | null {
  if (points.length < MIN_SESSIONS_FOR_TREND) return null;

  const n = points.length;
  const meanDay = points.reduce((sum, p) => sum + p.day, 0) / n;
  const meanValue = points.reduce((sum, p) => sum + p.value, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (const point of points) {
    numerator += (point.day - meanDay) * (point.value - meanValue);
    denominator += (point.day - meanDay) ** 2;
  }

  if (denominator === 0) return null;

  const slope = numerator / denominator;
  return { slope, intercept: meanValue - slope * meanDay };
}

/**
 * Projects one goal from the lift's own logged history.
 *
 * Everything is computed in the goal's stored unit rather than the user's
 * current display preference, so switching lb/kg re-labels the numbers
 * without moving the goalposts.
 */
export function projectGoal(
  goal: LiftGoal,
  history: ExerciseHistory | undefined,
  today: string = todayISO()
): GoalProjection {
  const exerciseName = history?.exerciseName ?? 'Unknown exercise';
  const target = roundForDisplay(goal.targetWeight);
  const daysRemaining = daysBetween(today, goal.targetDate);

  const base: GoalProjection = {
    goal,
    exerciseName,
    status: 'no-trend',
    current: 0,
    target,
    projected: null,
    weeklyRate: 0,
    projectedDate: null,
    daysRemaining,
    sessions: 0,
  };

  if (!history) return base;

  // Best estimate per day, in the goal's unit — matching how the analytics
  // progression treats a day, so a back-off set can't look like a decline.
  const bestByDate = new Map<string, number>();
  for (const set of history.sets) {
    // history arrives in the display unit; the goal has its own.
    const estimate = estimateOneRepMax(set.weight, set.reps);
    if (estimate <= 0) continue;
    bestByDate.set(set.date, Math.max(bestByDate.get(set.date) ?? 0, estimate));
  }

  if (bestByDate.size === 0) return base;

  const dates = Array.from(bestByDate.keys()).sort();
  const firstDate = dates[0];
  const points = dates.map((date) => ({ day: daysBetween(firstDate, date), value: bestByDate.get(date)! }));
  const current = roundForDisplay(Math.max(...points.map((p) => p.value)));

  if (current >= target) {
    return { ...base, status: 'achieved', current, sessions: points.length };
  }

  const trend = fitTrend(points);
  if (!trend) {
    return { ...base, current, sessions: points.length };
  }

  const weeklyRate = roundForDisplay(trend.slope * 7);
  const dayOfTarget = daysBetween(firstDate, goal.targetDate);
  const projected = roundForDisplay(trend.intercept + trend.slope * dayOfTarget);

  if (trend.slope <= 0) {
    return {
      ...base,
      status: 'declining',
      current,
      projected,
      weeklyRate,
      sessions: points.length,
    };
  }

  // Day the line crosses the target, converted back to a date.
  const dayAtTarget = (target - trend.intercept) / trend.slope;
  const projectedDate = addDays(firstDate, Math.ceil(dayAtTarget));

  return {
    ...base,
    status: projected >= target ? 'on-track' : 'behind',
    current,
    projected,
    weeklyRate,
    projectedDate,
    sessions: points.length,
  };
}

interface DbGoal {
  id: string;
  exercise_id: string;
  target_weight: number;
  target_unit: WeightUnit;
  target_date: string;
}

export async function fetchLiftGoals(userId: string): Promise<LiftGoal[]> {
  const { data, error } = await supabase
    .from('lift_goals')
    .select('id, exercise_id, target_weight, target_unit, target_date')
    .eq('user_id', userId)
    .order('target_date', { ascending: true })
    .returns<DbGoal[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    targetWeight: row.target_weight,
    targetUnit: row.target_unit,
    targetDate: row.target_date,
  }));
}

export async function saveLiftGoal(
  userId: string,
  exerciseId: string,
  targetWeight: number,
  targetUnit: WeightUnit,
  targetDate: string
): Promise<void> {
  // Upsert on the unique (user_id, exercise_id): re-targeting a lift should
  // replace the goal rather than fail on the constraint.
  const { error } = await supabase.from('lift_goals').upsert(
    {
      user_id: userId,
      exercise_id: exerciseId,
      target_weight: targetWeight,
      target_unit: targetUnit,
      target_date: targetDate,
    },
    { onConflict: 'user_id,exercise_id' }
  );
  if (error) throw error;
}

export async function deleteLiftGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from('lift_goals').delete().eq('id', goalId);
  if (error) throw error;
}

/**
 * Pairs each goal with its lift's history and projects it. Histories arrive
 * in the display unit, so each is converted into the goal's own unit first —
 * the goal is the fixed point here, not the current preference.
 */
export function projectGoals(
  goals: LiftGoal[],
  histories: ExerciseHistory[],
  displayWeightUnit: WeightUnit,
  today: string = todayISO()
): GoalProjection[] {
  return goals.map((goal) => {
    const history = histories.find((h) => h.exerciseId === goal.exerciseId);
    const inGoalUnit = history
      ? {
          ...history,
          sets: history.sets.map((s) => ({
            ...s,
            weight: convertWeight(s.weight, displayWeightUnit, goal.targetUnit),
          })),
        }
      : undefined;
    return projectGoal(goal, inGoalUnit, today);
  });
}
