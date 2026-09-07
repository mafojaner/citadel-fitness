import { localISODate } from './analytics';
import { fetchFormChecks, type FormCheckSubmission } from './formCheck';
import { fetchNutritionIntakes, type NutritionIntake } from './nutrition';
import { fetchWaterHistory } from './water';
import { fetchWorkoutsInRange, type WorkoutDetailExercise } from './workouts';

/**
 * Everything one person logged on one calendar day.
 *
 * A day only becomes a record if something is on it. The feed is a history
 * of what was done, so a run of empty cards would be a run of cards saying
 * nothing, and the gaps between entries carry that information already.
 */
export interface DayActivity {
  /** YYYY-MM-DD, local. */
  date: string;
  exercises: WorkoutDetailExercise[];
  /** Total for the day in millilitres. 0 when none was logged. */
  waterMl: number;
  nutrition: NutritionIntake[];
  formChecks: FormCheckSubmission[];
}

export interface ActivityFeedOptions {
  /**
   * Whether to ask for the two Valhalla-gated sources at all.
   *
   * RLS would return nothing to a free account anyway, so this is not what
   * makes them private — it just declines to spend two requests finding
   * that out, the same reasoning FortressTodayCard uses for its own query.
   */
  includePaid: boolean;
}

/**
 * The Home feed: one entry per day that has anything on it, newest first.
 *
 * Four sources with two different notions of a date. `workouts.date` and
 * `water_logs.logged_date` are calendar days someone chose; the two paid
 * ones are timestamps, so they are folded onto the local day they happened
 * on rather than the UTC one — see localISODate for why that distinction
 * has teeth.
 */
export async function fetchActivityFeed(
  userId: string,
  startDate: string,
  endDate: string,
  { includePaid }: ActivityFeedOptions
): Promise<DayActivity[]> {
  const [workoutsByDate, waterTotals, nutrition, formChecks] = await Promise.all([
    fetchWorkoutsInRange(userId, startDate, endDate),
    fetchWaterHistory(userId, startDate, endDate),
    includePaid ? fetchNutritionIntakes(userId) : Promise.resolve([]),
    includePaid ? fetchFormChecks(userId) : Promise.resolve([]),
  ]);

  const days = new Map<string, DayActivity>();
  const dayFor = (date: string): DayActivity => {
    const existing = days.get(date);
    if (existing) return existing;
    const created: DayActivity = { date, exercises: [], waterMl: 0, nutrition: [], formChecks: [] };
    days.set(date, created);
    return created;
  };

  for (const [date, exercises] of workoutsByDate) {
    // A workout row can exist with nothing under it — the draft flow creates
    // the day before any exercise is added to it. That is not an activity.
    if (exercises.length > 0) dayFor(date).exercises = exercises;
  }

  for (const total of waterTotals) {
    if (total.totalMl > 0) dayFor(total.date).waterMl = total.totalMl;
  }

  // The paid queries are not range-bounded, so they are filtered here rather
  // than in the request. Both are small by construction: form checks are
  // capped at four a month and an intake is a once-in-a-while thing.
  for (const intake of nutrition) {
    const date = localISODate(intake.createdAt);
    if (date < startDate || date > endDate) continue;
    dayFor(date).nutrition.push(intake);
  }

  for (const check of formChecks) {
    const date = localISODate(check.createdAt);
    if (date < startDate || date > endDate) continue;
    dayFor(date).formChecks.push(check);
  }

  return Array.from(days.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
