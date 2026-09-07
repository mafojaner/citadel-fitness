import { fetchActivityFeed } from '../activityFeed';
import { fetchFormChecks } from '../formCheck';
import { fetchNutritionIntakes } from '../nutrition';
import { fetchWaterHistory } from '../water';
import { fetchWorkoutsInRange, type WorkoutDetailExercise } from '../workouts';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../workouts', () => ({ fetchWorkoutsInRange: jest.fn() }));
jest.mock('../water', () => ({ fetchWaterHistory: jest.fn() }));
jest.mock('../nutrition', () => ({ fetchNutritionIntakes: jest.fn() }));
jest.mock('../formCheck', () => ({ fetchFormChecks: jest.fn() }));

const asMock = (fn: unknown) => fn as jest.Mock;

const RANGE = { start: '2026-08-01', end: '2026-09-07' };

function exercise(id: string): WorkoutDetailExercise {
  return {
    id,
    exerciseId: `ex-${id}`,
    exerciseName: 'Bench Press',
    category: 'chest',
    type: 'strength',
    sets: [
      {
        id: `set-${id}`,
        setNumber: 1,
        reps: 8,
        weight: 60,
        weightUnit: 'kg',
        durationSeconds: 0,
        distance: 0,
        distanceUnit: 'km',
        rpe: null,
      },
    ],
  };
}

/**
 * A timestamp built from local calendar parts, so the instant it names is
 * unambiguously that local day whatever timezone the test runs in.
 *
 * `hour` matters more than it looks. Only one edge of the day disagrees
 * with UTC in a given timezone: going east, 00:30 local is already the
 * previous day in UTC; going west, it is 23:30 that lands on the next one.
 * A test fixing one hour is therefore only load-bearing in half the world,
 * which was not a hypothetical here -- the first version of this file used
 * 23:30, and swapping localISODate for UTC left the suite green on a UTC+2
 * machine. Both edges are exercised below so the pair catches it either
 * way. At UTC+0 neither can, and neither needs to: there is no difference
 * to get wrong.
 */
function onLocalDay(year: number, month1: number, day: number, hour: number): string {
  return new Date(year, month1 - 1, day, hour, 30).toISOString();
}

/** Late evening: the edge that disagrees with UTC west of Greenwich. */
function lateOnLocalDay(year: number, month1: number, day: number): string {
  return onLocalDay(year, month1, day, 23);
}

/** Early morning: the edge that disagrees with UTC east of it. */
function earlyOnLocalDay(year: number, month1: number, day: number): string {
  return onLocalDay(year, month1, day, 0);
}

function setSources({
  workouts = new Map<string, WorkoutDetailExercise[]>(),
  water = [] as { date: string; totalMl: number }[],
  nutrition = [] as unknown[],
  formChecks = [] as unknown[],
} = {}) {
  asMock(fetchWorkoutsInRange).mockResolvedValue(workouts);
  asMock(fetchWaterHistory).mockResolvedValue(water);
  asMock(fetchNutritionIntakes).mockResolvedValue(nutrition);
  asMock(fetchFormChecks).mockResolvedValue(formChecks);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchActivityFeed', () => {
  it('returns a day for a logged workout', async () => {
    setSources({ workouts: new Map([['2026-09-02', [exercise('a')]]]) });

    const days = await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: false });

    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026-09-02');
    expect(days[0].exercises).toHaveLength(1);
  });

  it('skips a workout row that has no exercises under it', async () => {
    // The draft flow creates the day before anything is added to it, so an
    // empty workout is a started-and-abandoned day, not an activity.
    setSources({ workouts: new Map([['2026-09-02', []]]) });

    const days = await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: false });

    expect(days).toEqual([]);
  });

  it('includes a day that only has water on it', async () => {
    setSources({ water: [{ date: '2026-09-03', totalMl: 750 }] });

    const days = await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: false });

    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ date: '2026-09-03', waterMl: 750, exercises: [] });
  });

  it('merges every source onto one day rather than emitting several', async () => {
    setSources({
      workouts: new Map([['2026-09-04', [exercise('a')]]]),
      water: [{ date: '2026-09-04', totalMl: 500 }],
      nutrition: [{ id: 'n1', createdAt: lateOnLocalDay(2026, 9, 4), status: 'submitted' }],
      formChecks: [{ id: 'f1', createdAt: lateOnLocalDay(2026, 9, 4), status: 'reviewed' }],
    });

    const days = await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: true });

    expect(days).toHaveLength(1);
    expect(days[0].exercises).toHaveLength(1);
    expect(days[0].waterMl).toBe(500);
    expect(days[0].nutrition).toHaveLength(1);
    expect(days[0].formChecks).toHaveLength(1);
  });

  it('files submissions on their local day at both edges of it, not the UTC one', async () => {
    // Both belong to the same day as the workout they went with. Grouping by
    // UTC splits one of them off into a neighbouring card -- which one
    // depends on which side of Greenwich the clock is, so both are here.
    setSources({
      workouts: new Map([['2026-09-05', [exercise('a')]]]),
      formChecks: [
        { id: 'early', createdAt: earlyOnLocalDay(2026, 9, 5), status: 'submitted' },
        { id: 'late', createdAt: lateOnLocalDay(2026, 9, 5), status: 'submitted' },
      ],
    });

    const days = await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: true });

    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026-09-05');
    expect(days[0].formChecks).toHaveLength(2);
  });

  it('drops paid records that fall outside the requested range', async () => {
    setSources({
      workouts: new Map([['2026-09-02', [exercise('a')]]]),
      nutrition: [{ id: 'old', createdAt: lateOnLocalDay(2026, 1, 4), status: 'answered' }],
    });

    const days = await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: true });

    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026-09-02');
    expect(days[0].nutrition).toEqual([]);
  });

  it('orders days newest first', async () => {
    setSources({
      workouts: new Map([
        ['2026-08-20', [exercise('a')]],
        ['2026-09-06', [exercise('b')]],
        ['2026-08-31', [exercise('c')]],
      ]),
    });

    const days = await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: false });

    expect(days.map((d) => d.date)).toEqual(['2026-09-06', '2026-08-31', '2026-08-20']);
  });

  it('does not ask for the paid sources when the tier cannot see them', async () => {
    setSources({ workouts: new Map([['2026-09-02', [exercise('a')]]]) });

    await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: false });

    expect(fetchNutritionIntakes).not.toHaveBeenCalled();
    expect(fetchFormChecks).not.toHaveBeenCalled();
  });

  it('asks for them when it can', async () => {
    setSources();

    await fetchActivityFeed('u1', RANGE.start, RANGE.end, { includePaid: true });

    expect(fetchNutritionIntakes).toHaveBeenCalledWith('u1');
    expect(fetchFormChecks).toHaveBeenCalledWith('u1');
  });
});
