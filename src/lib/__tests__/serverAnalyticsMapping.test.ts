/**
 * The client/server seam for the three gated analytics RPCs.
 *
 * The arithmetic is tested elsewhere and now runs in Postgres anyway; what is
 * untested — and what actually broke twice on this project — is the join
 * between them. A field renamed on one side of that seam does not fail a
 * typecheck, does not fail a lint, and does not throw: it renders a blank
 * screen or `NaN`, which only a person opening the app would notice.
 *
 * Every fixture below is the literal shape observed coming out of production,
 * including the detail that Postgres sends `numeric` and `bigint` over the
 * wire as strings. That is the trap these tests exist for: `"128.3"` renders
 * as "128.3" and looks perfectly fine right up until something does
 * arithmetic on it and gets string concatenation instead.
 */
import { fetchAdvancedAnalytics } from '../advancedAnalytics';
import { fetchGoalProjections, type LiftGoal } from '../goals';
import { fetchPersonalRecords } from '../personalRecords';
import { supabase } from '../supabase';

// The jest.fn is created inside the factory rather than referenced from a
// module-scope const. babel-plugin-jest-hoist lifts this call above the
// imports above, so a const declared out here would still be in its temporal
// dead zone when ../supabase is first required — leaving `supabase.rpc`
// undefined and every test failing with "rpc is not a function" rather than
// anything about the mapping.
jest.mock('../supabase', () => ({ supabase: { rpc: jest.fn() } }));

const mockRpc = supabase.rpc as unknown as jest.Mock;

beforeEach(() => {
  mockRpc.mockReset();
});

describe('fetchPersonalRecords mapping', () => {
  // snake_case exactly as get_personal_records returns it, with the numerics
  // as strings the way PostgREST actually sends them.
  const row = {
    exercise_id: 'ex-1',
    exercise_name: 'Bench Press',
    category: 'chest',
    type: 'strength',
    heaviest_weight: '100.0',
    heaviest_weight_reps: 5,
    heaviest_weight_date: '2026-08-18',
    estimated_one_rep_max: '116.667',
    estimated_one_rep_max_date: '2026-08-18',
    longest_duration_seconds: 0,
    longest_duration_date: null,
    farthest_distance: '0',
    farthest_distance_date: null,
    best_session_value: '500.0',
    best_session_date: '2026-08-18',
    total_sets: '7',
    last_performed: '2026-08-20',
  };

  it('maps every column onto the camelCase the screens read', async () => {
    mockRpc.mockResolvedValue({ data: [row], error: null });
    const [pr] = await fetchPersonalRecords('u1', 'kg', 'km');

    expect(pr.exerciseId).toBe('ex-1');
    expect(pr.exerciseName).toBe('Bench Press');
    expect(pr.heaviestWeight).toBe(100);
    expect(pr.heaviestWeightReps).toBe(5);
    expect(pr.estimatedOneRepMaxDate).toBe('2026-08-18');
    expect(pr.longestDurationDate).toBeNull();
    expect(pr.bestSessionValue).toBe(500);
    expect(pr.lastPerformed).toBe('2026-08-20');
  });

  it('returns numbers, not the strings Postgres sends', async () => {
    mockRpc.mockResolvedValue({ data: [row], error: null });
    const [pr] = await fetchPersonalRecords('u1', 'kg', 'km');

    for (const value of [pr.heaviestWeight, pr.estimatedOneRepMax, pr.totalSets, pr.bestSessionValue]) {
      expect(typeof value).toBe('number');
      expect(Number.isNaN(value)).toBe(false);
    }
    // The one that would silently become "77" by concatenation.
    expect(pr.totalSets + 1).toBe(8);
  });

  it('passes the display units through to the server', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await fetchPersonalRecords('u1', 'lb', 'mi');
    expect(mockRpc).toHaveBeenCalledWith('get_personal_records', {
      p_weight_unit: 'lb',
      p_distance_unit: 'mi',
    });
  });

  it('surfaces the gate rather than swallowing it', async () => {
    // A free account gets this from Postgres. It has to reach the screen's
    // error state; returning [] would render "no records yet" to someone who
    // simply has not paid, which is a confusing lie.
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Personal records are a Fortress feature' } });
    await expect(fetchPersonalRecords('u1', 'kg', 'km')).rejects.toMatchObject({
      message: 'Personal records are a Fortress feature',
    });
  });
});

describe('fetchAdvancedAnalytics mapping', () => {
  const payload = {
    balance: [{ category: 'chest', value: '920.0', share: 0.62, sets: '7' }],
    progressions: [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        points: [
          { date: '2026-08-18', estimatedOneRepMax: '116.7' },
          { date: '2026-08-20', estimatedOneRepMax: '128.3' },
        ],
        first: '116.7',
        latest: '128.3',
        changePct: '10',
      },
    ],
    totalValue: '920.0',
    totalSets: '16',
    activeDays: '12',
  };

  it('maps the nested jsonb into the AdvancedAnalytics shape', async () => {
    mockRpc.mockResolvedValue({ data: payload, error: null });
    const result = await fetchAdvancedAnalytics('u1', 'kg', 'km', null);

    expect(result.balance[0].category).toBe('chest');
    expect(result.balance[0].value).toBe(920);
    expect(result.balance[0].share).toBeCloseTo(0.62);
    expect(result.progressions[0].exerciseName).toBe('Bench Press');
    expect(result.progressions[0].points).toHaveLength(2);
    expect(result.totalSets).toBe(16);
    expect(result.activeDays).toBe(12);
  });

  it('numbers the chart values, including the nested points', async () => {
    mockRpc.mockResolvedValue({ data: payload, error: null });
    const result = await fetchAdvancedAnalytics('u1', 'kg', 'km', null);

    // A string here plots as zero or throws inside the chart library, well
    // away from the line that caused it.
    expect(typeof result.progressions[0].points[0].estimatedOneRepMax).toBe('number');
    expect(typeof result.progressions[0].changePct).toBe('number');
    expect(result.progressions[0].latest - result.progressions[0].first).toBeCloseTo(11.6);
  });

  it('sends the period through, and null for all-time', async () => {
    mockRpc.mockResolvedValue({ data: { ...payload, balance: [], progressions: [] }, error: null });
    await fetchAdvancedAnalytics('u1', 'kg', 'km', 30);
    expect(mockRpc).toHaveBeenCalledWith('get_advanced_analytics', {
      p_weight_unit: 'kg',
      p_distance_unit: 'km',
      p_period_days: 30,
    });
  });
});

describe('fetchGoalProjections mapping', () => {
  const goal: LiftGoal = {
    id: 'g1',
    exerciseId: 'ex-1',
    targetWeight: 150,
    targetUnit: 'kg',
    targetDate: '2026-10-19',
  };

  it('reattaches the goal the server only referenced by id', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          goalId: 'g1',
          exerciseName: 'Bench Press',
          status: 'on-track',
          current: '128.3',
          target: '150.0',
          projected: '478.3',
          weeklyRate: '40.8',
          projectedDate: '2026-08-24',
          daysRemaining: 60,
          sessions: '3',
        },
      ],
      error: null,
    });

    const [p] = await fetchGoalProjections([goal]);
    // The screen labels the numbers from the goal, so losing this reference
    // is how a projection ends up saying "150" with no unit or date.
    expect(p.goal).toBe(goal);
    expect(p.goal.targetUnit).toBe('kg');
    expect(p.status).toBe('on-track');
    expect(p.current).toBe(128.3);
    expect(p.projected).toBe(478.3);
    expect(typeof p.sessions).toBe('number');
  });

  it('keeps a goal the server said nothing about', async () => {
    // A goal for a lift with no logged history is absent from the response
    // entirely. Iterating the response instead of the goals would drop it
    // from the screen — and the user set that goal, so it has to appear.
    mockRpc.mockResolvedValue({ data: [], error: null });

    const [p] = await fetchGoalProjections([goal]);
    expect(p.goal).toBe(goal);
    expect(p.status).toBe('no-trend');
    expect(p.current).toBe(0);
    expect(p.projected).toBeNull();
    expect(p.target).toBe(150);
  });

  it('keeps goals and projections aligned when only some have history', async () => {
    const second: LiftGoal = { ...goal, id: 'g2', exerciseId: 'ex-2', targetWeight: 80 };
    mockRpc.mockResolvedValue({
      data: [
        {
          goalId: 'g2',
          exerciseName: 'Squat',
          status: 'behind',
          current: '70',
          target: '80',
          projected: '75',
          weeklyRate: '1.0',
          projectedDate: null,
          daysRemaining: 30,
          sessions: '4',
        },
      ],
      error: null,
    });

    const result = await fetchGoalProjections([goal, second]);
    expect(result.map((p) => p.goal.id)).toEqual(['g1', 'g2']);
    expect(result[0].status).toBe('no-trend');
    expect(result[1].status).toBe('behind');
  });
});
