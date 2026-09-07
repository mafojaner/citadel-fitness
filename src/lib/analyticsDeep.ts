import { supabase } from './supabase';
import { roundForDisplay } from './units';
import type { Category, DistanceUnit, WeightUnit } from '../types/models';

/**
 * The deep-analytics layer: one flat fetch, every derivation here.
 *
 * `get_advanced_analytics` computes its whole answer in Postgres, and that
 * was the right call for it -- muscle balance and lift progressions are
 * nested shapes with per-lift point arrays, and assembling those client-side
 * would mean shipping the derivation. This is the opposite shape. Everything
 * below is a sum or a bucket over one row per day per exercise, so the RPC
 * stays a flat aggregate a reader can check at a glance, and the arithmetic
 * that has actual edge cases -- empty windows, weeks with no RPE, streaks
 * across month boundaries -- lives here where it is unit-tested.
 *
 * The tier gate does not move: the RPC still refuses below Fortress, so a
 * free caller gets nothing to derive from.
 */

/** One row per day per exercise, already unit-converted by the server. */
export interface DailyRollup {
  date: string;
  category: Category;
  type: 'strength' | 'cardio';
  sets: number;
  /** reps x weight for strength, 0 for cardio. */
  volume: number;
  /** Sets whose rep count falls in each band. Cardio sets land in none. */
  setsLow: number;
  setsMid: number;
  setsHigh: number;
  /** Sum and count kept apart so weeks can be averaged without weighting by day. */
  rpeSum: number;
  rpeCount: number;
  durationSeconds: number;
  distance: number;
  /** Best estimated one-rep max that day, 0 when nothing qualified. */
  bestE1rm: number;
}

/**
 * Rep bands, and why these boundaries.
 *
 * 1-5 / 6-12 / 13+ is the conventional strength / hypertrophy / endurance
 * split, and it matches the 12-rep cap the one-rep-max estimate already
 * uses -- past twelve reps Epley stops meaning anything, which is the same
 * place the training stimulus stops being about load.
 */
export const REP_BANDS = [
  { key: 'low', label: 'Strength', detail: '1-5 reps' },
  { key: 'mid', label: 'Hypertrophy', detail: '6-12 reps' },
  { key: 'high', label: 'Endurance', detail: '13+ reps' },
] as const;

export type RepBandKey = (typeof REP_BANDS)[number]['key'];

export interface RepBandSplit {
  key: RepBandKey;
  label: string;
  detail: string;
  sets: number;
  /** 0-1 of all banded sets. */
  share: number;
}

export interface WeekPoint {
  /** ISO date of the Monday that starts the week. */
  weekStart: string;
  volume: number;
  sets: number;
  activeDays: number;
  /** Null when no set that week carried an RPE, which is not the same as zero. */
  avgRpe: number | null;
}

export interface WeekdayCount {
  /** 0 = Monday, matching weekStart. */
  weekday: number;
  label: string;
  sessions: number;
}

export interface ConsistencySummary {
  activeDays: number;
  /** Distinct weeks that saw at least one session. */
  activeWeeks: number;
  sessionsPerWeek: number;
  longestStreak: number;
  /** Mean gap in days between consecutive sessions. Null with fewer than two. */
  averageRestDays: number | null;
  weekdays: WeekdayCount[];
}

export interface TopLift {
  exerciseId: string;
  exerciseName: string;
  category: Category;
  bestE1rm: number;
  /** Day the best estimate was set. */
  achievedOn: string;
}

export interface CardioSummary {
  sessions: number;
  minutes: number;
  distance: number;
}

export interface IntensitySummary {
  /** Null when nothing in the window carried an RPE. */
  averageRpe: number | null;
  /** 0-1 of strength sets that were logged with an RPE at all. */
  coverage: number;
  weeks: WeekPoint[];
}

export interface DeepAnalytics {
  weeks: WeekPoint[];
  repBands: RepBandSplit[];
  consistency: ConsistencySummary;
  intensity: IntensitySummary;
  topLifts: TopLift[];
  cardio: CardioSummary | null;
  totalVolume: number;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Parsed as UTC noon so a timezone west of the line cannot roll the date back a day. */
function asDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 0 = Monday. `getUTCDay` is 0 = Sunday, which would put Sunday at the start of the week. */
export function weekdayIndex(iso: string): number {
  return (asDate(iso).getUTCDay() + 6) % 7;
}

/** The Monday on or before `iso`. */
export function weekStartOf(iso: string): string {
  const date = asDate(iso);
  date.setUTCDate(date.getUTCDate() - weekdayIndex(iso));
  return toISO(date);
}

function daysBetween(fromISO: string, toISOStr: string): number {
  const ms = asDate(toISOStr).getTime() - asDate(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

export function computeWeeks(rows: DailyRollup[]): WeekPoint[] {
  const byWeek = new Map<string, { volume: number; sets: number; days: Set<string>; rpeSum: number; rpeCount: number }>();

  for (const row of rows) {
    const key = weekStartOf(row.date);
    const bucket = byWeek.get(key) ?? { volume: 0, sets: 0, days: new Set<string>(), rpeSum: 0, rpeCount: 0 };
    bucket.volume += row.volume;
    bucket.sets += row.sets;
    bucket.days.add(row.date);
    bucket.rpeSum += row.rpeSum;
    bucket.rpeCount += row.rpeCount;
    byWeek.set(key, bucket);
  }

  return Array.from(byWeek.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([weekStart, bucket]) => ({
      weekStart,
      volume: roundForDisplay(bucket.volume),
      sets: bucket.sets,
      activeDays: bucket.days.size,
      // Averaged over sets that carried a value, not over all sets: a week
      // where two sets were rated 9 is a hard week, not a week averaging 0.4.
      avgRpe: bucket.rpeCount > 0 ? Math.round((bucket.rpeSum / bucket.rpeCount) * 10) / 10 : null,
    }));
}

export function computeRepBands(rows: DailyRollup[]): RepBandSplit[] {
  const totals = { low: 0, mid: 0, high: 0 };
  for (const row of rows) {
    totals.low += row.setsLow;
    totals.mid += row.setsMid;
    totals.high += row.setsHigh;
  }
  const all = totals.low + totals.mid + totals.high;

  return REP_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    detail: band.detail,
    sets: totals[band.key],
    // Guarded: a window of cardio only lands in no band at all, and a share
    // of 0/0 would reach the bar as NaN and render nothing at any width.
    share: all > 0 ? totals[band.key] / all : 0,
  }));
}

export function computeConsistency(rows: DailyRollup[]): ConsistencySummary {
  const days = Array.from(new Set(rows.map((r) => r.date))).sort();
  const weekdays: WeekdayCount[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    sessions: 0,
  }));
  for (const day of days) weekdays[weekdayIndex(day)].sessions += 1;

  let longestStreak = 0;
  let running = 0;
  let gapTotal = 0;
  for (let i = 0; i < days.length; i += 1) {
    if (i === 0) {
      running = 1;
    } else {
      const gap = daysBetween(days[i - 1], days[i]);
      gapTotal += gap;
      running = gap === 1 ? running + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, running);
  }

  const activeWeeks = new Set(days.map(weekStartOf)).size;

  return {
    activeDays: days.length,
    activeWeeks,
    // Against weeks actually trained, not calendar weeks in the window: a
    // month off would otherwise read as a collapse in weekly frequency
    // rather than as the break it was, which the streak figures already say.
    sessionsPerWeek: activeWeeks > 0 ? Math.round((days.length / activeWeeks) * 10) / 10 : 0,
    longestStreak,
    averageRestDays:
      days.length > 1 ? Math.round((gapTotal / (days.length - 1)) * 10) / 10 : null,
    weekdays,
  };
}

export function computeIntensity(rows: DailyRollup[], weeks: WeekPoint[]): IntensitySummary {
  let rpeSum = 0;
  let rpeCount = 0;
  let strengthSets = 0;
  for (const row of rows) {
    rpeSum += row.rpeSum;
    rpeCount += row.rpeCount;
    if (row.type !== 'cardio') strengthSets += row.sets;
  }

  return {
    averageRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
    // Stated so the average can be read with the right confidence. An 8.5
    // across three of ninety sets is a different claim from an 8.5 across
    // all ninety, and the number alone cannot tell them apart.
    coverage: strengthSets > 0 ? Math.min(rpeCount / strengthSets, 1) : 0,
    weeks,
  };
}

export function computeCardio(rows: DailyRollup[]): CardioSummary | null {
  const cardio = rows.filter((r) => r.type === 'cardio');
  if (cardio.length === 0) return null;

  const days = new Set(cardio.map((r) => r.date));
  return {
    sessions: days.size,
    minutes: Math.round(cardio.reduce((sum, r) => sum + r.durationSeconds, 0) / 60),
    distance: roundForDisplay(cardio.reduce((sum, r) => sum + r.distance, 0)),
  };
}

export function computeDeepAnalytics(rows: DailyRollup[], topLifts: TopLift[]): DeepAnalytics {
  const weeks = computeWeeks(rows);
  return {
    weeks,
    repBands: computeRepBands(rows),
    consistency: computeConsistency(rows),
    intensity: computeIntensity(rows, weeks),
    topLifts,
    cardio: computeCardio(rows),
    totalVolume: roundForDisplay(rows.reduce((sum, r) => sum + r.volume, 0)),
  };
}

/** null periodDays means everything ever logged, matching the other analytics calls. */
export async function fetchDeepAnalytics(
  displayWeightUnit: WeightUnit,
  displayDistanceUnit: DistanceUnit,
  periodDays: number | null
): Promise<DeepAnalytics> {
  const { data, error } = await supabase.rpc('get_analytics_rollups', {
    p_weight_unit: displayWeightUnit,
    p_distance_unit: displayDistanceUnit,
    p_period_days: periodDays,
  });
  if (error) throw error;

  const result = data as { rollups: unknown[]; topLifts: unknown[] };

  // Numerics arrive from Postgres as strings often enough that trusting the
  // shape here puts a string on a chart axis, where it fails silently by
  // sorting as text. Every numeric field is coerced on the way in.
  const rollups: DailyRollup[] = (result.rollups ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      date: String(r.date),
      category: r.category as Category,
      type: r.type === 'cardio' ? 'cardio' : 'strength',
      sets: Number(r.sets ?? 0),
      volume: Number(r.volume ?? 0),
      setsLow: Number(r.setsLow ?? 0),
      setsMid: Number(r.setsMid ?? 0),
      setsHigh: Number(r.setsHigh ?? 0),
      rpeSum: Number(r.rpeSum ?? 0),
      rpeCount: Number(r.rpeCount ?? 0),
      durationSeconds: Number(r.durationSeconds ?? 0),
      distance: Number(r.distance ?? 0),
      bestE1rm: Number(r.bestE1rm ?? 0),
    };
  });

  const topLifts: TopLift[] = (result.topLifts ?? []).map((raw) => {
    const l = raw as Record<string, unknown>;
    return {
      exerciseId: String(l.exerciseId),
      exerciseName: String(l.exerciseName),
      category: l.category as Category,
      bestE1rm: Number(l.bestE1rm ?? 0),
      achievedOn: String(l.achievedOn),
    };
  });

  return computeDeepAnalytics(rollups, topLifts);
}
