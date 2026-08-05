import { addDays, todayISO } from './analytics';
import { fetchRewardEligibleWorkoutDates } from './workouts';

/** Logging a workout on this many distinct days in a week completes it. */
const WEEKLY_TARGET_DAYS = 4;
/** This many consecutive complete weeks earns one 10%-off reward. */
const WEEKS_PER_REWARD = 4;
/**
 * How far back to look for the streak. Weekly streaks compound far slower
 * than daily ones (52 complete weeks is a full year of consistency), so
 * this is deliberately generous rather than reusing the daily streak's
 * much shorter lookback.
 */
const HISTORY_WEEKS = 104;
/** Rows shown in the on-screen grid — the current reward cycle in progress. */
const GRID_WEEKS = 4;

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface RewardDay {
  date: string;
  label: string;
  dayNumber: number;
  logged: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface RewardWeek {
  /** Monday of this week. */
  weekStart: string;
  days: RewardDay[];
  daysLogged: number;
  complete: boolean;
}

export interface RewardProgress {
  /** Consecutive complete weeks, counting an already-qualifying current week. */
  weeklyStreak: number;
  /** floor(weeklyStreak / WEEKS_PER_REWARD) — how many 10%-off rewards are earned so far. */
  rewardsEarned: number;
  /** How many complete weeks into the *next* reward's cycle (0–3). */
  weeksIntoCurrentCycle: number;
  weeksPerReward: number;
  weeklyTargetDays: number;
  /** Most recent GRID_WEEKS weeks, oldest first, ending with the current week. */
  weeks: RewardWeek[];
}

function mondayOfWeek(dateString: string): string {
  const dow = new Date(`${dateString}T00:00:00`).getDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(dateString, diff);
}

/**
 * Weekly-consistency streak and 10%-off-premium reward progress.
 *
 * A week (Monday–Sunday) is "complete" once a workout's been logged on
 * WEEKLY_TARGET_DAYS distinct days — that can happen any day of the week,
 * not just once it's fully elapsed, the same way the daily streak counts
 * today the moment you've logged something rather than waiting for
 * midnight. Every WEEKS_PER_REWARD consecutive complete weeks earns one
 * reward. Redemption isn't wired to a real subscription/billing system —
 * there isn't one yet — this only tracks and displays eligibility.
 *
 * Only same-day-logged entries count — fetchRewardEligibleWorkoutDates
 * excludes anything backdated through the Workouts calendar, so a day can't
 * be fabricated after the fact. See
 * supabase/migration_024_reward_eligibility.sql.
 */
export async function fetchRewardProgress(userId: string): Promise<RewardProgress> {
  const today = todayISO();
  const currentWeekStart = mondayOfWeek(today);
  const historyStart = addDays(currentWeekStart, -7 * HISTORY_WEEKS);

  const loggedDates = new Set(await fetchRewardEligibleWorkoutDates(userId, historyStart, today));

  const weekStarts: string[] = [];
  for (let d = historyStart; d <= currentWeekStart; d = addDays(d, 7)) {
    weekStarts.push(d);
  }

  const weekByStart = new Map<string, RewardWeek>();
  for (const weekStart of weekStarts) {
    const days: RewardDay[] = [];
    let daysLogged = 0;
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const isFuture = date > today;
      const logged = !isFuture && loggedDates.has(date);
      if (logged) daysLogged += 1;
      days.push({
        date,
        label: DAY_LABELS[i],
        dayNumber: Number(date.slice(8, 10)),
        logged,
        isToday: date === today,
        isFuture,
      });
    }
    weekByStart.set(weekStart, { weekStart, days, daysLogged, complete: daysLogged >= WEEKLY_TARGET_DAYS });
  }

  // A currently-in-progress week that already qualifies counts immediately;
  // one that hasn't qualified *yet* simply doesn't count yet, without
  // breaking the streak, since it isn't over. From there, keep counting
  // consecutive complete weeks going backward.
  let weeklyStreak = 0;
  let cursor = currentWeekStart;
  if (weekByStart.get(currentWeekStart)?.complete) {
    weeklyStreak += 1;
  }
  cursor = addDays(cursor, -7);
  while (true) {
    const week = weekByStart.get(cursor);
    if (!week || !week.complete) break;
    weeklyStreak += 1;
    cursor = addDays(cursor, -7);
  }

  const rewardsEarned = Math.floor(weeklyStreak / WEEKS_PER_REWARD);
  const weeksIntoCurrentCycle = weeklyStreak % WEEKS_PER_REWARD;
  const weeks = weekStarts.slice(-GRID_WEEKS).map((ws) => weekByStart.get(ws)!);

  return {
    weeklyStreak,
    rewardsEarned,
    weeksIntoCurrentCycle,
    weeksPerReward: WEEKS_PER_REWARD,
    weeklyTargetDays: WEEKLY_TARGET_DAYS,
    weeks,
  };
}
