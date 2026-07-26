import { supabase } from './supabase';
import type { Category, ExerciseType } from '../types/models';

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Pure UTC calendar math — avoids re-interpreting a date-only string as
// local time and shifting by a day when round-tripped through a timezone
// with a positive UTC offset.
export function addDays(dateString: string, delta: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return toISODate(new Date(Date.UTC(year, month - 1, day + delta)));
}

/**
 * Today's date in the device's own local timezone — deliberately NOT
 * toISODate(new Date()), which reads UTC. For anyone not near UTC+0 that's
 * a different calendar day for part of every day (e.g. 9pm in Los Angeles
 * is already past midnight UTC), so the app would show "today" as
 * tomorrow, mis-attribute a just-logged workout to the wrong date, and
 * throw off streaks and weekly totals. This is the one place "now" should
 * become a date string; addDays/toISODate stay UTC-based since they do
 * pure calendar math on a date that's already been resolved.
 */
export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daySpan(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / 86_400_000) + 1;
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

type Metric = 'volume' | 'minutes';

function metricForCategory(category: Category | 'all'): Metric {
  return category === 'cardio' ? 'minutes' : 'volume';
}

async function fetchValueByDate(
  userId: string,
  category: Category | 'all',
  startDate: string,
  endDate: string
): Promise<{ valueByDate: Map<string, number>; activeDates: Set<string> }> {
  const metric = metricForCategory(category);

  const { data, error } = await supabase
    .from('workouts')
    .select(
      'date, logged_exercises ( exercises ( category, type ), set_entries ( reps, weight, duration_minutes ) )'
    )
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .returns<DbWorkoutRow[]>();

  if (error) throw error;

  const valueByDate = new Map<string, number>();
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
      valueByDate.set(workout.date, (valueByDate.get(workout.date) ?? 0) + value);
    }
  }

  return { valueByDate, activeDates };
}

export interface ActivitySummary {
  workoutsThisWeek: number;
  currentStreakDays: number;
  totalVolumeThisWeek: number;
  /** 'minutes' when scoped to the cardio category, 'volume' (reps x weight) otherwise. */
  metric: Metric;
}

const STREAK_LOOKBACK_DAYS = 60;

/**
 * Fixed KPIs — current streak, this week's count/volume — always computed
 * against "today", independent of whatever date range the user has the
 * progress chart set to. Backs both the Home summary cards and the
 * Activity screen's stat tiles.
 */
export async function fetchActivitySummary(
  userId: string,
  category: Category | 'all'
): Promise<ActivitySummary> {
  const today = todayISO();
  const startDate = addDays(today, -STREAK_LOOKBACK_DAYS);
  const metric = metricForCategory(category);

  const { valueByDate, activeDates } = await fetchValueByDate(userId, category, startDate, today);

  const last7Dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    last7Dates.push(addDays(today, -i));
  }

  const workoutsThisWeek = last7Dates.filter((date) => activeDates.has(date)).length;
  const totalVolumeThisWeek = last7Dates.reduce((sum, date) => sum + (valueByDate.get(date) ?? 0), 0);

  let currentStreakDays = 0;
  let cursor = activeDates.has(today) ? today : addDays(today, -1);
  while (activeDates.has(cursor)) {
    currentStreakDays += 1;
    cursor = addDays(cursor, -1);
  }

  return { workoutsThisWeek, currentStreakDays, totalVolumeThisWeek, metric };
}

export interface ProgressPoint {
  /** ISO date for a daily point, or the bucket's start date for week/month. */
  date: string;
  label: string;
  value: number;
}

export type ProgressBucketing = 'day' | 'week' | 'month';

export interface ProgressSeries {
  points: ProgressPoint[];
  bucketing: ProgressBucketing;
  metric: Metric;
}

/** >14 days buckets by week, >90 by month, otherwise daily — keeps the chart legible instead of cramming 90 daily bars in. */
function bucketingFor(startDate: string, endDate: string): ProgressBucketing {
  const days = daySpan(startDate, endDate);
  if (days > 90) return 'month';
  if (days > 14) return 'week';
  return 'day';
}

function dayLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

function shortDateLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function monthKey(dateString: string): string {
  return dateString.slice(0, 7); // YYYY-MM
}

/**
 * Fetches raw daily values for the range and buckets them for display.
 * Every day in range gets a point (zero-filled), so gaps in training show
 * as real dips rather than being skipped.
 */
export async function fetchProgressSeries(
  userId: string,
  category: Category | 'all',
  startDate: string,
  endDate: string
): Promise<ProgressSeries> {
  const metric = metricForCategory(category);
  const { valueByDate } = await fetchValueByDate(userId, category, startDate, endDate);
  const bucketing = bucketingFor(startDate, endDate);

  const allDates: string[] = [];
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
    allDates.push(d);
  }

  if (bucketing === 'day') {
    const points = allDates.map((date) => ({
      date,
      label: dayLabel(date),
      value: valueByDate.get(date) ?? 0,
    }));
    return { points, bucketing, metric };
  }

  if (bucketing === 'week') {
    const buckets = new Map<string, { start: string; value: number }>();
    for (const date of allDates) {
      // Bucket key = the Sunday on/before this date, so weeks align to
      // calendar weeks rather than to wherever the range happens to start.
      const dow = new Date(`${date}T00:00:00`).getDay();
      const weekStart = addDays(date, -dow);
      const existing = buckets.get(weekStart);
      const value = valueByDate.get(date) ?? 0;
      if (existing) {
        existing.value += value;
      } else {
        buckets.set(weekStart, { start: weekStart, value });
      }
    }
    const points = Array.from(buckets.values())
      .sort((a, b) => (a.start < b.start ? -1 : 1))
      .map((bucket) => ({
        date: bucket.start,
        label: shortDateLabel(bucket.start),
        value: bucket.value,
      }));
    return { points, bucketing, metric };
  }

  // Monthly
  const buckets = new Map<string, { start: string; value: number }>();
  for (const date of allDates) {
    const key = monthKey(date);
    const existing = buckets.get(key);
    const value = valueByDate.get(date) ?? 0;
    if (existing) {
      existing.value += value;
    } else {
      buckets.set(key, { start: date.slice(0, 7) + '-01', value });
    }
  }
  const points = Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, bucket]) => ({
      date: bucket.start,
      label: new Date(`${bucket.start}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }),
      value: bucket.value,
    }));
  return { points, bucketing, metric };
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
