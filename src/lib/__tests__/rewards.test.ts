import { fetchRewardProgress } from '../rewards';
import { fetchRewardEligibleWorkoutDates } from '../workouts';
import { addDays } from '../analytics';

// Real date maths, frozen "today" — the streak is defined relative to the
// current week, so it can't be asserted against without pinning that.
// Frozen to a Friday, not mid-week: the target is 4 days, and days after
// today never count as logged, so a week can't qualify until at least the
// Thursday has elapsed.
jest.mock('../analytics', () => ({
  ...jest.requireActual('../analytics'),
  todayISO: jest.fn(() => '2026-08-21'),
}));

jest.mock('../workouts', () => ({
  fetchRewardEligibleWorkoutDates: jest.fn(),
}));

const mockFetch = fetchRewardEligibleWorkoutDates as jest.MockedFunction<
  typeof fetchRewardEligibleWorkoutDates
>;

/** 2026-08-17 is a Monday; 08-21 (the frozen today) is that Friday. */
const THIS_MONDAY = '2026-08-17';

/** First `count` days of the week starting at `weekStart`. */
function daysIn(weekStart: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(weekStart, i));
}

/** Logged dates for `weeks` consecutive complete weeks ending with the week before THIS_MONDAY. */
function completeWeeksBefore(weeks: number, daysPerWeek = 4): string[] {
  const dates: string[] = [];
  for (let w = 1; w <= weeks; w++) {
    dates.push(...daysIn(addDays(THIS_MONDAY, -7 * w), daysPerWeek));
  }
  return dates;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchRewardProgress — weekly streak', () => {
  it('counts nothing when no workouts are logged', async () => {
    mockFetch.mockResolvedValue([]);
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(0);
    expect(progress.rewardsEarned).toBe(0);
  });

  it('counts the current week as soon as it qualifies, without waiting for it to end', async () => {
    // Mon-Thu logged and today is Friday: the week still has two days to
    // run, but it already meets the 4-day target and should count now.
    mockFetch.mockResolvedValue(daysIn(THIS_MONDAY, 4));
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(1);
  });

  it('does not count an in-progress week that has not qualified yet', async () => {
    mockFetch.mockResolvedValue(daysIn(THIS_MONDAY, 3));
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(0);
  });

  it('does not break the streak when the current week has not qualified yet', async () => {
    // Three prior complete weeks, current week only part-way. The current
    // week not qualifying *yet* must not zero out the history behind it.
    mockFetch.mockResolvedValue([...completeWeeksBefore(3), ...daysIn(THIS_MONDAY, 1)]);
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(3);
  });

  it('counts consecutive complete weeks behind a qualifying current week', async () => {
    mockFetch.mockResolvedValue([...completeWeeksBefore(2), ...daysIn(THIS_MONDAY, 4)]);
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(3);
  });

  it('stops at the first incomplete week going backwards', async () => {
    // Weeks -1 and -2 complete, week -3 has only 3 days, week -4 complete.
    // The gap at -3 must cut the streak rather than being skipped over.
    mockFetch.mockResolvedValue([
      ...daysIn(addDays(THIS_MONDAY, -7), 4),
      ...daysIn(addDays(THIS_MONDAY, -14), 4),
      ...daysIn(addDays(THIS_MONDAY, -21), 3),
      ...daysIn(addDays(THIS_MONDAY, -28), 4),
    ]);
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(2);
  });

  it('treats exactly the target number of days as complete', async () => {
    mockFetch.mockResolvedValue(daysIn(addDays(THIS_MONDAY, -7), 4));
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(1);
  });

  it('ignores duplicate dates rather than double-counting a day', async () => {
    const monday = addDays(THIS_MONDAY, -7);
    mockFetch.mockResolvedValue([monday, monday, monday, monday]);
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(0);
  });
});

describe('fetchRewardProgress — rewards earned', () => {
  it('earns one reward at four consecutive complete weeks', async () => {
    mockFetch.mockResolvedValue(completeWeeksBefore(4));
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeklyStreak).toBe(4);
    expect(progress.rewardsEarned).toBe(1);
    expect(progress.weeksIntoCurrentCycle).toBe(0);
  });

  it('earns nothing at three weeks, and reports progress into the cycle', async () => {
    mockFetch.mockResolvedValue(completeWeeksBefore(3));
    const progress = await fetchRewardProgress('user-1');
    expect(progress.rewardsEarned).toBe(0);
    expect(progress.weeksIntoCurrentCycle).toBe(3);
  });

  it('earns two rewards at eight weeks', async () => {
    mockFetch.mockResolvedValue(completeWeeksBefore(8));
    const progress = await fetchRewardProgress('user-1');
    expect(progress.rewardsEarned).toBe(2);
    expect(progress.weeksIntoCurrentCycle).toBe(0);
  });

  it('reports the leftover weeks past a completed cycle', async () => {
    mockFetch.mockResolvedValue(completeWeeksBefore(5));
    const progress = await fetchRewardProgress('user-1');
    expect(progress.rewardsEarned).toBe(1);
    expect(progress.weeksIntoCurrentCycle).toBe(1);
  });

  it('exposes the thresholds it used, so the UI never hardcodes them', async () => {
    mockFetch.mockResolvedValue([]);
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeksPerReward).toBe(4);
    expect(progress.weeklyTargetDays).toBe(4);
  });
});

describe('fetchRewardProgress — week grid', () => {
  it('returns four weeks, oldest first, ending with the current week', async () => {
    mockFetch.mockResolvedValue([]);
    const progress = await fetchRewardProgress('user-1');
    expect(progress.weeks).toHaveLength(4);
    expect(progress.weeks[3].weekStart).toBe(THIS_MONDAY);
    expect(progress.weeks[0].weekStart).toBe(addDays(THIS_MONDAY, -21));
  });

  it('labels each week Monday to Sunday', async () => {
    mockFetch.mockResolvedValue([]);
    const progress = await fetchRewardProgress('user-1');
    const current = progress.weeks[3];
    expect(current.days).toHaveLength(7);
    expect(current.days.map((d) => d.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(current.days[0].date).toBe(THIS_MONDAY);
    expect(current.days[6].date).toBe(addDays(THIS_MONDAY, 6));
  });

  it('marks days after today as future and never as logged', async () => {
    // A future date appearing in the data must not be rendered as logged —
    // the grid would otherwise show a workout that hasn't happened. Today
    // itself is not future, which is what makes same-day logging count.
    mockFetch.mockResolvedValue([addDays(THIS_MONDAY, 5)]);
    const current = (await fetchRewardProgress('user-1')).weeks[3];
    const [friday, saturday, sunday] = [current.days[4], current.days[5], current.days[6]];
    expect(friday.isFuture).toBe(false);
    expect(saturday.isFuture).toBe(true);
    expect(saturday.logged).toBe(false);
    expect(sunday.isFuture).toBe(true);
  });

  it('flags today', async () => {
    mockFetch.mockResolvedValue([]);
    const current = (await fetchRewardProgress('user-1')).weeks[3];
    expect(current.days.filter((d) => d.isToday)).toHaveLength(1);
    expect(current.days[4].isToday).toBe(true);
    expect(current.days[4].date).toBe('2026-08-21');
  });

  it('counts logged days per week and flags completeness', async () => {
    mockFetch.mockResolvedValue(daysIn(THIS_MONDAY, 2));
    const current = (await fetchRewardProgress('user-1')).weeks[3];
    expect(current.daysLogged).toBe(2);
    expect(current.complete).toBe(false);
  });

  it('reports the day-of-month for each cell', async () => {
    mockFetch.mockResolvedValue([]);
    const current = (await fetchRewardProgress('user-1')).weeks[3];
    expect(current.days[0].dayNumber).toBe(17);
    expect(current.days[6].dayNumber).toBe(23);
  });
});
